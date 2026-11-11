/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Share2,
  Copy,
  Check,
  ArrowRight,
  MapPin,
  PhoneCall,
  Calendar,
  ExternalLink,
  ShieldCheck,
  UserPlus,
  Compass,
} from 'lucide-react';
import { ChhathThreeScene, CameraPreset } from './components/ChhathThreeScene';
import { AjiDamTerrainNavigator } from './components/AjiDamTerrainNavigator';
import { ThreeDGallerySection } from './components/ThreeDGallerySection';
import { ChhathAudioDock } from './components/ChhathAudioDock';
import { chhathAudio } from './utils/chhathAudio';
import {
  InvitationStep,
  validateGuestName,
  buildInvitationShareUrl,
  parseInvitationParams,
  formatPersonalizedGreeting,
  EMERGENCY_CONTACT_NUMBER,
  EMERGENCY_CONTACT_TEL,
  PROVIDER_DOMAIN,
  PROVIDER_URL,
  EXACT_VENUE_MAPS_URL,
  SANDHYA_ARGHYA_DATE,
  SANDHYA_ARGHYA_TIME,
  USHA_ARGHYA_DATE,
  USHA_ARGHYA_TIME,
} from './utils/invitationLogic';

export default function App() {
  const initialParsed = parseInvitationParams(
    typeof window !== 'undefined' ? window.location.search : ''
  );

  const [step, setStep] = useState<InvitationStep>(initialParsed.initialStep);
  const [guestNameInput, setGuestNameInput] = useState<string>(initialParsed.guestName || '');
  const [confirmedGuestName, setConfirmedGuestName] = useState<string | null>(
    initialParsed.guestName
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [generatedShareUrl, setGeneratedShareUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [weekendSafeConfirmed, setWeekendSafeConfirmed] = useState<boolean>(false);

  const [cameraPreset, setCameraPreset] = useState<CameraPreset>(
    initialParsed.initialStep === 'received-greeting' ? 'mobile' : 'overview'
  );
  const [fireworkTriggerCount, setFireworkTriggerCount] = useState<number>(0);
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState<boolean>(false);

  // Listen for Google Maps Platform Demo Key Quota Event (Case A requirement)
  useEffect(() => {
    const onQuotaExceeded = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  // Automatically start Chhath Puja song on first user interaction anywhere in the app
  useEffect(() => {
    const unlockAudio = () => {
      chhathAudio.startSong();
    };
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  // Sync body data-state for accessibility and verification
  useEffect(() => {
    document.body.setAttribute('data-state', step);
  }, [step]);

  const triggerCelebration = useCallback(() => {
    chhathAudio.startSong();
    chhathAudio.playFireworkSound();
    setFireworkTriggerCount((c) => c + 1);
  }, []);

  // Step 1 -> Step 2: Next button clicked on Welcome screen
  const handleWelcomeNext = () => {
    chhathAudio.startSong();
    chhathAudio.playTempleBell();
    setValidationError(null);
    setStep('add-name');
    setCameraPreset('mobile');
    setFireworkTriggerCount((c) => c + 1);
  };

  // Step 2 -> Step 3: Validate Guest Name & Generate Share Link
  const handleGenerateShareLink = (e: React.FormEvent) => {
    e.preventDefault();
    chhathAudio.startSong();

    const validation = validateGuestName(guestNameInput);
    if (!validation.valid) {
      setValidationError(validation.error || 'Please enter a valid guest name.');
      return;
    }

    setValidationError(null);
    setConfirmedGuestName(validation.sanitizedName);

    const baseHref = typeof window !== 'undefined' ? window.location.href : PROVIDER_URL;
    const shareUrl = buildInvitationShareUrl(baseHref, validation.sanitizedName);
    setGeneratedShareUrl(shareUrl);
    setCopiedLink(false);
    setWeekendSafeConfirmed(false);
    setStep('share-ready');
    setCameraPreset('mobile');
    triggerCelebration();
  };

  // Copy generated share link
  const handleCopyShareLink = async () => {
    if (!generatedShareUrl) return;
    try {
      await navigator.clipboard.writeText(generatedShareUrl);
      setCopiedLink(true);
    } catch {
      setCopiedLink(true);
    }
  };

  // Main Share Button: "When it finishes, make your weekend safe by clicking on the main share button"
  const handleMainWeekendSafeShare = async () => {
    triggerCelebration();
    const greeting = formatPersonalizedGreeting(confirmedGuestName);
    const shareUrl =
      generatedShareUrl ||
      (confirmedGuestName
        ? buildInvitationShareUrl(window.location.href, confirmedGuestName)
        : window.location.href);

    setWeekendSafeConfirmed(true);

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Chhath Puja Invitation — ${ greeting.headline }`,
          text: greeting.shareMessage,
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback to clipboard copy if native share sheet is dismissed
      }
    }

    try {
      await navigator.clipboard.writeText(`${greeting.shareMessage}\n${shareUrl}`);
      setCopiedLink(true);
    } catch {
      setCopiedLink(true);
    }
  };

  // Step 3 -> Step 4: Open / Preview the generated share link as the person who received it
  const handleOpenReceivedLink = () => {
    if (!confirmedGuestName) return;
    const newUrl = buildInvitationShareUrl(window.location.href, confirmedGuestName);
    window.history.pushState({ guest: confirmedGuestName }, '', newUrl);
    setStep('received-greeting');
    setCameraPreset('overview');
    triggerCelebration();
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const activeDisplayGuest = confirmedGuestName || (guestNameInput.trim() ? guestNameInput.trim() : null);
  const personalizedGreeting = formatPersonalizedGreeting(confirmedGuestName);

  return (
    <div className="min-h-screen bg-[#0B0914] text-[#FBF7F0] flex flex-col">
      {/* Required Google Maps Platform Demo Key Quota Banner (Case A) */}
      {gmpQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-4 sm:px-8 py-4 border-b border-white/10 bg-[#0B0914] sticky top-0 z-30">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top-hero"
          className="text-base sm:text-lg font-bold tracking-tight text-amber-300 font-display whitespace-nowrap shrink-0"
        >
          Chhath Mahaparv · Aji Dam
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300"
        >
          <a
            href="#top-hero"
            className="hover:text-amber-300 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            3D Invitation
          </a>
          <a
            href="#terrain-navigation"
            className="hover:text-amber-300 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Terrain Map
          </a>
          <a
            href="#ai-3d-gallery"
            className="hover:text-amber-300 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            3D Photos
          </a>
          <a
            href="#safety-helpline"
            className="hover:text-amber-300 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Safety Info
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              chhathAudio.startSong();
              setStep('add-name');
              setCameraPreset('mobile');
              scrollToSection('top-hero');
            }}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 rounded-lg hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0"
          >
            Create Share Link
          </button>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO SECTION: Full-Viewport 3D Three.js Scene + Interactive 4-Step Invitation Overlay */}
        <section
          id="top-hero"
          aria-label="3D Chhath Puja Invitation Experience"
          className="relative w-full min-h-[680px] lg:h-[calc(100vh-72px)] lg:min-h-[700px] border-b border-white/10 overflow-hidden flex flex-col lg:block"
        >
          {/* Full-Viewport 3D Canvas Container */}
          <div className="w-full h-[380px] sm:h-[440px] lg:absolute lg:inset-0 lg:h-full z-0">
            <ChhathThreeScene
              guestName={activeDisplayGuest}
              cameraPreset={cameraPreset}
              fireworkTriggerCount={fireworkTriggerCount}
            />
          </div>

          {/* Semantic DOM Overlay Panel (Left-aligned on desktop so center/right 3D Ghat & 3D Mobile stay clear) */}
          <div className="relative z-10 w-full max-w-[1360px] mx-auto px-4 sm:px-6 py-6 lg:py-10 pointer-events-none flex flex-col lg:flex-row items-start justify-between h-full">
            <div className="w-full lg:max-w-[470px] bg-[#141022]/95 border border-amber-500/35 rounded-2xl p-6 sm:p-7 shadow-2xl pointer-events-auto space-y-5">
              {/* Top Unboxed Metadata Kicker (Zero-Pill Discipline) */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-amber-300/90 font-medium">
                <span>Chhath Puja Festival</span>
                <span aria-hidden="true">·</span>
                <span>Aji Dam (Ajiram), Rajkot</span>
                <span aria-hidden="true">·</span>
                <span>Provided by {PROVIDER_DOMAIN}</span>
              </div>

              {/* STEP 1: WELCOME SCREEN */}
              {step === 'welcome' && (
                <div className="space-y-5" data-testid="step-welcome">
                  <div className="space-y-2">
                    <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
                      Sacred Chhath Puja 3D Invitation
                    </h1>
                    <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                      Celebrate the divine festival of Surya Dev & Chhathi Maiya at the scenic waterfront of{' '}
                      <strong className="text-amber-300 font-semibold">Aji Dam (Ajiram), Rajkot</strong> with
                      3D fireworks, devotional Chhath Geet music, and personalized family invitations.
                    </p>
                  </div>

                  {/* Schedule & Exact Venue Pin Summary Box */}
                  <div className="p-4 rounded-xl bg-[#0B0914] border border-white/10 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between text-amber-300 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        Sandhya Arghya (Evening)
                      </span>
                      <span className="font-mono-tabular">
                        {SANDHYA_ARGHYA_DATE} · {SANDHYA_ARGHYA_TIME}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-amber-200 font-semibold pt-2 border-t border-white/10">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        Usha Arghya (Morning)
                      </span>
                      <span className="font-mono-tabular">
                        {USHA_ARGHYA_DATE} · {USHA_ARGHYA_TIME}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-amber-400" />
                        Exact Ghat Pin (Aji Dam)
                      </span>
                      <a
                        href={EXACT_VENUE_MAPS_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-amber-300 hover:underline inline-flex items-center gap-1"
                      >
                        Open Google Maps <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* Primary Action: Next -> Add Name */}
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleWelcomeNext}
                      className="flex-1 px-5 py-3 text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl inline-flex items-center justify-center gap-2 transition-colors shadow-lg whitespace-nowrap shrink-0"
                    >
                      Next: Add Guest Name
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollToSection('terrain-navigation')}
                      className="px-4 py-3 text-xs font-semibold bg-white/10 hover:bg-white/15 text-white rounded-xl inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                    >
                      <Compass className="w-4 h-4 text-amber-400" />
                      Aji Dam Terrain
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: ADD GUEST NAME SCREEN */}
              {step === 'add-name' && (
                <form onSubmit={handleGenerateShareLink} className="space-y-4" data-testid="step-add-name" noValidate>
                  <div className="space-y-1.5">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white">
                      Personalize Your Invitation
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-300">
                      Enter the name of your guest or family below. Notice the 3D Mobile Phone in the scene
                      update live with their invitation card.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="guest-name-input"
                      className="block text-xs font-semibold text-amber-300"
                    >
                      Guest or Family Name
                    </label>
                    <input
                      id="guest-name-input"
                      type="text"
                      value={guestNameInput}
                      onChange={(e) => {
                        setGuestNameInput(e.target.value);
                        if (validationError) setValidationError(null);
                      }}
                      placeholder="e.g., Rahul Sharma & Family"
                      className="w-full px-4 py-3 text-sm bg-[#0B0914] border border-white/20 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                      autoFocus
                    />
                    {validationError && (
                      <p role="alert" className="text-xs font-medium text-rose-400">
                        {validationError}
                      </p>
                    )}
                  </div>

                  {/* Quick-select sample family names */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-slate-400 block">
                      Quick Fill Suggestions:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {['Rahul Sharma & Family', 'Priya Verma', 'Mishra Parivar', 'Ananya & Aarav'].map(
                        (presetName) => (
                          <button
                            key={presetName}
                            type="button"
                            onClick={() => {
                              setGuestNameInput(presetName);
                              setValidationError(null);
                            }}
                            className="px-2.5 py-1 text-xs bg-white/5 hover:bg-white/10 text-amber-200 border border-white/10 rounded-lg transition-colors whitespace-nowrap shrink-0"
                          >
                            {presetName}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="submit"
                      className="flex-1 px-5 py-3 text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
                    >
                      <Share2 className="w-4 h-4" />
                      Generate Share Link
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep('welcome')}
                      className="px-4 py-3 text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl transition-colors whitespace-nowrap shrink-0"
                    >
                      Back
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: SHARE LINK GENERATED & MAIN WEEKEND SAFE SHARE */}
              {step === 'share-ready' && (
                <div className="space-y-4" data-testid="step-share-ready">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-emerald-400">
                      Personal Invitation Link Ready for {confirmedGuestName}
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white">
                      Share & Make Your Weekend Safe
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-300">
                      When your recipient opens this link, they will be greeted with{' '}
                      <span className="text-amber-300 font-semibold">
                        &ldquo;Hey, welcome {confirmedGuestName}!&rdquo;
                      </span>{' '}
                      along with the 3D Aji Dam celebration.
                    </p>
                  </div>

                  {/* Share URL Box */}
                  <div className="p-3 bg-[#0B0914] border border-white/15 rounded-xl space-y-2">
                    <label htmlFor="generated-share-url" className="text-[11px] text-slate-400 block">
                      Generated Share Link
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="generated-share-url"
                        type="text"
                        readOnly
                        value={generatedShareUrl}
                        className="flex-1 bg-transparent text-xs font-mono-tabular text-amber-200 focus:outline-none truncate"
                      />
                      <button
                        type="button"
                        onClick={handleCopyShareLink}
                        className="px-3 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/15 text-white rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                      >
                        {copiedLink ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy Link
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Primary Main Share Button: Make Your Weekend Safe */}
                  <button
                    type="button"
                    onClick={handleMainWeekendSafeShare}
                    className="w-full px-5 py-3.5 text-sm font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 rounded-xl inline-flex items-center justify-center gap-2 shadow-lg transition-all whitespace-nowrap shrink-0"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Main Share — Make Your Weekend Safe
                  </button>

                  {weekendSafeConfirmed && (
                    <div
                      role="status"
                      className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-xs text-emerald-200 space-y-1"
                    >
                      <p className="font-semibold text-emerald-300">
                        Weekend Safety & Chhath Puja Invitation Shared!
                      </p>
                      <p>
                        Link & emergency safety contact ({EMERGENCY_CONTACT_NUMBER}) copied for{' '}
                        <strong>{confirmedGuestName}</strong>.
                      </p>
                    </div>
                  )}

                  {/* Action to Open / Preview the Shared Link as the Receiver */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={handleOpenReceivedLink}
                      className="px-4 py-2.5 text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open Shared Link (Recipient View)
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setStep('add-name');
                        setWeekendSafeConfirmed(false);
                      }}
                      className="px-3.5 py-2.5 text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Change Guest Name
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: RECIPIENT PERSONALIZED GREETING ("Hey, welcome [Name]!") */}
              {step === 'received-greeting' && (
                <div className="space-y-4" data-testid="step-received-greeting">
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-amber-400">
                      Personal Chhath Puja Mahaparv Invitation
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
                      {personalizedGreeting.headline}
                    </h1>
                    <p className="text-sm text-slate-200 leading-relaxed">
                      {personalizedGreeting.subheadline}
                    </p>
                  </div>

                  {/* Venue & Dates Summary for Recipient */}
                  <div className="p-4 rounded-xl bg-[#0B0914] border border-amber-500/30 space-y-2.5 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-white block">
                            Venue: Aji Dam (Ajiram) Chhath Ghat, Rajkot
                          </span>
                          <span className="text-slate-400">
                            Exact Pin: 22°16&apos;28.2&quot;N 70°50&apos;28.8&quot;E
                          </span>
                        </div>
                      </div>
                      <a
                        href={EXACT_VENUE_MAPS_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/30 rounded-lg inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                      >
                        Exact Pin <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="pt-2 border-t border-white/10 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-300">Sandhya Arghya:</span>
                        <span className="font-mono-tabular font-semibold text-amber-300">
                          {SANDHYA_ARGHYA_DATE} · {SANDHYA_ARGHYA_TIME}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-300">Usha Arghya:</span>
                        <span className="font-mono-tabular font-semibold text-amber-200">
                          {USHA_ARGHYA_DATE} · {USHA_ARGHYA_TIME}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Main Share Button for Weekend Safety + Terrain Navigation */}
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      onClick={handleMainWeekendSafeShare}
                      className="w-full px-5 py-3 text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl inline-flex items-center justify-center gap-2 transition-colors shadow-lg whitespace-nowrap shrink-0"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Main Share — Make Your Weekend Safe
                    </button>

                    {weekendSafeConfirmed && (
                      <p role="status" className="text-xs text-emerald-300 font-medium text-center">
                        Weekend Safety & Invitation Link Copied! Have a blessed Chhath Puja.
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => scrollToSection('terrain-navigation')}
                        className="flex-1 px-3.5 py-2.5 text-xs font-semibold bg-white/10 hover:bg-white/15 text-white rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                      >
                        <Compass className="w-3.5 h-3.5 text-amber-400" />
                        View Aji Dam Terrain Map
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setGuestNameInput('');
                          setValidationError(null);
                          setStep('add-name');
                        }}
                        className="px-3.5 py-2.5 text-xs font-medium bg-white/5 hover:bg-white/10 text-amber-200 rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Invite Another Friend
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Persistent Emergency Contact & Provider Footer inside Hero Card */}
              <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-300 font-medium">
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Emergency:</span>
                  <a
                    href={EMERGENCY_CONTACT_TEL}
                    className="font-mono-tabular font-bold underline hover:text-white"
                  >
                    {EMERGENCY_CONTACT_NUMBER}
                  </a>
                </div>
                <div className="text-slate-400">
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

          {/* Unified Collapsible Bottom Dock for Chhath Puja Devotional Song & 3D Controls */}
          <ChhathAudioDock
            cameraPreset={cameraPreset}
            onChangeCameraPreset={(preset) => {
              setCameraPreset(preset);
              chhathAudio.startSong();
            }}
            onLaunchFireworks={triggerCelebration}
          />
        </section>

        {/* SECTION 2: PRIMARY NAVIGATION SCREEN — DETAILED TERRAIN MAPPING OF AJI DAM (AJIRAM) */}
        <div id="terrain-navigation" className="border-b border-white/10 bg-[#0E0B1A]">
          <AjiDamTerrainNavigator />
        </div>

        {/* SECTION 3: 3D AI PHOTO GALLERY (GEMINI NANO BANANA SHOWCASE) */}
        <div id="ai-3d-gallery" className="border-b border-white/10 bg-[#0B0914]">
          <ThreeDGallerySection
            onFocusIn3DScene={(preset) => {
              setCameraPreset(preset);
              triggerCelebration();
              scrollToSection('top-hero');
            }}
          />
        </div>

        {/* SECTION 4: WEEKEND SAFETY, SCHEDULE & EMERGENCY HELPLINE SUMMARY */}
        <section
          id="safety-helpline"
          aria-label="Festival Safety, Emergency Contact and Provider Information"
          className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 py-12"
        >
          <div className="bg-[#141022] border border-amber-500/30 rounded-2xl p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-3">
              <div className="text-xs font-medium text-emerald-400">
                Safe Weekend Initiative · Chhath Puja Mahaparv at Aji Dam (Ajiram)
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                Make Your Festive Weekend Safe & Memorable
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Whether you are attending the evening{' '}
                <strong className="text-amber-300">Sandhya Arghya on 15 November (near 4:00 PM)</strong> or
                the pre-dawn{' '}
                <strong className="text-amber-300">Usha Arghya on 16 November (near 4:00 AM)</strong> at Aji
                Dam Ghat, keep our dedicated emergency contact handy and share your personal invitation link
                with family.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleMainWeekendSafeShare}
                  className="px-5 py-2.5 text-xs sm:text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
                >
                  <Share2 className="w-4 h-4" />
                  Main Share — Make Your Weekend Safe
                </button>
                <a
                  href={EMERGENCY_CONTACT_TEL}
                  className="px-4 py-2.5 text-xs sm:text-sm font-mono-tabular font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-xl inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
                >
                  <PhoneCall className="w-4 h-4" />
                  Call Emergency: {EMERGENCY_CONTACT_NUMBER}
                </a>
              </div>
            </div>

            <div className="lg:col-span-5 bg-[#0B0914] border border-white/10 rounded-xl p-5 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <span className="text-slate-400">Festival Venue Pin</span>
                <a
                  href={EXACT_VENUE_MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-amber-300 hover:underline inline-flex items-center gap-1"
                >
                  Aji Dam (Ajiram) Exact Pin <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <span className="text-slate-400">Sandhya Arghya</span>
                <span className="font-mono-tabular font-semibold text-amber-300">
                  15 November · near 4:00 PM
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <span className="text-slate-400">Usha Arghya</span>
                <span className="font-mono-tabular font-semibold text-amber-200">
                  16 November · near 4:00 AM
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <span className="text-slate-400">Emergency Mobile Number</span>
                <a
                  href={EMERGENCY_CONTACT_TEL}
                  className="font-mono-tabular font-bold text-emerald-400 hover:underline"
                >
                  {EMERGENCY_CONTACT_NUMBER}
                </a>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Official Platform Provider</span>
                <a
                  href={PROVIDER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-amber-300 hover:underline inline-flex items-center gap-1"
                >
                  {PROVIDER_DOMAIN} <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Clean Quiet Footer */}
      <footer className="border-t border-white/10 py-6 px-4 sm:px-8 text-xs text-slate-400">
        <div className="max-w-[1360px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span>Chhath Puja 3D Invitation & Aji Dam Terrain Navigator</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>Emergency Contact: {EMERGENCY_CONTACT_NUMBER}</span>
          </div>
          <div>
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
      </footer>
    </div>
  );
}
