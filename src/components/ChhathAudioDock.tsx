import React, { useEffect, useState } from 'react';
import { Volume2, Sparkles, Bell, Music, ChevronDown, ChevronUp } from 'lucide-react';
import { chhathAudio, CHHATH_PUJA_VERSES } from '../utils/chhathAudio';
import { CameraPreset } from './ChhathThreeScene';

interface ChhathAudioDockProps {
  cameraPreset: CameraPreset;
  onChangeCameraPreset: (preset: CameraPreset) => void;
  onLaunchFireworks: () => void;
}

export const ChhathAudioDock: React.FC<ChhathAudioDockProps> = ({
  cameraPreset,
  onChangeCameraPreset,
  onLaunchFireworks,
}) => {
  const [audioState, setAudioState] = useState(chhathAudio.getState());
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    return chhathAudio.subscribe(() => {
      setAudioState(chhathAudio.getState());
    });
  }, []);

  // Keyboard shortcut 'H' to toggle collapsible bottom dock per threejs skill
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        setCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div
      className="relative lg:absolute lg:bottom-3 lg:right-6 z-30 w-full lg:w-auto lg:max-w-[760px] px-4 lg:px-0 mt-3 lg:mt-0 pointer-events-auto"
      role="region"
      aria-label="Chhath Puja Song Audio and 3D Scene Controls Dock"
    >
      {/* Collapse / Expand Toggle Tab */}
      <div className="flex justify-end mb-1">
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="px-3.5 py-1 text-xs font-medium bg-[#141022] hover:bg-[#1E1833] text-amber-200 border border-amber-500/30 rounded-t-lg inline-flex items-center gap-1.5 shadow-md transition-colors whitespace-nowrap shrink-0"
        >
          {collapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" /> Show 3D & Chhath Song Controls
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" /> Hide Controls
            </>
          )}
        </button>
      </div>

      {!collapsed && (
        <div className="bg-[#141022] border border-amber-500/35 rounded-xl p-3 sm:p-4 shadow-2xl space-y-3">
          {/* Top Row: Mandatory Chhath Puja Devotional Song Player (Always Enabled) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => chhathAudio.startSong()}
                className="px-3.5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <Music className="w-3.5 h-3.5" />
                {audioState.isPlaying ? 'Chhath Geet Playing (Active)' : 'Play Chhath Puja Song'}
              </button>

              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-amber-300 truncate">
                  {audioState.currentVerse.title}
                </div>
                <div className="text-[11px] text-slate-300 truncate">
                  {audioState.currentVerse.bhojpuriLine}
                </div>
              </div>
            </div>

            {/* Verse Selector + Volume Boost (Sound cannot be disabled per user requirement) */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {CHHATH_PUJA_VERSES.map((verse, idx) => (
                <button
                  key={verse.id}
                  type="button"
                  onClick={() => chhathAudio.selectVerse(idx)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    audioState.verseIndex === idx
                      ? 'bg-amber-500/25 text-amber-200 border border-amber-400/50'
                      : 'bg-white/5 text-slate-300 hover:text-white'
                  }`}
                >
                  Geet {idx + 1}
                </button>
              ))}

              <div className="flex items-center gap-1.5 pl-2 border-l border-white/10">
                <Volume2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <label htmlFor="chhath-volume-slider" className="sr-only">
                  Chhath Puja Song Volume
                </label>
                <input
                  id="chhath-volume-slider"
                  type="range"
                  min={0.25}
                  max={1}
                  step={0.05}
                  value={audioState.volumeLevel}
                  onChange={(e) => {
                    chhathAudio.startSong();
                    chhathAudio.setVolume(parseFloat(e.target.value));
                  }}
                  className="w-16 accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Bottom Row: 3D Camera Angles & Festive Crackers / Temple Bell Triggers */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-400 mr-1">3D Camera:</span>
              {(
                [
                  { id: 'overview', label: 'Full Aji Dam Panorama' },
                  { id: 'mobile', label: '3D Mobile Invite' },
                  { id: 'ghat', label: 'Ceremonial Ghat' },
                  { id: 'fireworks', label: 'Sky Fireworks' },
                ] as Array<{ id: CameraPreset; label: string }>
              ).map((cam) => (
                <button
                  key={cam.id}
                  type="button"
                  onClick={() => onChangeCameraPreset(cam.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    cameraPreset === cam.id
                      ? 'bg-white text-slate-950 font-semibold'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {cam.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  chhathAudio.startSong();
                  chhathAudio.playTempleBell();
                }}
                className="px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/15 text-amber-200 rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <Bell className="w-3.5 h-3.5 text-amber-400" />
                Ring Temple Bell
              </button>
              <button
                type="button"
                onClick={() => {
                  chhathAudio.startSong();
                  chhathAudio.playFireworkSound();
                  onLaunchFireworks();
                }}
                className="px-3.5 py-1.5 text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Launch Crackers & Fireworks
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
