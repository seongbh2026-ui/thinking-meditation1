import { store } from '../core/store';
import { eventBus } from '../core/eventBus';

let audioCtx: AudioContext | null = null;
const bufferCache = new Map<string, AudioBuffer>();
const htmlAudioCache = new Map<string, HTMLAudioElement>();
let activeSourceNode: AudioBufferSourceNode | null = null;
let currentHtmlAudio: HTMLAudioElement | null = null;
let isAudioInited = false;
let isAudioUnlocked = false;

// AudioContext 안전 생성 및 반환
export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Safari 및 모바일 호환 decodeAudioData 래퍼
function decodeAudioDataSafely(ctx: AudioContext, arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    try {
      const bufferCopy = arrayBuffer.slice(0);
      const promise = ctx.decodeAudioData(
        bufferCopy,
        (decoded) => resolve(decoded),
        (err) => reject(err)
      );
      if (promise && typeof (promise as Promise<AudioBuffer>).then === 'function') {
        (promise as Promise<AudioBuffer>).then(resolve).catch(reject);
      }
    } catch (e) {
      reject(e);
    }
  });
}

// 💡 모바일 디바이스 오디오 세션 즉시 활성화 (Unmute / Warm-up)
export function unlockAudio(): void {
  if (typeof window === 'undefined') return;

  const ctx = getAudioContext();
  if (ctx) {
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    try {
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    } catch {
      // ignore
    }
  }

  // HTML5 Audio Element Session Unmute (iOS Safari / 카카오톡 인앱 브라우저 호환)
  try {
    const dummyAudio = new Audio();
    dummyAudio.volume = 0.001;
    dummyAudio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
    const playPromise = dummyAudio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          dummyAudio.pause();
        })
        .catch(() => {});
    }
  } catch {
    // ignore
  }

  isAudioUnlocked = true;
}

// 💡 첨부된 모든 MP3 파일들을 서버로부터 사전 로딩 및 캐시 구축 (완전 동기/비동기 프리로드)
export async function preloadAudioAssets(voiceType: 'male' | 'female' = 'male'): Promise<void> {
  const ctx = getAudioContext();
  if (!ctx) return;

  const folder = voiceType === 'male' ? 'male' : 'female';
  const prefix = voiceType === 'male' ? 'InJoon' : 'SunHi';

  const sampleLabels: string[] = [];
  for (let i = 1; i <= 100; i++) sampleLabels.push(String(i));
  ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'].forEach(l => sampleLabels.push(l));

  await Promise.allSettled(
    sampleLabels.map(async (label) => {
      const path = `/audio/${folder}/${prefix}_${label}.mp3`;
      
      // 1. HTMLAudioElement 캐시
      if (!htmlAudioCache.has(path)) {
        const audio = new Audio(path);
        audio.preload = 'auto';
        audio.load();
        htmlAudioCache.set(path, audio);
      }

      // 2. Web Audio Buffer 캐시
      if (!bufferCache.has(path)) {
        try {
          const res = await fetch(path);
          if (res.ok) {
            const arrayBuffer = await res.arrayBuffer();
            const decoded = await decodeAudioDataSafely(ctx, arrayBuffer);
            bufferCache.set(path, decoded);
          }
        } catch {
          // ignore
        }
      }
    })
  );
}

// 💡 명상 프로그램 시작 직전 호출 (Promise를 반환하여 완전 로딩 보장 후 카운트다운 시작)
export async function prepareAudioForSession(voiceType: 'male' | 'female' = 'male'): Promise<void> {
  unlockAudio();

  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    await ctx.resume().catch(() => {});
  }

  await preloadAudioAssets(voiceType);
}

// 기존 재생 중인 소리 중단
export function stopAudio(): void {
  if (activeSourceNode) {
    try {
      activeSourceNode.stop();
      activeSourceNode.disconnect();
    } catch {
      // ignore
    }
    activeSourceNode = null;
  }

  if (currentHtmlAudio) {
    try {
      currentHtmlAudio.pause();
      currentHtmlAudio.currentTime = 0;
    } catch {
      // ignore
    }
    currentHtmlAudio = null;
  }
}

// 💡 메인 음성 출력 함수 (메모리 캐시에서 즉시 재생하여 모바일 지연 및 차단 방지)
const playSound = (label: string, voiceType: 'male' | 'female' | 'mute') => {
  if (voiceType === 'mute') {
    stopAudio();
    return;
  }

  stopAudio();

  if (!isAudioUnlocked) {
    unlockAudio();
  }

  const folder = voiceType === 'male' ? 'male' : 'female';
  const prefix = voiceType === 'male' ? 'InJoon' : 'SunHi';
  const path = `/audio/${folder}/${prefix}_${label}.mp3`;
  const isNumber = /^\d+$/.test(label);

  const ctx = getAudioContext();

  // 1순위: Web Audio API Buffer 메모리 재생 (지연 0초, 가장 확실함)
  if (ctx && bufferCache.has(path)) {
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    try {
      const buffer = bufferCache.get(path)!;
      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const gainNode = ctx.createGain();
      gainNode.gain.value = isNumber ? 2.5 : 1.2;

      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      activeSourceNode = source;
      source.start(0);
      return;
    } catch {
      // fallback
    }
  }

  // 2순위: HTMLAudioElement 캐시 재생
  let audio = htmlAudioCache.get(path);
  if (!audio) {
    audio = new Audio(path);
    htmlAudioCache.set(path, audio);
  }

  audio.currentTime = 0;
  audio.volume = isNumber ? 1.0 : 0.9;
  currentHtmlAudio = audio;

  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise.catch(() => {
      try {
        const fallbackAudio = new Audio(path);
        fallbackAudio.volume = 1.0;
        currentHtmlAudio = fallbackAudio;
        fallbackAudio.play().catch(() => {});
      } catch {
        // ignore
      }
    });
  }
};

// 앱 초기화 시 최초 오디오 엔진 바인딩
export const initAudio = () => {
  if (isAudioInited) return;
  isAudioInited = true;

  getAudioContext();
  preloadAudioAssets('male');

  const handleFirstInteraction = () => {
    unlockAudio();
    window.removeEventListener('pointerdown', handleFirstInteraction);
    window.removeEventListener('touchstart', handleFirstInteraction);
    window.removeEventListener('click', handleFirstInteraction);
    window.removeEventListener('keydown', handleFirstInteraction);
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('pointerdown', handleFirstInteraction, { once: true });
    window.addEventListener('touchstart', handleFirstInteraction, { once: true });
    window.addEventListener('click', handleFirstInteraction, { once: true });
    window.addEventListener('keydown', handleFirstInteraction, { once: true });
  }

  eventBus.on('TICK', (label: string) => {
    const state = store.getState();
    const voiceType = state.settings?.voiceType || 'male';
    playSound(label, voiceType);
  });

  eventBus.on('SESSION_END', () => {
    stopAudio();
  });
};
