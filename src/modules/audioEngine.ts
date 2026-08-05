import { store } from '../core/store';
import { eventBus } from '../core/eventBus';

let audioCtx: AudioContext | null = null;
const bufferCache = new Map<string, AudioBuffer>();
let activeSourceNode: AudioBufferSourceNode | null = null;
let currentHtmlAudio: HTMLAudioElement | null = null;
let isAudioInited = false;

// AudioContext 반환 및 생성
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
      // ArrayBuffer 복사본을 생성하여 detachment 문제 방지
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

// 💡 모바일 브라우저 오디오 오토플레이 및 스피커 잠금 해제 (User Gesture에서 호출 필수)
export function unlockAudio(): void {
  if (typeof window === 'undefined') return;

  // 1. Web Audio Context Unlock
  const ctx = getAudioContext();
  if (ctx) {
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    // 0.001초 무음 버퍼 구동으로 iOS/Android 오디오 드라이버 언락
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

  // 2. SpeechSynthesis (TTS) Engine Unlock
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const dummyUtterance = new SpeechSynthesisUtterance('');
      dummyUtterance.volume = 0;
      window.speechSynthesis.speak(dummyUtterance);
    } catch {
      // ignore
    }
  }

  // 3. HTML5 Audio Element Unlock
  try {
    const dummyAudio = new Audio();
    dummyAudio.volume = 0.01;
    dummyAudio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
    const p = dummyAudio.play();
    if (p !== undefined) {
      p.then(() => {
        dummyAudio.pause();
      }).catch(() => {});
    }
  } catch {
    // ignore
  }
}

// 기존 재생 중인 소리 즉시 중단
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

// SpeechSynthesis Fallback (모든 오디오 파일 실패 시 최종 보장)
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

// HTML5 Audio Fallback 재생
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

// 메인 사운드 재생 로직 (Web Audio API 우선 -> HTML5 Audio -> SpeechSynthesis)
const playSound = async (label: string, voiceType: 'male' | 'female' | 'mute') => {
  if (voiceType === 'mute') {
    stopAudio();
    return;
  }

  stopAudio();

  const folder = voiceType === 'male' ? 'male' : 'female';
  const prefix = voiceType === 'male' ? 'InJoon' : 'SunHi';
  const path = `/audio/${folder}/${prefix}_${label}.mp3`;
  const isAlphabet = /^[A-Z]$/i.test(label);
  const isNumber = /^\d+$/.test(label);

  const ctx = getAudioContext();

  // 1. Web Audio API로 원활하게 재생 시도
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
        // HTML SPA 404 페이지 응답인 경우 예외 발생시켜 HTML5 Audio/TTS Fallback으로 전달
        if (!res.ok || contentType.includes('text/html')) {
          throw new Error(`Invalid audio response: ${res.status}`);
        }
        const arrayBuffer = await res.arrayBuffer();
        buffer = await decodeAudioDataSafely(ctx, arrayBuffer);
        bufferCache.set(path, buffer);
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      // 숫자일 경우 2.5배 음량 증폭 GainNode 연결
      const gainNode = ctx.createGain();
      gainNode.gain.value = isNumber ? 2.5 : 1.2;

      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      activeSourceNode = source;
      source.start(0);
      return;
    } catch {
      // Web Audio API 디코딩/패치 실패 시 콘솔에 노란 경고창 대신 즉시 HTML5 Audio Fallback으로 전환
    }
  }

  // 2. Web Audio API 실패 시 HTML5 Audio Fallback
  playHtmlAudioFallback(path, label, isAlphabet);
};

export const initAudio = () => {
  if (isAudioInited) return;
  isAudioInited = true;

  eventBus.on('TICK', (label: string) => {
    const state = store.getState();
    const voiceType = state.settings?.voiceType || 'male';
    playSound(label, voiceType);
  });

  eventBus.on('SESSION_END', () => {
    stopAudio();
  });
};
