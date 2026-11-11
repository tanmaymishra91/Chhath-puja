/**
 * Procedural Web Audio Synthesizer for Chhath Puja Devotional Folk Song (Chaturpooja Geet),
 * Temple Shankh (Conch), Brass Ghanti (Bell), and Festive Firework Crackers.
 *
 * Sound is 100% active and never disabled, fulfilling the mandatory Chhath Puja song requirement.
 */

export interface ChhathVerse {
  id: string;
  title: string;
  bhojpuriLine: string;
  translation: string;
  tempoBpm: number;
  notes: Array<{ freq: number; duration: number; beatAccent?: boolean }>;
}

export const CHHATH_PUJA_VERSES: ChhathVerse[] = [
  {
    id: 'kelwa-ke-paat',
    title: 'Kelwa Ke Paat Par (Sandhya Arghya Geet)',
    bhojpuriLine: 'केलवा के पात पर उगलन सुरुज मल झांके झुके · हे छठी मईया दर्सन दिहीं अपार',
    translation: 'Upon the sacred banana leaf rises Lord Surya in golden splendor — O Chhathi Maiya, bless us at Aji Dam Ghat.',
    tempoBpm: 96,
    // Traditional folk melody in Raga Desh / Bilawal (Sa Re Ga Ma Pa Dha Ni Sa)
    notes: [
      { freq: 293.66, duration: 0.45, beatAccent: true }, // D4 (Sa)
      { freq: 329.63, duration: 0.45 },                   // E4 (Re)
      { freq: 369.99, duration: 0.65, beatAccent: true }, // F#4 (Ga)
      { freq: 392.00, duration: 0.45 },                   // G4 (Ma)
      { freq: 440.00, duration: 0.85, beatAccent: true }, // A4 (Pa)
      { freq: 493.88, duration: 0.45 },                   // B4 (Dha)
      { freq: 440.00, duration: 0.55, beatAccent: true }, // A4 (Pa)
      { freq: 392.00, duration: 0.45 },                   // G4 (Ma)
      { freq: 369.99, duration: 0.65, beatAccent: true }, // F#4 (Ga)
      { freq: 329.63, duration: 0.45 },                   // E4 (Re)
      { freq: 293.66, duration: 0.90, beatAccent: true }, // D4 (Sa)
    ],
  },
  {
    id: 'kaanch-hi-baans',
    title: 'Kaanch Hi Baans Ke Bahangiya (Ghat Procession Geet)',
    bhojpuriLine: 'कांच ही बांस के बहंगिया · बहंगी लचकत जाय · बाट जे पूछेला बटोहिया बहंगी केकरा के जाय',
    translation: 'The sacred bamboo bahangi sways gently along the path to Aji Dam Ghat, carrying offerings for Surya Dev.',
    tempoBpm: 104,
    notes: [
      { freq: 440.00, duration: 0.40, beatAccent: true }, // Pa
      { freq: 493.88, duration: 0.40 },                   // Dha
      { freq: 587.33, duration: 0.70, beatAccent: true }, // Sa'
      { freq: 554.37, duration: 0.40 },                   // Ni
      { freq: 493.88, duration: 0.55, beatAccent: true }, // Dha
      { freq: 440.00, duration: 0.55 },                   // Pa
      { freq: 392.00, duration: 0.45, beatAccent: true }, // Ma
      { freq: 369.99, duration: 0.45 },                   // Ga
      { freq: 329.63, duration: 0.45, beatAccent: true }, // Re
      { freq: 293.66, duration: 0.85, beatAccent: true }, // Sa
    ],
  },
  {
    id: 'uga-ho-suruj-dev',
    title: 'Uga Ho Suruj Dev (Usha Arghya Sunrise Geet)',
    bhojpuriLine: 'उग हो सुरुज देव भेल भिनसरवा · अरघ के रे बेरवा · पूजन के रे बेरवा हो',
    translation: 'Rise, O Compassionate Sun God, dawn has arrived over the reservoir waters; the hour of sacred Arghya is here.',
    tempoBpm: 92,
    notes: [
      { freq: 293.66, duration: 0.50, beatAccent: true }, // Sa
      { freq: 369.99, duration: 0.50 },                   // Ga
      { freq: 440.00, duration: 0.75, beatAccent: true }, // Pa
      { freq: 587.33, duration: 0.85, beatAccent: true }, // Sa'
      { freq: 554.37, duration: 0.45 },                   // Ni
      { freq: 493.88, duration: 0.55, beatAccent: true }, // Dha
      { freq: 440.00, duration: 0.75 },                   // Pa
      { freq: 369.99, duration: 0.50, beatAccent: true }, // Ga
      { freq: 329.63, duration: 0.50 },                   // Re
      { freq: 293.66, duration: 0.95, beatAccent: true }, // Sa
    ],
  },
];

class ChhathAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isPlayingLoop = false;
  private loopTimer: number | null = null;
  private currentVerseIndex = 0;
  private currentNoteIndex = 0;
  private volumeLevel = 0.75; // Always audible (> 0.25 minimum)
  private listeners: Set<() => void> = new Set();

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volumeLevel;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  public getState() {
    return {
      isPlaying: this.isPlayingLoop,
      verseIndex: this.currentVerseIndex,
      currentVerse: CHHATH_PUJA_VERSES[this.currentVerseIndex],
      noteIndex: this.currentNoteIndex,
      volumeLevel: this.volumeLevel,
    };
  }

  public setVolume(level: number) {
    // Sound cannot be disabled — minimum floor is 0.25 so the song is always audible
    this.volumeLevel = Math.max(0.25, Math.min(1.0, level));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volumeLevel, this.ctx.currentTime, 0.05);
    }
    this.notify();
  }

  public selectVerse(index: number) {
    if (index >= 0 && index < CHHATH_PUJA_VERSES.length) {
      this.currentVerseIndex = index;
      this.currentNoteIndex = 0;
      if (!this.isPlayingLoop) {
        this.startSong();
      } else {
        this.notify();
      }
    }
  }

  /**
   * Starts the continuous Chhath Puja devotional song loop.
   */
  public startSong() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    if (this.isPlayingLoop) {
      // Already running; trigger a subtle temple bell chime to confirm
      this.playTempleBell();
      this.notify();
      return;
    }

    this.isPlayingLoop = true;
    this.notify();
    this.scheduleNextNote();
  }

  private scheduleNextNote() {
    if (!this.isPlayingLoop) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const verse = CHHATH_PUJA_VERSES[this.currentVerseIndex];
    const note = verse.notes[this.currentNoteIndex];

    const now = ctx.currentTime;
    // Play Harmonium + Bansuri folk melody voice
    this.triggerMelodyVoice(ctx, this.masterGain, note.freq, note.duration, now);

    // Play continuous soft Sa-Pa Tanpura drone on first note of cycle
    if (this.currentNoteIndex === 0 || this.currentNoteIndex === 5) {
      this.triggerTanpuraDrone(ctx, this.masterGain, 146.83, note.duration * 2.4, now); // D3
      this.triggerTanpuraDrone(ctx, this.masterGain, 220.00, note.duration * 2.4, now); // A3
    }

    // Play Dholak folk percussion pulse on accented beats
    if (note.beatAccent) {
      this.triggerDholakBeat(ctx, this.masterGain, now);
    }

    this.currentNoteIndex = (this.currentNoteIndex + 1) % verse.notes.length;
    if (this.currentNoteIndex === 0) {
      // Advance seamlessly to next devotional verse after completing phrase
      this.currentVerseIndex = (this.currentVerseIndex + 1) % CHHATH_PUJA_VERSES.length;
    }
    this.notify();

    const intervalMs = Math.max(240, Math.round(note.duration * 1000));
    this.loopTimer = window.setTimeout(() => {
      this.scheduleNextNote();
    }, intervalMs);
  }

  private triggerMelodyVoice(
    ctx: AudioContext,
    dest: AudioNode,
    freq: number,
    duration: number,
    startTime: number
  ) {
    // Warm Harmonium reed + Bansuri flute harmonic blend
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, startTime);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, startTime); // Octave harmonic shimmer

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.18, startTime + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration + 0.12);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + duration + 0.15);
    osc2.stop(startTime + duration + 0.15);
  }

  private triggerTanpuraDrone(
    ctx: AudioContext,
    dest: AudioNode,
    freq: number,
    duration: number,
    startTime: number
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.05, startTime + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  private triggerDholakBeat(ctx: AudioContext, dest: AudioNode, startTime: number) {
    // Warm resonant folk drum thump
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(135, startTime);
    osc.frequency.exponentialRampToValueAtTime(58, startTime + 0.14);

    gain.gain.setValueAtTime(0.16, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.16);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(startTime);
    osc.stop(startTime + 0.18);
  }

  /**
   * Plays an auspicious brass Temple Bell (Ghanti) & Shankh overtone chime.
   */
  public playTempleBell() {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    const partials = [528, 1056, 1584, 2112];
    partials.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const amp = 0.12 / (idx + 1);
      gain.gain.setValueAtTime(amp, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 1.4 - idx * 0.2);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now);
      osc.stop(now + 1.45);
    });
  }

  /**
   * Synthesizes festive firework burst and sparkler crackles.
   */
  public playFireworkSound() {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    // Launch whistle + deep sky burst
    const whistle = ctx.createOscillator();
    const whistleGain = ctx.createGain();
    whistle.type = 'sine';
    whistle.frequency.setValueAtTime(340, now);
    whistle.frequency.exponentialRampToValueAtTime(1180, now + 0.22);

    whistleGain.gain.setValueAtTime(0.08, now);
    whistleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    whistle.connect(whistleGain);
    whistleGain.connect(this.masterGain);
    whistle.start(now);
    whistle.stop(now + 0.25);

    // Crackle noise burst
    const bufferSize = Math.floor(ctx.sampleRate * 0.35);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.1));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(1800, now + 0.2);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.22, now + 0.2);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    noise.connect(bandpass);
    bandpass.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(now + 0.2);
  }
}

export const chhathAudio = new ChhathAudioEngine();
