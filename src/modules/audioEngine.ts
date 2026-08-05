import { Howl, Howler } from 'howler';
import { store } from '../core/store';
import { eventBus } from '../core/eventBus';

let maleHowl: Howl | null = null;
let femaleHowl: Howl | null = null;
let isAudioUnlocked = false;

// Howler 오디오 컨텍스트 언락 (모바일 / 시크릿모드 대응)
export function unlockAudio(): void {
  if (typeof window === 'undefined') return;
  try {
    if (Howler.ctx && Howler.ctx.state === 'suspended') {
      Howler.ctx.resume().catch(() => {});
    }
    // 더미 재생으로 사용자 인터랙션 권한 획득 확인
    const silentAudio = new Audio();
    silentAudio.volume = 0.001;
    silentAudio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
    silentAudio.play().then(() => silentAudio.pause()).catch(() => {});
  } catch {
    // ignore
  }
  isAudioUnlocked = true;
}

// Audio Sprite 파일 및 JSON 사전 로딩
export async function preloadAudioAssets(voiceType: 'male' | 'female' = 'male'): Promise<void> {
  unlockAudio();

  return new Promise((resolve) => {
    if (voiceType === 'male') {
      if (maleHowl) {
        resolve();
        return;
      }
      fetch('/audio/male_sprite.json')
        .then((res) => res.json())
        .then((sprite) => {
          maleHowl = new Howl({
            src: ['/audio/male_sprite.mp3'],
            sprite: sprite,
            html5: false,
            preload: true,
            onload: () => resolve(),
            onloaderror: () => resolve(),
          });
        })
        .catch(() => resolve());
    } else {
      if (femaleHowl) {
        resolve();
        return;
      }
      fetch('/audio/female_sprite.json')
        .then((res) => res.json())
        .then((sprite) => {
          femaleHowl = new Howl({
            src: ['/audio/female_sprite.mp3'],
            sprite: sprite,
            html5: false,
            preload: true,
            onload: () => resolve(),
            onloaderror: () => resolve(),
          });
        })
        .catch(() => resolve());
    }
  });
}

// 세션 시작 전 오디오 준비
export async function prepareAudioForSession(voiceType: 'male' | 'female' = 'male'): Promise<void> {
  unlockAudio();
  await preloadAudioAssets(voiceType);
}

// 오디오 중단
export function stopAudio(): void {
  if (maleHowl) maleHowl.stop();
  if (femaleHowl) femaleHowl.stop();
  try {
    Howler.stop();
  } catch {
    // ignore
  }
}

// Howler.js Audio Sprite를 이용한 사운드 재생 (지연 없는 즉각 반응)
export function playSound(label: string, voiceType: 'male' | 'female' | 'mute'): void {
  if (voiceType === 'mute') {
    stopAudio();
    return;
  }

  stopAudio();
  unlockAudio();

  const howlInstance = voiceType === 'male' ? maleHowl : femaleHowl;
  const isNumber = /^\d+$/.test(label);
  const volume = isNumber ? 1.0 : 0.9;

  if (howlInstance) {
    try {
      const soundId = howlInstance.play(label);
      howlInstance.volume(volume, soundId);
    } catch (err) {
      console.warn('[AudioSprite Play Error]:', err);
    }
  } else {
    // 아직 로드되지 않은 경우 로드 후 재생
    preloadAudioAssets(voiceType).then(() => {
      const inst = voiceType === 'male' ? maleHowl : femaleHowl;
      if (inst) {
        try {
          const soundId = inst.play(label);
          inst.volume(volume, soundId);
        } catch {
          // ignore
        }
      }
    });
  }
}

let isAudioInited = false;
export const initAudio = () => {
  if (isAudioInited) return;
  isAudioInited = true;

  unlockAudio();
  preloadAudioAssets('male');
  preloadAudioAssets('female');

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
