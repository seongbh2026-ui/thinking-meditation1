import { store } from '../core/store';
import { eventBus } from '../core/eventBus';

let audioCtx: AudioContext | null = null;
const htmlAudioCache = new Map<string, HTMLAudioElement>();
let currentHtmlAudio: HTMLAudioElement | null = null;
let isAudioUnlocked = false;

// AudioContext 안전 생성
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

// 💡 모바일 및 시크릿모드 오디오 자동재생 제한 우회 핵심: 사용자 인터랙션 직후 호출
export function unlockAudio(): void {
  if (typeof window === 'undefined') return;

  // 1. Web Audio Context 활성화 시도
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  // 2. HTML5 Audio Dummy 재생으로 모바일/시크릿모드 오디오 세션 즉시 권한 획득
  try {
    const dummy = new Audio();
    dummy.volume = 0.01;
    dummy.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
    const p = dummy.play();
    if (p !== undefined) {
      p.then(() => {
        dummy.pause();
      }).catch(() => {});
    }
  } catch {
    // ignore
  }

  isAudioUnlocked = true;
}

// 💡 모든 오디오 파일 미리 로드 (캐시 구축)
export function preloadAudioAssets(voiceType: 'male' | 'female' = 'male'): void {
  if (typeof window === 'undefined') return;
  const folder = voiceType === 'male' ? 'male' : 'female';
  const prefix = voiceType === 'male' ? 'InJoon' : 'SunHi';

  const labels: string[] = [];
  for (let i = 1; i <= 100; i++) labels.push(String(i));
  ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'].forEach(l => labels.push(l));

  labels.forEach((label) => {
    const path = `/audio/${folder}/${prefix}_${label}.mp3`;
    if (!htmlAudioCache.has(path)) {
      const audio = new Audio(path);
      audio.preload = 'auto';
      audio.load();
      htmlAudioCache.set(path, audio);
    }
  });
}

// 명상 시작 전 오디오 준비
export async function prepareAudioForSession(voiceType: 'male' | 'female' = 'male'): Promise<void> {
  unlockAudio();
  preloadAudioAssets(voiceType);
}

// 재생 중인 오디오 중단
export function stopAudio(): void {
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

// 💡 모바일 및 시크릿모드 100% 호환 메인 사운드 재생 함수 (HTMLAudioElement 직접 재생 방식)
export function playSound(label: string, voiceType: 'male' | 'female' | 'mute'): void {
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

  // 캐시된 오디오 객체 가져오기 또는 새로 생성
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
      // 브라우저 정책(시크릿모드 등)으로 차단된 경우 신규 Audio 인스턴스로 즉시 강제 재생 시도
      try {
        const fallback = new Audio(path + `?t=${Date.now()}`);
        fallback.volume = 1.0;
        currentHtmlAudio = fallback;
        fallback.play().catch((err) => {
          console.warn('[Audio Playback Blocked/Failed]', err);
        });
      } catch {
        // ignore
      }
    });
  }
}

// 앱 초기화 바인딩
let isAudioInited = false;
export const initAudio = () => {
  if (isAudioInited) return;
  isAudioInited = true;

  unlockAudio();
  preloadAudioAssets('male');

  const handleInteraction = () => {
    unlockAudio();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('pointerdown', handleInteraction, { once: true });
    window.addEventListener('touchstart', handleInteraction, { once: true });
    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('keydown', handleInteraction, { once: true });
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
