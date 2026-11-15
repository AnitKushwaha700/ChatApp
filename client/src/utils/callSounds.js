// Web Audio API Sound Synthesizer for Phone Calls (zero external audio file dependency)

class CallSoundSynthesizer {
  constructor() {
    this.audioCtx = null;
    this.intervalId = null;
    this.isPlaying = false;
  }

  getAudioContext() {
    if (!this.audioCtx || this.audioCtx.state === "closed") {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Play incoming ringtone (melodic WhatsApp-style harmonic pulse)
  playIncomingRingtone() {
    this.stop();
    const ctx = this.getAudioContext();
    if (!ctx) return;

    this.isPlaying = true;

    const playPulse = () => {
      if (!this.isPlaying || ctx.state === "closed") return;
      try {
        const notes = [587.33, 659.25, 880.0, 783.99]; // D5, E5, A5, G5
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);

          gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.12);
          gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + idx * 0.12 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.28);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(ctx.currentTime + idx * 0.12);
          osc.stop(ctx.currentTime + idx * 0.12 + 0.3);
        });
      } catch {
        // Ignore audio interruptions
      }
    };

    playPulse();
    this.intervalId = setInterval(playPulse, 2200);
  }

  // Play outgoing ringback tone (North American / European dual frequency 440+480Hz)
  playOutgoingRingback() {
    this.stop();
    const ctx = this.getAudioContext();
    if (!ctx) return;

    this.isPlaying = true;

    const playBurst = () => {
      if (!this.isPlaying || ctx.state === "closed") return;
      try {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = "sine";
        osc1.frequency.setValueAtTime(440, ctx.currentTime);
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(480, ctx.currentTime);

        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + 1.6);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(ctx.currentTime);
        osc2.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 1.8);
        osc2.stop(ctx.currentTime + 1.8);
      } catch {
        // Ignore audio interruptions
      }
    };

    playBurst();
    this.intervalId = setInterval(playBurst, 4000);
  }

  // Play end call tone
  playEndCallTone() {
    this.stop();
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      [480, 400, 320].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);

        gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.14);
      });
    } catch {
      // Ignore
    }
  }

  stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const callSounds = new CallSoundSynthesizer();
