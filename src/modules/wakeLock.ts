// Screen Wake Lock API 및 Mobile Screen Lock 방지 유틸리티

let wakeLockSentinel: WakeLockSentinel | null = null;
let silentVideoEl: HTMLVideoElement | null = null;

// 모바일 웹 Fallback용 무음 비디오 엘리먼트 생성 (Wake Lock API 미지원 환경 대비)
function ensureSilentVideo() {
  if (typeof document === 'undefined') return;
  if (!silentVideoEl) {
    const video = document.createElement('video');
    video.setAttribute('playsinline', '');
    video.setAttribute('muted', '');
    video.setAttribute('loop', '');
    video.style.position = 'fixed';
    video.style.top = '-9999px';
    video.style.left = '-9999px';
    video.style.width = '1px';
    video.style.height = '1px';
    video.style.opacity = '0';
    video.style.pointerEvents = 'none';

    // 1 pixel silent base64 MP4
    video.src =
      'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAA1tZGF0AAAAGGF2Y0MBAR4AHP/hAAR348pQAAAAABdtZGF0';

    document.body.appendChild(video);
    silentVideoEl = video;
  }
}

export async function requestWakeLock(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  let success = false;

  // 1. Screen Wake Lock API 시도
  if ('wakeLock' in navigator && navigator.wakeLock) {
    try {
      if (wakeLockSentinel) {
        await wakeLockSentinel.release();
        wakeLockSentinel = null;
      }
      wakeLockSentinel = await navigator.wakeLock.request('screen');
      wakeLockSentinel.addEventListener('release', () => {
        wakeLockSentinel = null;
      });
      success = true;
    } catch {
      // Screen WakeLock이 permissions policy 등에 의해 제한되면 무음 비디오 Fallback으로 자연스럽게 전환
    }
  }

  // 2. Fallback: 무음 비디오 재성 (iOS / WakeLock 미지원 브라우저용)
  try {
    ensureSilentVideo();
    if (silentVideoEl) {
      silentVideoEl.muted = true;
      const playPromise = silentVideoEl.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
    }
  } catch {
    // 무음 비디오 자동재생 제한 무시
  }

  return success;
}

export async function releaseWakeLock(): Promise<void> {
  if (wakeLockSentinel) {
    try {
      await wakeLockSentinel.release();
    } catch (err) {
      console.warn('[WakeLock] Error releasing wake lock:', err);
    }
    wakeLockSentinel = null;
  }

  if (silentVideoEl) {
    try {
      silentVideoEl.pause();
    } catch {
      // ignore
    }
  }
  console.log('[WakeLock] Released.');
}
