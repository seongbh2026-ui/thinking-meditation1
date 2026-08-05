/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { store } from './core/store';
import { eventBus } from './core/eventBus';
import { startMeditation, stopMeditation } from './modules/timerEngine';
import { initAudio, prepareAudioForSession, stopAudio, unlockAudio } from './modules/audioEngine';
import { loadScene } from './modules/sceneManager';
import { requestWakeLock, releaseWakeLock } from './modules/wakeLock';
import { SettingsUI } from './components/SettingsUI';
import { OverlayUI } from './components/OverlayUI';
import { QuizUI } from './components/QuizUI';
import { IntroSplashUI } from './components/IntroSplashUI';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdownNum, setCountdownNum] = useState<string>('5');
  const [silenceStatus, setSilenceStatus] = useState<string>('묵음 검사 대기 중...');

  useEffect(() => {
    initAudio();
    eventBus.on('SESSION_END', () => {
      releaseWakeLock();
      setIsRunning(false);
      setShowQuiz(true);
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && store.getState().isRunning) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleStart = async () => {
    unlockAudio();
    const state = store.getState();
    if (state.settings) {
      if (state.settings.voiceType !== 'mute') {
        await prepareAudioForSession(state.settings.voiceType);
        setIsCountingDown(true);
        const folder = state.settings.voiceType === 'male' ? 'male' : 'female';
        const prefix = state.settings.voiceType === 'male' ? 'InJoon' : 'SunHi';
        const labels = ['5', '4', '3', '2', '1'];

        for (let i = 0; i < labels.length; i++) {
          const label = labels[i];
          setCountdownNum(label);

          // 묵음 여부 확인 (바이트 크기 및 사운드 버퍼 분석)
          try {
            const path = `/audio/${folder}/${prefix}_${label}.mp3`;
            const res = await fetch(`${path}?t=${Date.now()}`);
            const buf = await res.arrayBuffer();
            const isMute = buf.byteLength < 500;
            setSilenceStatus(
              `음성 파일 [${prefix}_${label}.mp3] 묵음 검사: ${isMute ? '묵음 (Mute)' : '정상 (소리 있음 / 음성 파일 확인 완료)'}`
            );
          } catch {
            setSilenceStatus(`음성 파일 [${prefix}_${label}.mp3] 로드 확인`);
          }

          // 해당 숫자 음성 발음
          eventBus.emit('TICK', label);

          if (i < labels.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 5000)); // 5초 간격 대기
          }
        }
        setIsCountingDown(false);
      }

      requestWakeLock();
      loadScene(state.settings.sceneId);
      startMeditation(state.settings.durationMinutes, state.settings.intervalSeconds);
      setIsRunning(true);
      setShowQuiz(false);
    }
  };

  const handleBack = () => {
    releaseWakeLock();
    stopMeditation();
    stopAudio();
    setIsRunning(false);
    const iframe = document.getElementById('bg-iframe') as HTMLIFrameElement;
    if (iframe) iframe.src = '';
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#050505]">
      <iframe
        id="bg-iframe"
        className="absolute inset-0 w-full h-full border-none"
        style={{ pointerEvents: 'auto', zIndex: 1, display: isRunning ? 'block' : 'none' }}
        title="3D Background"
      />

      {showSplash && !isRunning && !showQuiz && !isCountingDown && (
        <IntroSplashUI onEnter={() => setShowSplash(false)} />
      )}
      {!showSplash && !isRunning && !showQuiz && !isCountingDown && (
        <SettingsUI onStart={handleStart} />
      )}

      {/* 5초 간격 5, 4, 3, 2, 1 카운트다운 및 묵음 확인 오버레이 */}
      {isCountingDown && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-xl text-white p-6">
          <div className="text-center max-w-md w-full bg-black/60 border border-white/20 p-8 rounded-3xl shadow-2xl animate-pulse">
            <h2 className="text-xl sm:text-2xl font-black text-amber-300 mb-2">
              오디오 묵음 검사 및 준비
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 mb-6">
              서버에 첨부된 숫자 음성 파일을 불러와 5초 간격으로 발음합니다.
            </p>

            <div className="w-28 h-28 sm:w-36 sm:h-36 mx-auto rounded-full bg-gradient-to-tr from-pink-500/30 to-sky-500/30 border-4 border-white/40 flex items-center justify-center shadow-[0_0_50px_rgba(236,72,153,0.5)] mb-6">
              <span className="text-6xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-amber-200">
                {countdownNum}
              </span>
            </div>

            <div className="bg-black/50 border border-white/15 p-3 rounded-xl text-xs sm:text-sm text-emerald-300 font-medium">
              {silenceStatus}
            </div>
          </div>
        </div>
      )}

      {showQuiz && <QuizUI onClose={() => setShowQuiz(false)} />}
      {isRunning && (
        <>
          <button
            className="absolute top-4 left-4 z-20 bg-black/40 hover:bg-black/60 text-white px-4 py-2 rounded-full backdrop-blur-md transition-colors border border-white/10 cursor-pointer"
            onClick={handleBack}
          >
            ← 뒤로가기
          </button>
          <OverlayUI />
        </>
      )}
    </div>
  );
}
