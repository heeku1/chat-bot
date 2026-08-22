/**
 * Web Audio API Sound Synthesizer for Telegram Simulator
 * Generates custom, clean, UI-optimized sound effects dynamically.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    // Standard AudioContext initialization
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  // Resume context if suspended (browser security autoplays rule)
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {
      // Ignored: expects user gesture
    });
  }
  return audioCtx;
}

/**
 * Play a light, soft high-pitch blip when user sends a message.
 */
export function playSentSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Short sweet popping sound
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.09);
  } catch (err) {
    console.warn("Audio playSentSound blocked or unsupported", err);
  }
}

/**
 * Play a warm, sweet ascending chime (e.g. Telegram notification tone)
 * when a message/bot reply is received.
 */
export function playReceivedSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // We play two consecutive soft notes (ascending chime)
    const playNote = (freq: number, delay: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
      
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);

      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + duration + 0.05);
    };

    // Tone 1: E5 (659 Hz)
    playNote(659.25, 0, 0.15);
    // Tone 2: A5 (880 Hz)
    playNote(880.00, 0.08, 0.25);

  } catch (err) {
    console.warn("Audio playReceivedSound blocked or unsupported", err);
  }
}

/**
 * Play a warning/error/moderation double alert sound
 */
export function playWarningSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const playAlert = (freq: number, delay: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);

      gain.gain.setValueAtTime(0.1, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.12);

      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.15);
    };

    // Double warning sound (low tone)
    playAlert(220, 0);
    playAlert(200, 0.12);

  } catch (err) {
    console.warn("Audio playWarningSound blocked or unsupported", err);
  }
}
