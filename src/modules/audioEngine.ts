import { store } from '../core/store';
import { eventBus } from '../core/eventBus';

let currentAudio: HTMLAudioElement | null = null;
let currentPlayPromise: Promise<void> | null = null;
let isAudioInited = false;

const cancelSpeech = () => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};

export const stopAudio = () => {
  cancelSpeech();
  if (currentAudio) {
    const audioToStop = currentAudio;
    currentAudio = null;
    if (currentPlayPromise) {
      currentPlayPromise
        .then(() => {
          audioToStop.pause();
          audioToStop.currentTime = 0;
        })
        .catch(() => {
          // Ignore interruption errors
        });
    } else {
      audioToStop.pause();
      audioToStop.currentTime = 0;
    }
  }
};

let audioCtx: AudioContext | null = null;

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

const playSpeechFallback = (label: string, isAlphabet: boolean) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  cancelSpeech();

  const isNumber = /^\d+$/.test(label);
  const utterance = new SpeechSynthesisUtterance(label);
  utterance.lang = isAlphabet ? 'en-US' : 'ko-KR';
  utterance.rate = isNumber ? 0.85 : 0.9;
  utterance.pitch = isNumber ? 1.1 : 1.0;
  utterance.volume = 1.0;

  window.speechSynthesis.speak(utterance);
};

export const initAudio = () => {
  if (isAudioInited) return;
  isAudioInited = true;

  eventBus.on('TICK', async (label: string) => {
    const state = store.getState();
    const voiceType = state.settings?.voiceType;

    if (!voiceType || voiceType === 'mute') {
      stopAudio();
      return;
    }

    stopAudio();

    const folder = voiceType === 'male' ? 'male' : 'female';
    const prefix = voiceType === 'male' ? 'InJoon' : 'SunHi';
    const path = `/audio/${folder}/${prefix}_${label}.mp3`;
    const isAlphabet = /^[A-Z]$/i.test(label);
    const isNumber = /^\d+$/.test(label);

    const audio = new Audio(path);
    audio.volume = 1.0;

    // Web Audio API를 활용하여 숫자 음량 크게 (Gain 2.5배) 증폭
    try {
      const ctx = getAudioContext();
      if (ctx) {
        const source = ctx.createMediaElementSource(audio);
        const gainNode = ctx.createGain();
        gainNode.gain.value = isNumber ? 2.5 : 1.2;
        source.connect(gainNode);
        gainNode.connect(ctx.destination);
      }
    } catch {
      // AudioContext 연동 실패 시 기본 Audio 객체로 정상 재생
    }

    let hasFailed = false;

    audio.onerror = () => {
      if (!hasFailed) {
        hasFailed = true;
        playSpeechFallback(label, isAlphabet);
      }
    };

    currentAudio = audio;

    try {
      currentPlayPromise = audio.play();
      await currentPlayPromise;
      currentPlayPromise = null;
    } catch {
      currentPlayPromise = null;
      if (!hasFailed) {
        hasFailed = true;
        playSpeechFallback(label, isAlphabet);
      }
    }
  });

  eventBus.on('SESSION_END', () => {
    stopAudio();
  });
};


