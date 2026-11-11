import React, { useState } from 'react';
import { Sparkles, Eye, Layers, Calendar } from 'lucide-react';
import { CameraPreset } from './ChhathThreeScene';
import sandhyaArghyaImg from '../assets/images/chhath_sandhya_arghya_1794398072426.jpg';
import ushaArghyaImg from '../assets/images/chhath_usha_arghya_1794398073709.jpg';
import soopPrasadImg from '../assets/images/chhath_soop_prasad_1794398075597.jpg';
import ajiDamFireworksImg from '../assets/images/aji_dam_festive_ghat_1794398075217.jpg';

export interface FestivePhotoCard {
  id: string;
  title: string;
  subtitle: string;
  timingBadge: string;
  imageUrl: string;
  fallbackUrl: string;
  cameraPreset: CameraPreset;
  description: string;
}

export const CHHATH_AI_GALLERY: FestivePhotoCard[] = [
  {
    id: 'sandhya-arghya',
    title: 'Sandhya Arghya at Aji Dam Waterfront',
    subtitle: 'Evening Sunset Offering · Bamboo Soop & Brass Diyas',
    timingBadge: '15 November · Evening, near 4:00 PM',
    imageUrl: sandhyaArghyaImg,
    fallbackUrl: '/images/chhath_sandhya_arghya.jpg',
    cameraPreset: 'ghat',
    description:
      'Devotees standing in the golden sunset waters of Aji Dam offering sacred bamboo soop baskets brimming with sugarcane, coconuts, and glowing diyas to Lord Surya.',
  },
  {
    id: 'usha-arghya',
    title: 'Usha Arghya Dawn Reflections',
    subtitle: 'Pre-Dawn Ghat Ritual · Floating Earthen Lamps',
    timingBadge: '16 November · Morning, near 4:00 AM',
    imageUrl: ushaArghyaImg,
    fallbackUrl: '/images/chhath_usha_arghya.jpg',
    cameraPreset: 'overview',
    description:
      'Hundreds of flickering earthen oil lamps drifting across the serene morning waters as families gather before 4:00 AM for the auspicious Usha Arghya offering.',
  },
  {
    id: 'soop-prasad',
    title: 'Sacred Bamboo Soop & Thekua Prasad',
    subtitle: 'Traditional Offerings · Sugarcane, Coconut & Marigold',
    timingBadge: '15–16 November · Sacred Prasad',
    imageUrl: soopPrasadImg,
    fallbackUrl: '/images/chhath_soop_prasad.jpg',
    cameraPreset: 'mobile',
    description:
      'Handwoven bamboo winnowing basket adorned with sindoor, holding handmade wheat-jaggery Thekua pastries, fresh green sugarcane stalks, bananas, and lit brass diya.',
  },
  {
    id: 'aji-dam-fireworks',
    title: 'Aji Dam Illuminated Ghat & Fireworks',
    subtitle: 'Festive Twilight Aerial · Crackers & Reservoir Glow',
    timingBadge: '15 November · Evening Celebration',
    imageUrl: ajiDamFireworksImg,
    fallbackUrl: '/images/aji_dam_festive_ghat.jpg',
    cameraPreset: 'fireworks',
    description:
      'Panoramic twilight celebration over Aji Dam in Rajkot with thousands of diyas illuminating the curved ghat embankments and festive fireworks sparkling across the sky.',
  },
];

interface ThreeDGallerySectionProps {
  onFocusIn3DScene: (preset: CameraPreset) => void;
}

export const ThreeDGallerySection: React.FC<ThreeDGallerySectionProps> = ({ onFocusIn3DScene }) => {
  const [tiltState, setTiltState] = useState<Record<string, { rotX: number; rotY: number }>>({});
  const [useFallbackUrl, setUseFallbackUrl] = useState<Record<string, boolean>>({});
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [selectedCard, setSelectedCard] = useState<FestivePhotoCard | null>(null);

  const handlePointerMove = (id: string, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTiltState((prev) => ({
      ...prev,
      [id]: { rotX: -y * 14, rotY: x * 14 },
    }));
  };

  const handlePointerLeave = (id: string) => {
    setTiltState((prev) => ({
      ...prev,
      [id]: { rotX: 0, rotY: 0 },
    }));
  };

  return (
    <section
      aria-label="3D AI Chhath Puja Photo Gallery"
      className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 py-8 space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-2 max-w-2xl">
          <div className="text-xs font-medium text-amber-400 tracking-wide">
            Gemini Nano Banana Visuals · Interactive 3D Depth & Parallax
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold text-[#FBF7F0] tracking-tight">
            3D Festive Showcase of Chhath Puja at Aji Dam
          </h2>
          <p className="text-sm sm:text-base text-slate-300">
            Move your cursor or tap across each card to experience 3D spatial depth, or project any ritual view
            directly into the Three.js 3D Ghat viewport.
          </p>
        </div>
        <div className="text-xs text-slate-400">
          <span>15 Nov (Evening ~4:00 PM) · 16 Nov (Morning ~4:00 AM)</span>
        </div>
      </div>

      {/* 2x2 Spatial 3D Parallax Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {CHHATH_AI_GALLERY.map((card) => {
          const tilt = tiltState[card.id] || { rotX: 0, rotY: 0 };
          const hasFailed = Boolean(failedImages[card.id]);

          return (
            <div
              key={card.id}
              onMouseMove={(e) => handlePointerMove(card.id, e)}
              onMouseLeave={() => handlePointerLeave(card.id)}
              className="perspective-1000 group"
            >
              <div
                style={{
                  transform: `rotateX(${tilt.rotX}deg) rotateY(${tilt.rotY}deg)`,
                  transition: 'transform 160ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                className="preserve-3d bg-[#141022] border border-white/10 hover:border-amber-500/40 rounded-xl overflow-hidden shadow-lg flex flex-col h-full"
              >
                {/* 3D Image Container with Measured Scrim */}
                <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-gradient-to-br from-amber-950 via-[#1B112C] to-[#0B0914]">
                  {!hasFailed ? (
                    <img
                      src={useFallbackUrl[card.id] ? card.fallbackUrl : card.imageUrl}
                      alt={card.title}
                      loading="eager"
                      onError={() => {
                        if (!useFallbackUrl[card.id]) {
                          setUseFallbackUrl((prev) => ({ ...prev, [card.id]: true }));
                        } else {
                          setFailedImages((prev) => ({
                            ...prev,
                            [card.id]: true,
                          }));
                        }
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                      <Sparkles className="w-10 h-10 text-amber-400 mb-2" />
                      <span className="text-base font-bold text-white">{card.title}</span>
                      <span className="text-xs text-amber-200/80 mt-1">{card.subtitle}</span>
                    </div>
                  )}

                  {/* Measured Contrast Scrim */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0914] via-black/35 to-transparent" />

                  {/* Floating 3D Depth Caption Overlay */}
                  <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium text-amber-300 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {card.timingBadge}
                      </p>
                      <h3 className="text-lg sm:text-xl font-bold text-white mt-0.5">{card.title}</h3>
                    </div>
                    <span className="text-[11px] font-mono-tabular text-amber-200/90 bg-black/60 px-2.5 py-1 rounded border border-amber-400/30 whitespace-nowrap shrink-0">
                      3D Tilt Active
                    </span>
                  </div>
                </div>

                {/* Card Body & Interactive Actions */}
                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="text-xs text-slate-400">{card.subtitle}</div>
                    <p className="text-sm text-slate-300 leading-relaxed">{card.description}</p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => onFocusIn3DScene(card.cameraPreset)}
                      className="px-3.5 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      View in 3D Ghat Scene
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCard(card)}
                      className="px-3.5 py-2 text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Inspect Full 3D Card
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal for Full 3D Inspection */}
      {selectedCard && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={selectedCard.title}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedCard(null)}
        >
          <div
            className="bg-[#161224] border border-amber-500/40 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-72 sm:h-80 w-full bg-black">
              <img
                src={selectedCard.imageUrl}
                alt={selectedCard.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#161224] via-transparent to-transparent" />
            </div>
            <div className="p-6 space-y-4">
              <div className="text-xs text-amber-400 font-medium">{selectedCard.timingBadge}</div>
              <h3 className="text-2xl font-bold text-white">{selectedCard.title}</h3>
              <p className="text-sm text-slate-300 leading-relaxed">{selectedCard.description}</p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onFocusIn3DScene(selectedCard.cameraPreset);
                    setSelectedCard(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400"
                >
                  Jump to 3D Camera Angle
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCard(null)}
                  className="px-4 py-2 text-xs font-medium bg-white/10 text-white rounded-lg hover:bg-white/15"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
