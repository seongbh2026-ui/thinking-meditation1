import React, { useState } from 'react';
import { store } from '../core/store';
import { prepareAudioForSession, unlockAudio } from '../modules/audioEngine';

export const SettingsUI: React.FC<{ onStart: () => void }> = ({ onStart }) => {
  const [name, setName] = useState('');
  const [duration, setDuration] = useState(2);
  const [intervalSeconds, setIntervalSeconds] = useState(5);
  const [voiceType, setVoiceType] = useState<'male' | 'female' | 'mute'>('male');
  const [sceneId, setSceneId] = useState(1);

  const start = () => {
    unlockAudio();
    if (voiceType !== 'mute') {
      prepareAudioForSession(voiceType);
    }
    store.setState(() => ({
      settings: { name, durationMinutes: duration, intervalSeconds, voiceType, sceneId },
      isRunning: true,
    }));
    onStart();
  };

  return (
    <div className="relative w-full h-screen overflow-hidden flex items-center justify-center bg-[#070512] text-white p-3 sm:p-6 select-none">
      {/* 백그라운드 파스텔 무지개 오로라 & 회전 만다라 아우라 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        {/* 파스텔 무지개 오로라 Halo */}
        <div className="absolute w-[550px] h-[550px] sm:w-[700px] sm:h-[700px] rounded-full bg-gradient-to-r from-pink-500/15 via-amber-400/15 via-emerald-400/15 via-sky-400/15 to-purple-500/15 blur-3xl animate-pulse" />
        <div className="absolute w-[750px] h-[750px] sm:w-[900px] sm:h-[900px] rounded-full bg-gradient-to-tr from-purple-600/10 via-pink-500/10 to-sky-500/10 blur-2xl" />

        {/* 1층 만다라 백그라운드 벡터 서클 - 시계방향 천천히 회전 */}
        <svg
          className="absolute w-[650px] h-[650px] sm:w-[780px] sm:h-[780px] opacity-20 text-pink-200 animate-[spin_60s_linear_infinite]"
          viewBox="0 0 200 200"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
        >
          <circle cx="100" cy="100" r="90" strokeDasharray="2 2" />
          <circle cx="100" cy="100" r="75" />
          <circle cx="100" cy="100" r="50" strokeDasharray="4 2" />
          <circle cx="100" cy="100" r="25" />
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 100 100)`}>
              <path d="M100,10 C110,40 110,60 100,100 C90,60 90,40 100,10" />
              <circle cx="100" cy="20" r="3" fill="currentColor" />
            </g>
          ))}
        </svg>

        {/* 2층 만다라 백그라운드 서클 - 반시계방향 회전 */}
        <svg
          className="absolute w-[450px] h-[450px] sm:w-[560px] sm:h-[560px] opacity-20 text-sky-200 animate-[spin_40s_linear_infinite_reverse]"
          viewBox="0 0 200 200"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
        >
          <circle cx="100" cy="100" r="65" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 100 100)`}>
              <polygon points="100,35 112,65 100,95 88,65" fill="none" stroke="currentColor" strokeWidth="0.4" />
            </g>
          ))}
        </svg>
      </div>

      {/* 설정 모달 카드 - 위아래 화면 높이(Viewport)를 충분히 활용하여 꽉 차고 밸런스 있는 수직 배치 연출 */}
      <div className="relative z-10 bg-black/50 backdrop-blur-2xl border-2 border-white/30 p-5 sm:p-7 md:p-8 rounded-3xl shadow-[0_0_80px_rgba(236,72,153,0.35)] w-full max-w-lg h-full max-h-[96vh] sm:max-h-[94vh] flex flex-col justify-between overflow-y-auto">
        <div className="text-center mb-1 sm:mb-2">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-amber-200 via-emerald-200 via-sky-200 to-purple-300 drop-shadow-sm">
            Thinking Meditation
          </h1>
          <p className="text-xs sm:text-sm text-sky-200 mt-1 font-medium">집중력과 관조의 3D 생각 명상</p>
        </div>

        {/* 안내 메시지 뱃지 */}
        <div className="flex justify-center my-1.5 sm:my-2">
          <p className="inline-flex items-center gap-1.5 text-amber-200 text-xs sm:text-sm font-extrabold text-center bg-amber-400/15 border border-amber-300/30 px-3.5 py-1.5 rounded-full shadow-sm">
            <span className="text-sm sm:text-base animate-bounce">💡</span>
            <span>명상시 나오는 알파벳 글자를 기억하세요.</span>
          </p>
        </div>

        <div className="flex-1 flex flex-col justify-evenly py-1 space-y-3 sm:space-y-4">
          {/* 이름 입력 */}
          <div className="flex items-center gap-3">
            <label className="text-xs sm:text-sm font-extrabold text-pink-200 whitespace-nowrap min-w-[45px]">
              이름
            </label>
            <input
              className="flex-1 bg-black/40 border border-white/35 focus:border-pink-300 focus:ring-2 focus:ring-pink-300/40 p-2.5 sm:p-3 rounded-xl focus:outline-none text-white text-xs sm:text-sm font-bold placeholder-gray-400 transition-all shadow-inner"
              placeholder="이름을 입력하세요"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <div className="flex justify-between text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-200 mb-1.5">
              <span>명상 시간 (2분 ~ 60분)</span>
              <span className="text-amber-300 font-extrabold text-sm sm:text-base">{duration}분</span>
            </div>
            <input
              type="range"
              min="2"
              max="60"
              value={duration}
              className="w-full accent-amber-300 cursor-pointer h-2.5 bg-white/20 rounded-lg appearance-none border border-white/30"
              onChange={(e) => setDuration(parseInt(e.target.value) || 2)}
            />
          </div>

          <div>
            <div className="flex justify-between text-xs sm:text-sm font-bold uppercase tracking-wider text-pink-200 mb-1.5">
              <span>카운팅 간격 (5초 ~ 15초)</span>
              <span className="text-pink-300 font-extrabold text-sm sm:text-base">{intervalSeconds}초</span>
            </div>
            <input
              type="range"
              min="5"
              max="15"
              step="1"
              value={intervalSeconds}
              className="w-full accent-pink-300 cursor-pointer h-2.5 bg-white/20 rounded-lg appearance-none border border-white/30"
              onChange={(e) => setIntervalSeconds(parseInt(e.target.value) || 5)}
            />
            <div className="grid grid-cols-5 gap-1.5 mt-2">
              {[5, 7, 10, 12, 15].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  className={`py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    intervalSeconds === sec
                      ? 'bg-pink-300 text-slate-900 font-extrabold shadow-sm'
                      : 'bg-black/30 border border-white/20 text-pink-100 hover:bg-white/10'
                  }`}
                  onClick={() => setIntervalSeconds(sec)}
                >
                  {sec}초
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-200 mb-1.5">
              음성 선택
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {(['male', 'female', 'mute'] as const).map((v) => (
                <button
                  key={v}
                  className={`py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                    voiceType === v
                      ? 'bg-gradient-to-r from-emerald-300 to-sky-300 text-slate-900 border-2 border-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.5)] scale-[1.01]'
                      : 'bg-black/30 border border-white/35 text-white hover:border-white/60 hover:bg-white/10'
                  }`}
                  onClick={() => setVoiceType(v)}
                >
                  {v === 'male' ? '남성' : v === 'female' ? '여성' : '무음'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-sky-200 mb-1.5">
              배경 선택
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[
                { id: 1, name: '만다라' },
                { id: 2, name: '지구' },
                { id: 3, name: '연꽃' },
                { id: 4, name: '선인장' },
                { id: 5, name: '튜브' },
                { id: 6, name: '없음' },
              ].map((s) => (
                <button
                  key={s.id}
                  className={`py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    sceneId === s.id
                      ? 'bg-gradient-to-r from-sky-300 to-purple-300 text-slate-900 border-2 border-sky-300 shadow-[0_0_12px_rgba(125,211,252,0.5)] scale-[1.01]'
                      : 'bg-black/30 border border-white/35 text-white hover:border-white/60 hover:bg-white/10'
                  }`}
                  onClick={() => setSceneId(s.id)}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          className="w-full mt-2 bg-gradient-to-r from-pink-300 via-amber-200 via-emerald-200 to-sky-300 text-slate-900 font-black text-base sm:text-lg py-3 sm:py-3.5 rounded-2xl shadow-xl shadow-pink-500/25 hover:brightness-110 active:scale-[0.99] border-2 border-white/40 transition-all cursor-pointer"
          onClick={start}
        >
          명상 시작하기
        </button>
      </div>
    </div>
  );
};


