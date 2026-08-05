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

  const handleStart = () => {
    unlockAudio();
    const state = store.getState();
    if (state.settings) {
      if (state.settings.voiceType !== 'mute') {
        prepareAudioForSession(state.settings.voiceType);
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

      {showSplash && !isRunning && !showQuiz && (
        <IntroSplashUI onEnter={() => setShowSplash(false)} />
      )}
      {!showSplash && !isRunning && !showQuiz && <SettingsUI onStart={handleStart} />}
      {showQuiz && <QuizUI onClose={() => setShowQuiz(false)} />}
      {isRunning && (
        <>
          <button
            className="absolute top-4 left-4 z-20 bg-black/40 hover:bg-black/60 text-white px-4 py-2 rounded-full backdrop-blur-md transition-colors border border-white/10"
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

