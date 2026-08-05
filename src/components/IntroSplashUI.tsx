import React, { useEffect } from 'react';
import { unlockAudio } from '../modules/audioEngine';

interface IntroSplashProps {
  onEnter: () => void;
}

export const IntroSplashUI: React.FC<IntroSplashProps> = ({ onEnter }) => {
  const handleAction = () => {
    unlockAudio();
    onEnter();
  };

  useEffect(() => {
    const handleKeyDown = () => {
      handleAction();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onEnter]);

  return (
    <div
      onClick={handleAction}
      className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-center bg-[#05030d]/40 backdrop-blur-sm text-white p-6 cursor-pointer select-none"
    >
      {/* 초화려 파스텔 무지개 빛 오로라 & 회전 3D 만다라 백그라운드 */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        {/* 무지개 3단 앰비언트 글로우 */}
        <div className="absolute w-[850px] h-[850px] rounded-full bg-gradient-to-r from-pink-500/30 via-amber-400/25 via-emerald-400/25 via-sky-400/25 to-purple-500/30 blur-3xl animate-pulse" />
        <div className="absolute w-[1050px] h-[1050px] rounded-full bg-gradient-to-tr from-purple-600/20 via-pink-500/20 to-sky-500/20 blur-3xl animate-[spin_30s_linear_infinite]" />

        {/* 1층 만다라 대형 벡터 서클 (무지개 그라데이션 적용) - 천천히 회전 */}
        <svg
          className="absolute w-[850px] h-[850px] opacity-70 animate-[spin_50s_linear_infinite]"
          viewBox="0 0 200 200"
          fill="none"
          strokeWidth="0.6"
        >
          <defs>
            <linearGradient id="rainbowGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f472b6" />
              <stop offset="25%" stopColor="#fcd34d" />
              <stop offset="50%" stopColor="#6ee7b7" />
              <stop offset="75%" stopColor="#7dd3fc" />
              <stop offset="100%" stopColor="#c084fc" />
            </linearGradient>
            <linearGradient id="rainbowGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="33%" stopColor="#7dd3fc" />
              <stop offset="66%" stopColor="#fcd34d" />
              <stop offset="100%" stopColor="#f472b6" />
            </linearGradient>
            <linearGradient id="rainbowGrad3" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6ee7b7" />
              <stop offset="50%" stopColor="#f472b6" />
              <stop offset="100%" stopColor="#fcd34d" />
            </linearGradient>
          </defs>

          <circle cx="100" cy="100" r="95" stroke="url(#rainbowGrad1)" strokeDasharray="2 2" />
          <circle cx="100" cy="100" r="80" stroke="url(#rainbowGrad2)" strokeDasharray="4 4" />
          <circle cx="100" cy="100" r="60" stroke="url(#rainbowGrad1)" />
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 100 100)`}>
              <path d="M100,10 C115,50 115,80 100,100 C85,80 85,50 100,10" stroke="url(#rainbowGrad1)" fill="url(#rainbowGrad3)" fillOpacity="0.1" />
              <circle cx="100" cy="25" r="3" fill="url(#rainbowGrad2)" />
            </g>
          ))}
        </svg>

        {/* 2층 만다라 중형 서클 (무지개 그라데이션) - 반시계방향 회전 */}
        <svg
          className="absolute w-[620px] h-[620px] opacity-75 animate-[spin_35s_linear_infinite_reverse]"
          viewBox="0 0 200 200"
          fill="none"
          strokeWidth="0.8"
        >
          <circle cx="100" cy="100" r="70" stroke="url(#rainbowGrad2)" strokeDasharray="3 3" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 100 100)`}>
              <path d="M100,30 C120,60 120,80 100,100 C80,80 80,60 100,30" stroke="url(#rainbowGrad3)" fill="url(#rainbowGrad1)" fillOpacity="0.12" />
            </g>
          ))}
        </svg>

        {/* 3층 중심 코어 만다라 서클 (무지개 그라데이션) - 빠른 회전 */}
        <svg
          className="absolute w-[400px] h-[400px] opacity-80 animate-[spin_20s_linear_infinite]"
          viewBox="0 0 200 200"
          fill="none"
          strokeWidth="1"
        >
          <polygon points="100,20 170,150 30,150" stroke="url(#rainbowGrad1)" strokeDasharray="2 2" />
          <polygon points="100,180 30,50 170,50" stroke="url(#rainbowGrad2)" strokeDasharray="2 2" />
        </svg>
      </div>

      {/* 중앙 투명 유리에 떠 있는 인트로 카드 */}
      <div className="relative z-10 bg-black/25 backdrop-blur-md border-2 border-white/30 p-8 sm:p-12 md:p-14 rounded-3xl shadow-[0_0_90px_rgba(236,72,153,0.35)] w-full max-w-2xl text-center transition-all transform hover:scale-[1.01]">
        {/* 타이틀: Thinking Meditation */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight mb-3 text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-amber-200 via-emerald-200 via-sky-200 to-purple-300 drop-shadow-[0_0_25px_rgba(244,114,182,0.4)]">
          Thinking Meditation
        </h1>

        {/* 서브 타이틀 */}
        <p className="text-sm sm:text-lg md:text-xl text-sky-200 font-bold mb-8 tracking-wide">
          집중력과 관조의 3D 생각 명상
        </p>

        {/* 핵심 안내 문구 (박스 없이 크고 시원하게) */}
        <p className="text-xl sm:text-2xl md:text-3xl font-black text-amber-200 flex items-center justify-center gap-2 sm:gap-3 leading-snug drop-shadow-md mb-10 text-center">
          <span className="text-2xl sm:text-3xl animate-bounce">💡</span>
          <span>명상시 나오는 알파벳 글자를 기억하세요.</span>
        </p>

        {/* 하단 아무 키나 누르세요 안내 뱃지 */}
        <div className="inline-flex items-center gap-2 bg-white/10 border border-white/30 px-6 py-3.5 rounded-full text-xs sm:text-sm font-extrabold text-pink-200 animate-pulse shadow-lg mb-4">
          <span>✨</span>
          <span>아무 키나 누르거나 화면을 터치하세요</span>
          <span>✨</span>
        </div>

        {/* 버전 및 업데이트 적용 확인용 태그 */}
        <div className="text-[11px] text-gray-300/80 font-mono tracking-wider bg-black/40 border border-white/10 px-3 py-1 rounded-md inline-block">
          v2.5 Audio Sprite (Howler.js + PCM Precise Sync Applied)
        </div>
      </div>
    </div>
  );
};
