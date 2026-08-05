import { store } from '../core/store';
import { eventBus } from '../core/eventBus';

let audioCtx: AudioContext | null = null;
const bufferCache = new Map<string, AudioBuffer>();
let activeSourceNode: AudioBufferSourceNode | null = null;
let currentHtmlAudio: HTMLAudioElement | null = null;
let isAudioInited = false;
let isAudioUnlocked = false;

// AudioContext 안전 생성 및 반환
function getAudioContext(): AudioContext | null {
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

// 💡 Safari 및 모바일 호환 decodeAudioData 래퍼 (Promise & Callback 겸용)
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

// 💡 오디오 자원 프리패치 (Pre-warm & Buffer Cache)
export async function preloadAudioAssets(voiceType: 'male' | 'female' = 'male'): Promise<void> {
  const ctx = getAudioContext();
  if (!ctx) return;

  const folder = voiceType === 'male' ? 'male' : 'female';
  const prefix = voiceType === 'male' ? 'InJoon' : 'SunHi';

  // 자주 쓰이는 가벼운 사운드 샘플들 우선 워밍업
  const sampleLabels = ['1', '2', '3', '5', '10', 'A', 'B'];

  for (const label of sampleLabels) {
    const path = `/audio/${folder}/${prefix}_${label}.mp3`;
    if (bufferCache.has(path)) continue;

    try {
      const res = await fetch(path);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && !contentType.includes('text/html')) {
        const arrayBuffer = await res.arrayBuffer();
        const decoded = await decodeAudioDataSafely(ctx, arrayBuffer);
        bufferCache.set(path, decoded);
      }
    } catch {
      // ignore preload errors
    }
  }
}

// 💡 모바일 디바이스 오디오 세션 즉시 활성화 (Unmute / Warm-up / Resume)
export function unlockAudio(): void {
  if (typeof window === 'undefined') return;

  // 1. Web Audio API Context Resume & Silent Buffer Playback
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

  // 2. Web Speech API (SpeechSynthesis) Warm-up
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const dummyUtterance = new SpeechSynthesisUtterance(' ');
      dummyUtterance.volume = 0.001;
      dummyUtterance.rate = 2.0;
      window.speechSynthesis.speak(dummyUtterance);
    } catch {
      // ignore
    }
  }

  // 3. HTML5 Audio Element Session Unmute (iOS Safari / 카카오톡 인앱 브라우저 호환)
  try {
    const dummyAudio = new Audio();
    dummyAudio.volume = 0.001;
    // 0.01초 짜리 무음 base64 WAV 오디오
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

// 기존 재생 중인 소리 중단
export function stopAudio(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }

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

// SpeechSynthesis Fallback
const playSpeechFallback = (label: string, isAlphabet: boolean) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  stopAudio();

  const isNumber = /^\d+$/.test(label);
  const utterance = new SpeechSynthesisUtterance(label);
  utterance.lang = isAlphabet ? 'en-US' : 'ko-KR';
  utterance.rate = isNumber ? 0.85 : 0.9;
  utterance.pitch = isNumber ? 1.1 : 1.0;
  utterance.volume = 1.0;

  window.speechSynthesis.speak(utterance);
};

// HTML5 Audio Fallback
const playHtmlAudioFallback = (path: string, label: string, isAlphabet: boolean) => {
  stopAudio();
  const audio = new Audio(path);
  audio.volume = 1.0;
  currentHtmlAudio = audio;

  let hasFailed = false;
  audio.onerror = () => {
    if (!hasFailed) {
      hasFailed = true;
      playSpeechFallback(label, isAlphabet);
    }
  };

  const p = audio.play();
  if (p !== undefined) {
    p.catch(() => {
      if (!hasFailed) {
        hasFailed = true;
        playSpeechFallback(label, isAlphabet);
      }
    });
  }
};

// 메인 음성 출력 함수 (Web Audio API 2.5x 증폭 -> HTML5 Audio -> Web Speech API)
const playSound = async (label: string, voiceType: 'male' | 'female' | 'mute') => {
  if (voiceType === 'mute') {
    stopAudio();
    return;
  }

  stopAudio();

  // 아직 사용자 액션으로 오디오락이 풀리지 않은 경우 자동 언락 시도
  if (!isAudioUnlocked) {
    unlockAudio();
  }

  const folder = voiceType === 'male' ? 'male' : 'female';
  const prefix = voiceType === 'male' ? 'InJoon' : 'SunHi';
  const path = `/audio/${folder}/${prefix}_${label}.mp3`;
  const isAlphabet = /^[A-Z]$/i.test(label);
  const isNumber = /^\d+$/.test(label);

  const ctx = getAudioContext();

  // 1. Web Audio API로 정밀 재생
  if (ctx) {
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        // ignore
      }
    }

    try {
      let buffer = bufferCache.get(path);
      if (!buffer) {
        const res = await fetch(path);
        const contentType = res.headers.get('content-type') || '';
        if (!res.ok || contentType.includes('text/html')) {
          throw new Error(`Invalid audio response: ${res.status}`);
        }
        const arrayBuffer = await res.arrayBuffer();
        buffer = await decodeAudioDataSafely(ctx, arrayBuffer);
        bufferCache.set(path, buffer);
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      // 숫자 음성일 경우 2.5배 음량 증폭 GainNode 적용
      const gainNode = ctx.createGain();
      gainNode.gain.value = isNumber ? 2.5 : 1.2;

      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      activeSourceNode = source;
      source.start(0);
      return;
    } catch {
      // Web Audio 재생 실패 시 HTML5 Audio로 전이
    }
  }

  // 2. HTML5 Audio Fallback
  playHtmlAudioFallback(path, label, isAlphabet);
};

// 💡 웹 앱 초기화 시 오디오 엔진 준비 & 전역 첫 클릭/터치 언락 이벤트 바인딩
export const initAudio = () => {
  if (isAudioInited) return;
  isAudioInited = true;

  // 1. 미리 AudioContext 객체 준비 & 샘플 사운드 워밍업
  getAudioContext();
  preloadAudioAssets('male');

  // 2. 사용자가 화면 내 어디든 첫 터치/클릭하는 순간 오디오 세션 활성화
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

  // 3. 타이머 카운팅 이벤트 수신 시 음성 출력
  eventBus.on('TICK', (label: string) => {
    const state = store.getState();
    const voiceType = state.settings?.voiceType || 'male';
    playSound(label, voiceType);
  });

  eventBus.on('SESSION_END', () => {
    stopAudio();
  });
};
