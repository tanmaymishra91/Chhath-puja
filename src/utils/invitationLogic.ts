/**
 * Pure business logic for Chhath Puja 3D Invitation flow, share URL generation,
 * personalized receiver greetings, festival schedule, and terrain elevation analytics.
 */

export type InvitationStep = 'welcome' | 'add-name' | 'share-ready' | 'received-greeting';

export type AppSection = 'invitation' | 'navigation' | 'gallery';

export interface ParsedInvitationParams {
  guestName: string | null;
  autostart: boolean;
  initialSection: AppSection;
  initialStep: InvitationStep;
}

export interface ValidationResult {
  valid: boolean;
  sanitizedName: string;
  error?: string;
}

export interface ElevationPoint {
  distanceKm: number;
  elevationMeters: number;
  label?: string;
}

export interface ElevationStats {
  minMeters: number;
  maxMeters: number;
  reliefMeters: number;
  avgMeters: number;
}

export interface FestivalScheduleItem {
  id: string;
  ritualName: string;
  hindiTitle: string;
  dateLabel: string;
  timeLabel: string;
  locationZone: string;
  description: string;
}

export const EMERGENCY_CONTACT_NUMBER = '+91 9690222999';
export const EMERGENCY_CONTACT_TEL = 'tel:+919690222999';
export const PROVIDER_DOMAIN = 'aozoradesu.com';
export const PROVIDER_URL = 'https://aozoradesu.com';

export const EXACT_VENUE_MAPS_URL = 'https://maps.app.goo.gl/Q4TCMoh9ziCaPK7VA?g_st=aw';
export const EXACT_VENUE_QUERY = '22°16\'28.2"N 70°50\'28.8"E';
export const EXACT_VENUE_LABEL = 'Aji Dam (Ajiram) Chhath Ghat · 22°16\'28.2"N 70°50\'28.8"E, Rajkot';

export const SANDHYA_ARGHYA_DATE = '15 November';
export const SANDHYA_ARGHYA_TIME = 'Evening, near 4:00 PM';
export const USHA_ARGHYA_DATE = '16 November';
export const USHA_ARGHYA_TIME = 'Morning, near 4:00 AM';

export const CHHATH_SCHEDULE: FestivalScheduleItem[] = [
  {
    id: 'sandhya-arghya',
    ritualName: 'Sandhya Arghya (Evening Offering)',
    hindiTitle: 'संध्या अर्घ्य · अस्तचलगामी सूर्य पूजा',
    dateLabel: SANDHYA_ARGHYA_DATE,
    timeLabel: SANDHYA_ARGHYA_TIME,
    locationZone: 'Aji Dam (Ajiram) Exact Ghat Pin (22°16\'28.2"N 70°50\'28.8"E), Rajkot',
    description:
      'Evening gathering and sacred offering of bamboo soop, Thekua prasad, sugarcane, and lit earthen diyas to the setting Sun God along our exact Aji Dam Ghat spot.',
  },
  {
    id: 'usha-arghya',
    ritualName: 'Usha Arghya (Dawn Offering & Paran)',
    hindiTitle: 'उषा अर्घ्य · उदीयमान सूर्य अर्घ्य',
    dateLabel: USHA_ARGHYA_DATE,
    timeLabel: USHA_ARGHYA_TIME,
    locationZone: 'Aji Dam (Ajiram) Exact Ghat Pin (22°16\'28.2"N 70°50\'28.8"E), Rajkot',
    description:
      'Pre-dawn arrival near 4:00 AM with floating diyas and Chhath Geet recitals, offering Usha Arghya to the rising Sun God followed by sacred Paran prasad distribution.',
  },
];

/**
 * Validates the guest name entered in Step 2.
 * Never substitutes a fallback when input is empty or invalid.
 */
export function validateGuestName(rawInput: string): ValidationResult {
  const trimmed = rawInput.replace(/\s+/g, ' ').trim();
  if (!trimmed) {
    return {
      valid: false,
      sanitizedName: '',
      error: 'Please enter a guest or family name to generate their personal invitation link.',
    };
  }
  if (trimmed.length < 2) {
    return {
      valid: false,
      sanitizedName: '',
      error: 'Name must be at least 2 characters long.',
    };
  }
  if (trimmed.length > 60) {
    return {
      valid: false,
      sanitizedName: trimmed.slice(0, 60),
      error: 'Name must be 60 characters or fewer.',
    };
  }
  return {
    valid: true,
    sanitizedName: trimmed,
  };
}

/**
 * Builds a shareable invitation URL containing the encoded guest name.
 */
export function buildInvitationShareUrl(baseUrl: string, guestName: string): string {
  const validation = validateGuestName(guestName);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid guest name');
  }
  try {
    const url = new URL(baseUrl);
    url.searchParams.set('guest', validation.sanitizedName);
    url.searchParams.delete('autostart');
    return url.toString();
  } catch {
    const encoded = encodeURIComponent(validation.sanitizedName);
    const cleanBase = baseUrl.split('?')[0] || 'https://aozoradesu.com';
    return `${cleanBase}?guest=${encoded}`;
  }
}

/**
 * Parses URL search parameters to determine whether the user opened a shared
 * invitation link (?guest=...) or ?autostart=1.
 */
export function parseInvitationParams(searchString: string): ParsedInvitationParams {
  const params = new URLSearchParams(searchString.startsWith('?') ? searchString : `?${searchString}`);
  const rawGuest = params.get('guest') || params.get('invite') || params.get('name');
  const autostart = params.get('autostart') === '1' || params.get('autostart') === 'true';
  const rawView = params.get('view');

  const initialSection: AppSection =
    rawView === 'navigation' ? 'navigation' : rawView === 'gallery' ? 'gallery' : 'invitation';

  if (rawGuest && rawGuest.trim().length >= 2) {
    return {
      guestName: rawGuest.replace(/\s+/g, ' ').trim().slice(0, 60),
      autostart,
      initialSection,
      initialStep: 'received-greeting',
    };
  }

  return {
    guestName: null,
    autostart,
    initialSection,
    initialStep: autostart ? 'add-name' : 'welcome',
  };
}

/**
 * Builds the personalized greeting headline and festive invitation copy for the recipient.
 */
export function formatPersonalizedGreeting(guestName: string | null): {
  headline: string;
  subheadline: string;
  shareMessage: string;
} {
  const cleanName = guestName && guestName.trim() ? guestName.trim() : 'Dear Devotee & Family';
  const headline = `Hey, welcome ${cleanName}!`;
  const subheadline = `You are cordially invited to celebrate Chhath Puja Mahaparv at our exact Aji Dam (Ajiram) Ghat spot, Rajkot — 15 November (${SANDHYA_ARGHYA_TIME}) & 16 November (${USHA_ARGHYA_TIME}).`;
  const shareMessage = `Hey, welcome ${cleanName}! Join us for Chhath Puja at Aji Dam (Ajiram), Rajkot on 15 November (Evening, near 4:00 PM) & 16 November (near 4:00 AM). Exact Location Pin: ${EXACT_VENUE_MAPS_URL} · Make your weekend safe! Emergency Contact: ${EMERGENCY_CONTACT_NUMBER} · Provided by ${PROVIDER_DOMAIN}`;

  return {
    headline,
    subheadline,
    shareMessage,
  };
}

/**
 * Computes summary terrain statistics from an array of elevation sample points.
 */
export function computeElevationStats(points: ElevationPoint[]): ElevationStats {
  if (!points || points.length === 0) {
    return { minMeters: 0, maxMeters: 0, reliefMeters: 0, avgMeters: 0 };
  }
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;

  for (const pt of points) {
    if (pt.elevationMeters < min) min = pt.elevationMeters;
    if (pt.elevationMeters > max) max = pt.elevationMeters;
    sum += pt.elevationMeters;
  }

  const minMeters = Math.round(min * 10) / 10;
  const maxMeters = Math.round(max * 10) / 10;
  const reliefMeters = Math.round((max - min) * 10) / 10;
  const avgMeters = Math.round((sum / points.length) * 10) / 10;

  return { minMeters, maxMeters, reliefMeters, avgMeters };
}
