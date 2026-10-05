/**
 * Audio synthesizer & Web API utilities for timer notifications on iOS & Mobile browsers.
 */

let audioCtx: AudioContext | null = null;
let alarmInterval: number | null = null;
let wakeLockSentinel: any = null;

// Ensure AudioContext is initialized/resumed on user gesture
export function initAudio(): AudioContext | null {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch (e) {
    console.error('AudioContext init error:', e);
    return null;
  }
}

// Play pleasant start chime ("ding")
export function playStartChime() {
  const ctx = initAudio();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch (e) {
    console.error('Error playing start chime:', e);
  }
}

// Play distinctive repeated alarm chime (880Hz / 1046Hz high-pitch bell)
export function playAlarmSound() {
  const ctx = initAudio();
  stopAlarmSound(); // Clear any existing

  const playSingleBell = () => {
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const now = ctx.currentTime;

      // Note 1: High crisp bell
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(1046.5, now); // C6
      gain1.gain.setValueAtTime(0.4, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.4);

      // Note 2: Harmonics
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1318.5, now + 0.12); // E6
      gain2.gain.setValueAtTime(0.4, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.55);

      // Note 3: High G
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(1567.98, now + 0.24); // G6
      gain3.gain.setValueAtTime(0.4, now + 0.24);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.24);
      osc3.stop(now + 0.7);

      // Vibrate mobile device if supported
      if (navigator.vibrate) {
        navigator.vibrate([400, 150, 400]);
      }
    } catch (e) {
      console.error('Error during alarm beat:', e);
    }
  };

  playSingleBell();
  // Repeat every 1.2 seconds until stopped
  alarmInterval = window.setInterval(playSingleBell, 1200);
}

export function stopAlarmSound() {
  if (alarmInterval !== null) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
}

// Screen Wake Lock API to prevent device from sleeping while timer is on screen
export async function requestScreenWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
      wakeLockSentinel.addEventListener('release', () => {
        wakeLockSentinel = null;
      });
    } catch (err) {
      // Non-critical, ignore
    }
  }
}

export function releaseScreenWakeLock() {
  if (wakeLockSentinel) {
    try {
      wakeLockSentinel.release();
    } catch (e) {
      // Ignore
    }
    wakeLockSentinel = null;
  }
}
