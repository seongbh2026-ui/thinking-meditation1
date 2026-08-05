import { store } from '../core/store';
import { eventBus } from '../core/eventBus';

let audioCtx: AudioContext | null = null;
const bufferCache = new Map<string, AudioBuffer>();
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

// Safari 및 모바일 호환 decodeAudioData 래퍼 (Promise & Callback 겸용)
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

// 💡 서버로부터 핵심 MP3 오디오 리소스 사전 로딩 & 캐싱 (최우선 MP3 출력 보장)
export async function preloadAudioAssets(voiceType: 'male' | 'female' = 'male', forceRefresh = false): Promise<void> {
  const ctx = getAudioContext();
  if (!ctx) return;

  const folder = voiceType === 'male' ? 'male' : 'female';
  const prefix = voiceType === 'male' ? 'InJoon' : 'SunHi';

  // 1초~30초 및 40~100, 알파벳 등 핵심 카운팅 MP3 음성 사전 프리패치
  const sampleLabels: string[] = [];
  for (let i = 1; i <= 30; i++) sampleLabels.push(String(i));
  sampleLabels.push('40', '50', '60', '70', '80', '90', '100', 'A', 'B', 'C', 'D', 'E');

  await Promise.allSettled(
    sampleLabels.map(async (label) => {
      const path = `/audio/${folder}/${prefix}_${label}.mp3`;
      if (!forceRefresh && bufferCache.has(path)) return;

      try {
        const fetchOptions: RequestInit = forceRefresh ? { cache: 'reload' } : {};
        const res = await fetch(path, fetchOptions);
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && !contentType.includes('text/html')) {
          const arrayBuffer = await res.arrayBuffer();
          const decoded = await decodeAudioDataSafely(ctx, arrayBuffer);
          bufferCache.set(path, decoded);
        }
      } catch {
        // ignore preload error
      }
    })
  );
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

// 💡 명상 프로그램 실행 시 오디오 엔진 전면 재초기화 및 서버 동기화
export function prepareAudioForSession(voiceType: 'male' | 'female' = 'male'): void {
  // 1. 오디오 세션 언락
  unlockAudio();

  // 2. AudioContext 재개
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  // 3. MP3 음성 파일 서버로부터 새로 백그라운드 프리패치
  preloadAudioAssets(voiceType, true);
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

// 💡 최후의 보루: Web Speech API (MP3 오디오 파일이 전혀 응답하지 않을 때만 극단적 Fallback)
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

// 💡 HTML5 Audio MP3 재생 (2차 최우선 수단 - MP3 재생 실패 시 1회 재시도 후 최후에만 SpeechSynthesis로 전이)
const playHtmlAudioFallback = (path: string, label: string, isAlphabet: boolean) => {
  stopAudio();
  const audio = new Audio(path);
  audio.volume = 1.0;
  currentHtmlAudio = audio;

  let retryAttempted = false;

  const handleFailure = () => {
    if (!retryAttempted) {
      retryAttempted = true;
      // MP3 파일 재생 1회 재시도
      try {
        audio.load();
        const pRetry = audio.play();
        if (pRetry !== undefined) {
          pRetry.catch(() => {
            // 정 안될 때만 최후의 보루로 음성 생성(Web Speech API) 호출
            playSpeechFallback(label, isAlphabet);
          });
        }
      } catch {
        playSpeechFallback(label, isAlphabet);
      }
    } else {
      playSpeechFallback(label, isAlphabet);
    }
  };

  audio.onerror = handleFailure;

  const p = audio.play();
  if (p !== undefined) {
    p.catch(handleFailure);
  }
};

// 💡 메인 음성 출력 함수 (MP3 파일 재생이 무조건 1~2순위 최우선)
// [1순위] Web Audio API + GainNode(2.5x 증폭) MP3 재생
// [2순위] HTML5 Audio element MP3 재생 (재시도 포함)
// [3순위 (최후의 보루)] Web Speech API (MP3 파일 재생 불가능 시)
const playSound = async (label: string, voiceType: 'male' | 'female' | 'mute') => {
  if (voiceType === 'mute') {
    stopAudio();
    return;
  }

  stopAudio();

  // 사용자 터치/클릭 오디오락 자동 언락 시도
  if (!isAudioUnlocked) {
    unlockAudio();
  }

  const folder = voiceType === 'male' ? 'male' : 'female';
  const prefix = voiceType === 'male' ? 'InJoon' : 'SunHi';
  const path = `/audio/${folder}/${prefix}_${label}.mp3`;
  const isAlphabet = /^[A-Z]$/i.test(label);
  const isNumber = /^\d+$/.test(label);

  const ctx = getAudioContext();

  // [1순위] Web Audio API를 통한 MP3 오디오 버퍼 정밀 재생
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
      return; // 1순위 MP3 재생 성공 시 즉시 종료
    } catch {
      // Web Audio 재생 실패 시 2순위 HTML5 Audio MP3 재생으로 이동
    }
  }

  // [2순위] HTML5 Audio MP3 파일 재생 (실패 시 1회 reload 후 재생 시도, 최후에만 SpeechSynthesis전이)
  playHtmlAudioFallback(path, label, isAlphabet);
};

// 웹 앱 초기화 시 오디오 엔진 준비 & 전역 이벤트 바인딩
export const initAudio = () => {
  if (isAudioInited) return;
  isAudioInited = true;

  // 1. AudioContext 객체 미리 할당 및 MP3 샘플 사전 로딩
  getAudioContext();
  preloadAudioAssets('male');

  // 2. 화면 터치/클릭 시 오디오 세션 언락
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

  // 3. 타이머 카운팅 이벤트 발생 시 MP3 최우선 출력
  eventBus.on('TICK', (label: string) => {
    const state = store.getState();
    const voiceType = state.settings?.voiceType || 'male';
    playSound(label, voiceType);
  });

  eventBus.on('SESSION_END', () => {
    stopAudio();
  });
};
