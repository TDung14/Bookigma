/**
 * Âm thanh thư giãn (Ambient Chill Sounds) cho Góc Đọc Bookigma.
 *
 * File .mp3 đặt trong frontend/src/assets/audio sẽ tự động trở thành lựa chọn
 * trong Góc đọc, tên file chính là tên bản nhạc. Khi thư mục chưa có file,
 * module dùng Web Audio API để tổng hợp âm thanh dự phòng, hoạt động offline.
 */

const customTrackUrls = import.meta.glob('../assets/audio/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
});

let audioCtx = null;
let currentNodes = null;
let currentGainNode = null;
let currentAudio = null;
let currentSoundType = null;
let currentVolume = 0.5;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/** Tạo Pink Noise buffer cho tiếng mưa / gió / sóng */
function createNoiseBuffer(ctx, duration = 5) {
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
  return buffer;
}

/** 1. Tiếng mưa rơi rả rích bên hiên nhà gỗ (Gentle Rain) */
function startRain(ctx, masterGain) {
  const noiseBuffer = createNoiseBuffer(ctx, 4);
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;

  // Lọc tần số để nghe như mưa rơi trên mái tôn/cửa kính
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 1200;

  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 180;

  noiseSource.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(masterGain);
  noiseSource.start();

  return {
    stop: () => {
      try { noiseSource.stop(); } catch (e) {}
    },
  };
}

/** 2. Tiếng lửa lò sưởi thư viện nổ tí tách (Cozy Fireplace) */
function startFireplace(ctx, masterGain) {
  // Nền lửa rực rỡ
  const noiseBuffer = createNoiseBuffer(ctx, 4);
  const bgSource = ctx.createBufferSource();
  bgSource.buffer = noiseBuffer;
  bgSource.loop = true;

  const bgFilter = ctx.createBiquadFilter();
  bgFilter.type = 'lowpass';
  bgFilter.frequency.value = 450;

  const bgGain = ctx.createGain();
  bgGain.gain.value = 0.6;

  bgSource.connect(bgFilter);
  bgFilter.connect(bgGain);
  bgGain.connect(masterGain);
  bgSource.start();

  // Tiếng nổ tí tách (crackles ngẫu nhiên)
  let crackleTimer = null;
  const triggerCrackle = () => {
    if (!audioCtx || audioCtx.state !== 'running') return;
    const osc = ctx.createOscillator();
    const crackleGain = ctx.createGain();

    osc.type = Math.random() > 0.5 ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(150 + Math.random() * 800, ctx.currentTime);

    crackleGain.gain.setValueAtTime(0.001, ctx.currentTime);
    crackleGain.gain.linearRampToValueAtTime(0.35 + Math.random() * 0.4, ctx.currentTime + 0.005);
    crackleGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04 + Math.random() * 0.06);

    osc.connect(crackleGain);
    crackleGain.connect(masterGain);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);

    const nextTime = 120 + Math.random() * 450;
    crackleTimer = setTimeout(triggerCrackle, nextTime);
  };
  triggerCrackle();

  return {
    stop: () => {
      if (crackleTimer) clearTimeout(crackleTimer);
      try { bgSource.stop(); } catch (e) {}
    },
  };
}

/** 3. Tiếng sóng biển đêm vỗ bờ dịu êm (Night Waves) */
function startWaves(ctx, masterGain) {
  const noiseBuffer = createNoiseBuffer(ctx, 6);
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 600;

  // LFO dao động nhịp sóng 8 giây một lần
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.12; // ~8.3 giây/chu kỳ sóng
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.35;

  const waveGain = ctx.createGain();
  waveGain.gain.value = 0.4;

  lfo.connect(lfoGain);
  lfoGain.connect(waveGain.gain);

  noiseSource.connect(filter);
  filter.connect(waveGain);
  waveGain.connect(masterGain);

  lfo.start();
  noiseSource.start();

  return {
    stop: () => {
      try {
        noiseSource.stop();
        lfo.stop();
      } catch (e) {}
    },
  };
}

/** 4. Giai điệu Lofi Chill & Piano ấm áp (Lofi Study Harmony) */
function startLofiChords(ctx, masterGain) {
  // Hợp âm Jazz/Lofi êm dịu: Cmaj7 -> Am7 -> Dm7 -> G7sus4
  const chords = [
    [261.63, 329.63, 392.00, 493.88], // Cmaj7 (C4, E4, G4, B4)
    [220.00, 261.63, 329.63, 392.00], // Am7   (A3, C4, E4, G4)
    [293.66, 349.23, 440.00, 523.25], // Dm7   (D4, F4, A4, C5)
    [196.00, 261.63, 293.66, 392.00], // G7sus4 (G3, C4, D4, G4)
  ];

  let chordIndex = 0;
  let timer = null;
  let activeOscs = [];

  const playNextChord = () => {
    if (!audioCtx || audioCtx.state !== 'running') return;
    const notes = chords[chordIndex];
    chordIndex = (chordIndex + 1) % chords.length;

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Dạng sóng sine pha triangle cho chất âm piano điện Rhodes ấm
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, ctx.currentTime);

      const now = ctx.currentTime;
      const duration = 3.6;
      noteGain.gain.setValueAtTime(0.0001, now);
      noteGain.gain.linearRampToValueAtTime(0.09, now + 0.3 + i * 0.05);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(filter);
      filter.connect(noteGain);
      noteGain.connect(masterGain);

      osc.start(now + i * 0.05);
      osc.stop(now + duration);
      activeOscs.push(osc);
    });

    timer = setTimeout(playNextChord, 3800);
  };

  playNextChord();

  return {
    stop: () => {
      if (timer) clearTimeout(timer);
      activeOscs.forEach((o) => {
        try { o.stop(); } catch (e) {}
      });
      activeOscs = [];
    },
  };
}

const BUILTIN_SOUNDS = [
  { id: 'rain', name: 'Mưa rả rích', icon: '🌧️', desc: 'Tiếng mưa rơi nhẹ bên khung cửa kính', group: 'builtin' },
  { id: 'lofi', name: 'Lofi Piano Chill', icon: '☕', desc: 'Hợp âm Rhodes ấm áp cho không gian đọc', premium: true, group: 'builtin' },
  { id: 'fireplace', name: 'Lò sưởi thư viện', icon: '🔥', desc: 'Than hồng nổ tí tách ấm cúng', premium: true, group: 'builtin' },
  { id: 'waves', name: 'Sóng biển đêm', icon: '🌊', desc: 'Nhịp sóng vỗ bờ êm dịu, tĩnh tâm', group: 'builtin' },
];

function trackNameFromPath(path) {
  const fileName = path.split('/').pop() || '';
  return fileName
    .replace(/\.mp3$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const FILE_SOUNDS = Object.entries(customTrackUrls)
  .sort(([a], [b]) => a.localeCompare(b, 'vi'))
  .map(([path, src]) => ({
    id: `file:${path}`,
    name: trackNameFromPath(path) || 'Bản nhạc',
    icon: '🎵',
    desc: 'Bản nhạc của bạn',
    src,
    group: 'file',
  }));

export const AMBIENT_SOUNDS = [...FILE_SOUNDS, ...BUILTIN_SOUNDS];

/** Bật âm thanh chill */
export function playAmbient(soundId = 'rain', volume = 0.5) {
  stopAmbient();

  const sound = AMBIENT_SOUNDS.find((item) => item.id === soundId) || AMBIENT_SOUNDS[0];
  if (!sound) return;

  currentVolume = volume;

  if (sound.src) {
    const audio = new Audio(sound.src);
    audio.loop = true;
    audio.volume = Math.min(1, Math.max(0, volume));
    currentAudio = audio;
    currentSoundType = sound.id;
    audio.play().catch(() => {});
    return;
  }

  const ctx = getAudioContext();
  if (!ctx) return;

  currentGainNode = ctx.createGain();
  currentGainNode.gain.setValueAtTime(Math.max(0.001, volume * 0.7), ctx.currentTime);
  currentGainNode.connect(ctx.destination);
  currentSoundType = sound.id;

  if (sound.id === 'rain') {
    currentNodes = startRain(ctx, currentGainNode);
  } else if (sound.id === 'fireplace') {
    currentNodes = startFireplace(ctx, currentGainNode);
  } else if (sound.id === 'waves') {
    currentNodes = startWaves(ctx, currentGainNode);
  } else if (sound.id === 'lofi') {
    currentNodes = startLofiChords(ctx, currentGainNode);
  }
}

/** Dừng âm thanh */
export function stopAmbient() {
  if (currentNodes) {
    try {
      currentNodes.stop();
    } catch (e) {}
    currentNodes = null;
  }
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
  currentGainNode = null;
  currentSoundType = null;
}

/** Chỉnh âm lượng */
export function setAmbientVolume(volume) {
  currentVolume = volume;
  const safeVolume = Math.min(1, Math.max(0, volume));
  if (currentAudio) {
    currentAudio.volume = safeVolume;
  }
  if (currentGainNode && audioCtx) {
    currentGainNode.gain.setValueAtTime(Math.max(0.001, safeVolume * 0.7), audioCtx.currentTime);
  }
}

/** Lấy loại âm thanh đang phát */
export function getCurrentAmbient() {
  return currentSoundType;
}

/** Âm báo chuông tinh tinh khi trả lời ĐÚNG câu hỏi */
export function playSuccessChime() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime + idx * 0.08;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.45);
  });
}

/** Âm báo nhẹ khi chọn câu chưa đúng */
export function playWrongChime() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const now = ctx.currentTime;

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(220, now); // A3
  osc.frequency.exponentialRampToValueAtTime(160, now + 0.25);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.35);
}

