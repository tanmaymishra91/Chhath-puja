import React, { useState, useEffect, useCallback } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
  useMapsLibrary,
  useAdvancedMarkerRef,
  useApiLoadingStatus,
  APILoadingStatus,
} from '@vis.gl/react-google-maps';
import {
  Navigation,
  Compass,
  Mountain,
  PhoneCall,
  Search,
  ExternalLink,
  CalendarClock,
  Route as RouteIcon,
  ShieldCheck,
} from 'lucide-react';
import {
  CHHATH_SCHEDULE,
  EMERGENCY_CONTACT_NUMBER,
  EMERGENCY_CONTACT_TEL,
  PROVIDER_DOMAIN,
  PROVIDER_URL,
  ElevationPoint,
  computeElevationStats,
} from '../utils/invitationLogic';

type MapTypeOption = 'terrain' | 'hybrid' | 'satellite' | 'roadmap';

interface ResolvedPlaceInfo {
  id: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
  rating?: number | null;
  userRatingCount?: number | null;
  googleMapsURI?: string | null;
}

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

function dispatchQuotaIfNeeded(err: unknown) {
  const msg = String(err instanceof Error ? err.message : err);
  if (
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('OVER_QUERY_LIMIT') ||
    msg.includes('OverQuotaMapError') ||
    msg.includes('QuotaExceededError')
  ) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  }
}

interface TerrainMapInnerProps {
  searchQuery: string;
  mapTypeId: MapTypeOption;
  onPlaceResolved: (place: ResolvedPlaceInfo) => void;
  onElevationResolved: (points: ElevationPoint[]) => void;
  routeOriginQuery: string | null;
  onRouteStatusChange: (status: string | null) => void;
}

const TerrainMapInner: React.FC<TerrainMapInnerProps> = ({
  searchQuery,
  mapTypeId,
  onPlaceResolved,
  onElevationResolved,
  routeOriginQuery,
  onRouteStatusChange,
}) => {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const elevationLib = useMapsLibrary('elevation');
  const routesLib = useMapsLibrary('routes');
  const apiStatus = useApiLoadingStatus();

  const [resolvedPlace, setResolvedPlace] = useState<ResolvedPlaceInfo | null>(null);
  const [infoOpen, setInfoOpen] = useState(true);
  const [markerRef, markerInstance] = useAdvancedMarkerRef();
  const [searchError, setSearchError] = useState<string | null>(null);

  // Dynamically resolve place from Google Maps Platform Places API (New) via Place.searchByText
  useEffect(() => {
    if (!placesLib || !searchQuery.trim()) return;

    let cancelled = false;
    setSearchError(null);

    const runSearch = async () => {
      try {
        const { places } = await placesLib.Place.searchByText({
          textQuery: searchQuery,
          fields: [
            'id',
            'displayName',
            'formattedAddress',
            'location',
            'viewport',
            'rating',
            'userRatingCount',
            'googleMapsURI',
          ],
          maxResultCount: 1,
        });

        if (cancelled) return;
        const firstPlace = places?.[0];
        if (firstPlace && firstPlace.location) {
          const lat = firstPlace.location.lat();
          const lng = firstPlace.location.lng();
          const info: ResolvedPlaceInfo = {
            id: firstPlace.id || 'aji-dam-place',
            name: firstPlace.displayName || searchQuery,
            address: firstPlace.formattedAddress || '',
            location: { lat, lng },
            rating: firstPlace.rating,
            userRatingCount: firstPlace.userRatingCount,
            googleMapsURI: firstPlace.googleMapsURI,
          };
          setResolvedPlace(info);
          onPlaceResolved(info);

          if (map) {
            if (firstPlace.viewport) {
              map.fitBounds(firstPlace.viewport);
              // Keep detailed terrain zoom around the dam reservoir
              window.setTimeout(() => {
                const currentZoom = map.getZoom();
                if (currentZoom && (currentZoom < 14 || currentZoom > 16)) {
                  map.setZoom(15);
                }
              }, 300);
            } else {
              map.panTo({ lat, lng });
              map.setZoom(15);
            }
          }
        } else {
          setSearchError('No matching location returned for that search query.');
        }
      } catch (err) {
        if (!cancelled) {
          dispatchQuotaIfNeeded(err);
          setSearchError('Unable to fetch live place details right now.');
        }
      }
    };

    void runSearch();
    return () => {
      cancelled = true;
    };
  }, [placesLib, searchQuery, map, onPlaceResolved]);

  // Sample real terrain elevation profile across the resolved location using ElevationService
  useEffect(() => {
    if (!elevationLib || !resolvedPlace) return;

    let cancelled = false;
    const elevationService = new elevationLib.ElevationService();
    const { lat, lng } = resolvedPlace.location;

    // Sample a 2.4km West-to-East transect across the reservoir & ghat embankment
    const path = [
      { lat: lat - 0.006, lng: lng - 0.01 },
      { lat, lng },
      { lat: lat + 0.006, lng: lng + 0.01 },
    ];

    elevationService
      .getElevationAlongPath({
        path,
        samples: 18,
      })
      .then((response: { results?: Array<{ elevation: number }> }) => {
        if (cancelled || !response?.results) return;
        const pts: ElevationPoint[] = response.results.map((r: { elevation: number }, idx: number) => ({
          distanceKm: Math.round((idx / Math.max(1, response.results!.length - 1)) * 2.4 * 100) / 100,
          elevationMeters: Math.round(r.elevation * 10) / 10,
          label: idx === 0 ? 'West Basin' : idx === 9 ? 'Ghat Steps' : idx === 17 ? 'East Crest' : undefined,
        }));
        onElevationResolved(pts);
      })
      .catch((err: unknown) => {
        dispatchQuotaIfNeeded(err);
      });

    return () => {
      cancelled = true;
    };
  }, [elevationLib, resolvedPlace, onElevationResolved]);

  // Compute driving route to the resolved Chhath Puja Ghat using modern Routes API (Route.computeRoutes)
  useEffect(() => {
    if (!routesLib || !placesLib || !map || !resolvedPlace || !routeOriginQuery) return;

    let cancelled = false;
    onRouteStatusChange('Calculating live route via Google Maps Routes API…');

    const compute = async () => {
      try {
        const originSearch = await placesLib.Place.searchByText({
          textQuery: routeOriginQuery,
          fields: ['location', 'displayName'],
          maxResultCount: 1,
        });
        const originPlace = originSearch.places?.[0];
        if (!originPlace?.location) {
          if (!cancelled) onRouteStatusChange('Could not locate starting point.');
          return;
        }

        const routeConstructor = (routesLib as unknown as {
          Route: {
            computeRoutes?: (req: unknown) => Promise<{ routes?: Array<{ distanceMeters?: number; durationMillis?: number }> }>;
            new (m?: unknown): { computeRoutes: (req: unknown) => Promise<{ routes?: Array<{ distanceMeters?: number; durationMillis?: number }> }> };
          };
        }).Route;

        const request = {
          origin: {
            lat: originPlace.location.lat(),
            lng: originPlace.location.lng(),
          },
          destination: resolvedPlace.location,
          travelMode: 'DRIVING',
          fields: ['path', 'distanceMeters', 'durationMillis'],
        };

        let response: { routes?: Array<{ distanceMeters?: number; durationMillis?: number }> } | null = null;
        if (typeof routeConstructor.computeRoutes === 'function') {
          response = await routeConstructor.computeRoutes(request);
        } else {
          const instance = new routeConstructor(map);
          response = await instance.computeRoutes(request);
        }

        if (cancelled) return;
        const topRoute = response?.routes?.[0];
        if (topRoute) {
          const km = topRoute.distanceMeters ? (topRoute.distanceMeters / 1000).toFixed(1) : null;
          const mins = topRoute.durationMillis ? Math.round(topRoute.durationMillis / 60000) : null;
          onRouteStatusChange(
            `Route ready from ${originPlace.displayName || routeOriginQuery}${km ? ` · ${km} km` : ''}${mins ? ` (~${mins} min drive)` : ''}`
          );
        } else {
          onRouteStatusChange('No driving route returned for this origin.');
        }
      } catch (err) {
        if (!cancelled) {
          dispatchQuotaIfNeeded(err);
          onRouteStatusChange('Route calculation unavailable right now.');
        }
      }
    };

    void compute();
    return () => {
      cancelled = true;
    };
  }, [routesLib, placesLib, map, resolvedPlace, routeOriginQuery, onRouteStatusChange]);

  return (
    <div className="w-full h-full relative">
      <GoogleMap
        mapId="DEMO_MAP_ID"
        mapTypeId={mapTypeId}
        defaultZoom={5}
        defaultCenter={{ lat: 22.0, lng: 78.0 }}
        gestureHandling="greedy"
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        style={{ width: '100%', height: '100%' }}
      >
        {resolvedPlace && (
          <>
            <AdvancedMarker
              ref={markerRef}
              position={resolvedPlace.location}
              title={resolvedPlace.name}
              onClick={() => setInfoOpen(true)}
            >
              <Pin background="#F59E0B" borderColor="#78350F" glyphColor="#0B0914" scale={1.25} />
            </AdvancedMarker>

            {infoOpen && markerInstance && (
              <InfoWindow anchor={markerInstance} onCloseClick={() => setInfoOpen(false)} maxWidth={280}>
                <div className="text-slate-900 p-1 text-xs space-y-1">
                  <p className="font-bold text-sm text-amber-900">{resolvedPlace.name}</p>
                  {resolvedPlace.address && <p className="text-slate-600">{resolvedPlace.address}</p>}
                  <p className="text-slate-700 font-medium">
                    15 Nov (~4:00 PM) · 16 Nov (~4:00 AM)
                  </p>
                  {resolvedPlace.googleMapsURI && (
                    <a
                      href={resolvedPlace.googleMapsURI}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-amber-700 font-semibold underline pt-1"
                    >
                      Open in Google Maps <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </InfoWindow>
            )}
          </>
        )}
      </GoogleMap>

      {/* Status overlay when resolving via Places API */}
      {(apiStatus === APILoadingStatus.LOADING || (!resolvedPlace && !searchError)) && (
        <div className="absolute bottom-4 left-4 bg-[#141022]/90 border border-amber-500/30 rounded-lg px-3.5 py-2 text-xs text-amber-200 pointer-events-none">
          Resolving live Aji Dam terrain & coordinates via Google Maps Platform…
        </div>
      )}
      {searchError && (
        <div className="absolute bottom-4 left-4 bg-rose-950/90 border border-rose-500/40 rounded-lg px-3.5 py-2 text-xs text-rose-200">
          {searchError}
        </div>
      )}
    </div>
  );
};

export const AjiDamTerrainNavigator: React.FC = () => {
  const [searchInput, setSearchInput] = useState('Aji Dam, Rajkot, Gujarat');
  const [activeQuery, setActiveQuery] = useState('Aji Dam, Rajkot, Gujarat');
  const [mapTypeId, setMapTypeId] = useState<MapTypeOption>('terrain');
  const [placeInfo, setPlaceInfo] = useState<ResolvedPlaceInfo | null>(null);
  const [elevationPoints, setElevationPoints] = useState<ElevationPoint[]>([]);
  const [originInput, setOriginInput] = useState('Rajkot Junction Railway Station');
  const [activeRouteOrigin, setActiveRouteOrigin] = useState<string | null>(null);
  const [routeStatus, setRouteStatus] = useState<string | null>(null);

  const handlePlaceResolved = useCallback((info: ResolvedPlaceInfo) => {
    setPlaceInfo(info);
  }, []);

  const handleElevationResolved = useCallback((pts: ElevationPoint[]) => {
    setElevationPoints(pts);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setActiveQuery(searchInput.trim());
    }
  };

  const handleRouteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (originInput.trim()) {
      setActiveRouteOrigin(originInput.trim());
    }
  };

  const elevationStats = computeElevationStats(elevationPoints);

  return (
    <section
      aria-label="Primary Navigation Screen and Aji Dam Terrain Mapping"
      className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 py-8 space-y-8"
    >
      {/* Top Section Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-white/10 pb-6">
        <div className="space-y-2 max-w-2xl">
          <div className="text-xs font-medium text-amber-400 tracking-wide">
            Primary Navigation · Live Topographical & Ghat Mapping
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold text-[#FBF7F0] tracking-tight">
            Aji Dam (Ajiram) Terrain & Ritual Navigation
          </h2>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Explore real-time terrain contours, reservoir elevation transects, and live driving directions to the
            Chhath Puja Ghat at Aji Dam, Rajkot.
          </p>
        </div>

        {/* Map Layer Mode Segmented Controls */}
        <div className="flex items-center gap-1 p-1 bg-[#161224] border border-white/10 rounded-lg self-start">
          {(['terrain', 'hybrid', 'satellite', 'roadmap'] as MapTypeOption[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setMapTypeId(mode)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors capitalize whitespace-nowrap shrink-0 ${
                mapTypeId === mode
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {mode === 'terrain' ? 'Terrain Relief' : mode}
            </button>
          ))}
        </div>
      </div>

      {/* Main 2-Column Split: Live Terrain Map (Left 7 cols) + Location, Schedule & Elevation Telemetry (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Google Maps Terrain Viewport */}
        <div className="lg:col-span-7 flex flex-col bg-[#141022] border border-white/10 rounded-xl overflow-hidden min-h-[480px] lg:min-h-[580px]">
          {/* Search Bar Toolbar inside Map Card */}
          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-3 bg-[#1B162E] border-b border-white/10"
          >
            <label htmlFor="terrain-place-search" className="sr-only">
              Search Aji Dam or Rajkot Landmark
            </label>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="terrain-place-search"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search Aji Dam or nearby Rajkot ghat..."
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-[#0B0914] border border-white/15 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Locate on Terrain
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchInput('Aji Dam, Rajkot, Gujarat');
                setActiveQuery('Aji Dam, Rajkot, Gujarat');
              }}
              className="px-3 py-2 text-xs font-medium bg-white/5 hover:bg-white/10 text-amber-200 border border-white/10 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Reset to Aji Dam
            </button>
          </form>

          {/* Sized Map Container (CF2 compliance: explicit height) */}
          <div className="w-full h-[440px] lg:flex-1 relative">
            {MAPS_API_KEY ? (
              <APIProvider apiKey={MAPS_API_KEY}>
                <TerrainMapInner
                  searchQuery={activeQuery}
                  mapTypeId={mapTypeId}
                  onPlaceResolved={handlePlaceResolved}
                  onElevationResolved={handleElevationResolved}
                  routeOriginQuery={activeRouteOrigin}
                  onRouteStatusChange={setRouteStatus}
                />
              </APIProvider>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#0F0C1B]">
                <Compass className="w-10 h-10 text-amber-400 mb-3" />
                <p className="text-sm font-semibold text-white">
                  Google Maps Platform Terrain Viewport Ready
                </p>
                <p className="text-xs text-slate-400 max-w-md mt-1">
                  Target Venue: Aji Dam (Ajiram), Rajkot · Schedule: 15 November (Evening ~4:00 PM) & 16 November (Morning ~4:00 AM).
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Live Resolved Place Info, 15/16 Nov Schedule, Elevation Transect & Emergency Contact */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-5">
          {/* Card 1: Live Resolved Location Details & Route Calculator */}
          <div className="bg-[#141022] border border-white/10 rounded-xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-amber-400 font-medium">
                  Verified Festival Destination · Aji River Basin
                </div>
                <h3 className="text-xl font-bold text-white mt-0.5">
                  {placeInfo ? placeInfo.name : 'Aji Dam (Ajiram) Chhath Ghat'}
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  {placeInfo?.address || 'Resolving official address from Google Maps Platform Places API…'}
                </p>
              </div>
              {placeInfo?.googleMapsURI && (
                <a
                  href={placeInfo.googleMapsURI}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  Open Maps <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {/* Live Coordinates & Ratings */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10 text-xs">
              <div>
                <span className="text-slate-400 block">Geographic Coordinates</span>
                <span className="font-mono-tabular font-semibold text-amber-200">
                  {placeInfo
                    ? `${placeInfo.location.lat.toFixed(4)}° N, ${placeInfo.location.lng.toFixed(4)}° E`
                    : 'Loading via Places API…'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Public Landmark Rating</span>
                <span className="font-mono-tabular font-semibold text-white">
                  {placeInfo?.rating
                    ? `${placeInfo.rating.toFixed(1)} ★ (${placeInfo.userRatingCount || 0} reviews)`
                    : 'Live Google Place Data'}
                </span>
              </div>
            </div>

            {/* Route Calculator Form */}
            <form onSubmit={handleRouteSubmit} className="pt-3 border-t border-white/10 space-y-2">
              <label htmlFor="route-origin-input" className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <RouteIcon className="w-3.5 h-3.5 text-amber-400" />
                Calculate Driving Route to Aji Dam Ghat
              </label>
              <div className="flex gap-2">
                <input
                  id="route-origin-input"
                  type="text"
                  value={originInput}
                  onChange={(e) => setOriginInput(e.target.value)}
                  placeholder="Enter starting point in Rajkot..."
                  className="flex-1 px-3 py-2 text-xs bg-[#0B0914] border border-white/15 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 text-xs font-semibold bg-white/10 hover:bg-white/15 text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Check Route
                </button>
              </div>
              {routeStatus && (
                <p className="text-xs text-amber-300 font-medium pt-1">{routeStatus}</p>
              )}
            </form>
          </div>

          {/* Card 2: Exact Chhath Puja Arghya Timings (15 Nov ~4:00 PM & 16 Nov ~4:00 AM) */}
          <div className="bg-[#141022] border border-white/10 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-400 flex items-center gap-1.5">
                <CalendarClock className="w-4 h-4" />
                Official Chhath Puja Arghya Timings
              </span>
              <span className="text-xs text-slate-400">Aji Dam Ghat</span>
            </div>

            <div className="space-y-3">
              {CHHATH_SCHEDULE.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg bg-[#0B0914]/80 border border-white/10 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-white">{item.ritualName}</span>
                    <span className="text-xs font-mono-tabular font-semibold text-amber-300 whitespace-nowrap">
                      {item.dateLabel} · {item.timeLabel}
                    </span>
                  </div>
                  <p className="text-xs text-amber-200/80">{item.hindiTitle}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Live Elevation Transect & Emergency Safety Contact */}
          <div className="bg-[#141022] border border-white/10 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-400 flex items-center gap-1.5">
                <Mountain className="w-4 h-4" />
                Basin Terrain Elevation Profile (2.4 km Transect)
              </span>
              {elevationPoints.length > 0 && (
                <span className="text-xs font-mono-tabular text-slate-300">
                  {elevationStats.minMeters}m – {elevationStats.maxMeters}m ASL
                </span>
              )}
            </div>

            {elevationPoints.length > 0 ? (
              <div className="space-y-2">
                <div className="h-16 flex items-end gap-1 pt-2 px-1 bg-[#0B0914] rounded-lg p-2 border border-white/5">
                  {elevationPoints.map((pt, idx) => {
                    const norm =
                      elevationStats.reliefMeters > 0
                        ? (pt.elevationMeters - elevationStats.minMeters) / elevationStats.reliefMeters
                        : 0.5;
                    const heightPct = Math.round(25 + norm * 75);
                    return (
                      <div
                        key={idx}
                        title={`${pt.distanceKm} km: ${pt.elevationMeters}m ASL`}
                        className="flex-1 bg-amber-500/80 hover:bg-amber-400 rounded-t transition-colors"
                        style={{ height: `${heightPct}%` }}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between text-[11px] font-mono-tabular text-slate-400">
                  <span>West Bank (0.0 km)</span>
                  <span>Aji Dam Ghat (1.2 km)</span>
                  <span>East Crest (2.4 km)</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Sampling live elevation profile across Aji Dam reservoir via Google Elevation Service…
              </p>
            )}

            {/* Mandatory Emergency Contact & Provider Info */}
            <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Festival Emergency Helpline
                </div>
                <a
                  href={EMERGENCY_CONTACT_TEL}
                  className="text-base font-mono-tabular font-bold text-white hover:text-amber-300 transition-colors inline-flex items-center gap-2"
                >
                  <PhoneCall className="w-4 h-4 text-emerald-400" />
                  {EMERGENCY_CONTACT_NUMBER}
                </a>
              </div>
              <div className="text-xs text-slate-400 sm:text-right">
                <span>Provided by </span>
                <a
                  href={PROVIDER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-300 font-semibold hover:underline"
                >
                  {PROVIDER_DOMAIN}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
