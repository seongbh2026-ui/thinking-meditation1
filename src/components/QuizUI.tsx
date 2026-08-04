import React, { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { store } from '../core/store';
import { validateQuiz } from '../modules/quizModule';

// 한글 자모음 및 두벌식 키보드 위치별 영문 대문자 매핑 테이블
const korToEngMap: Record<string, string> = {
  'ㄱ': 'R', 'ㄲ': 'R', 'ㄴ': 'S', 'ㄷ': 'E', 'ㄸ': 'E', 'ㄹ': 'F', 'ㅁ': 'A', 'ㅂ': 'Q', 'ㅃ': 'Q',
  'ㅅ': 'T', 'ㅆ': 'T', 'ㅇ': 'D', 'ㅈ': 'W', 'ㅉ': 'W', 'ㅊ': 'C', 'ㅋ': 'Z', 'ㅌ': 'X', 'ㅍ': 'V', 'ㅎ': 'G',
  'ㅏ': 'K', 'ㅑ': 'I', 'ㅓ': 'J', 'ㅕ': 'U', 'ㅗ': 'H', 'ㅛ': 'Y', 'ㅜ': 'N', 'ㅠ': 'B', 'ㅡ': 'M', 'ㅣ': 'L',
  'ㅐ': 'O', 'ㅒ': 'O', 'ㅔ': 'P', 'ㅖ': 'P'
};

const convertToEngChar = (inputStr: string): string => {
  if (!inputStr) return '';
  const lastChar = inputStr.slice(-1);

  // 이미 영문인 경우
  if (/[a-zA-Z]/.test(lastChar)) {
    return lastChar.toUpperCase();
  }

  // 한글 자모음인 경우
  if (korToEngMap[lastChar]) {
    return korToEngMap[lastChar];
  }

  // 완성형 한글인 경우 (0xAC00 ~ 0xD7A3) -> 초성 추출
  const code = lastChar.charCodeAt(0);
  if (code >= 0xAC00 && code <= 0xD7A3) {
    const choIndex = Math.floor((code - 0xAC00) / 588);
    const choList = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
    const cho = choList[choIndex];
    if (cho && korToEngMap[cho]) {
      return korToEngMap[cho];
    }
  }

  return '';
};

export const QuizUI: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const state = store.getState();
  const targetLetters = state.sessionResults?.targetLetters || [];
  const userName = state.settings?.name?.trim() || '명상자';
  const durationMinutes = state.settings?.durationMinutes || 1;

  const [inputs, setInputs] = useState<string[]>(['', '', '', '', '']);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // 첫번째 입력칸 자동 포커스
    if (inputRefs.current[0]) {
      inputRefs.current[0]?.focus();
      inputRefs.current[0]?.select();
    }
  }, []);

  const handleChange = (index: number, rawValue: string) => {
    const char = convertToEngChar(rawValue);
    const next = [...inputs];
    next[index] = char;
    setInputs(next);

    // 문자가 입력되면 자동으로 다음 칸 이동 및 전소 선택 (수정 용이)
    if (char && index < 4) {
      setTimeout(() => {
        inputRefs.current[index + 1]?.focus();
        inputRefs.current[index + 1]?.select();
      }, 10);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
      inputRefs.current[index - 1]?.select();
    } else if (e.key === 'ArrowRight' && index < 4) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
      inputRefs.current[index + 1]?.select();
    } else if (e.key === 'Backspace') {
      if (inputs[index]) {
        // 현재 칸 글자 지우기
        const next = [...inputs];
        next[index] = '';
        setInputs(next);
      } else if (index > 0) {
        // 전 칸으로 이동
        e.preventDefault();
        inputRefs.current[index - 1]?.focus();
        inputRefs.current[index - 1]?.select();
      }
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  const triggerCelebration = () => {
    // 팡파레 / 꽃잎 축하 연출
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#f472b6', '#fcd34d', '#6ee7b7', '#7dd3fc', '#c084fc', '#ffffff'],
    });

    setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#f472b6', '#fcd34d', '#6ee7b7'],
      });
      confetti({
        particleCount: 60,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#7dd3fc', '#c084fc', '#fcd34d'],
      });
    }, 250);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const correct = validateQuiz(inputs);
    setIsCorrect(correct);
    setSubmitted(true);

    if (correct) {
      triggerCelebration();
    }
  };

  // 파스텔 무지개 5가지 컬러 테마
  const rainbowBorders = [
    'border-pink-300 focus:border-pink-400 focus:shadow-[0_0_20px_rgba(244,114,182,0.7)] text-pink-200',
    'border-amber-200 focus:border-amber-300 focus:shadow-[0_0_20px_rgba(252,211,77,0.7)] text-amber-200',
    'border-emerald-300 focus:border-emerald-400 focus:shadow-[0_0_20px_rgba(110,231,183,0.7)] text-emerald-200',
    'border-sky-300 focus:border-sky-400 focus:shadow-[0_0_20px_rgba(125,211,252,0.7)] text-sky-200',
    'border-purple-300 focus:border-purple-400 focus:shadow-[0_0_20px_rgba(216,180,254,0.7)] text-purple-200',
  ];

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#070512]/90 backdrop-blur-md p-3 sm:p-4 overflow-y-auto select-none">
      {/* 백그라운드 무지개 파스텔 오로라 & 만다라 회전 링 */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <div className="w-[500px] h-[500px] rounded-full bg-gradient-to-r from-pink-500/20 via-purple-500/20 via-sky-500/20 via-emerald-500/20 to-amber-500/20 blur-3xl animate-pulse" />
        <svg
          className="absolute w-[550px] h-[550px] opacity-25 text-pink-200 animate-[spin_50s_linear_infinite]"
          viewBox="0 0 200 200"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
        >
          <circle cx="100" cy="100" r="80" strokeDasharray="3 3" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 100 100)`}>
              <path d="M100,20 C110,50 110,70 100,100 C90,70 90,50 100,20" />
            </g>
          ))}
        </svg>
      </div>

      <div className="relative z-10 bg-black/75 backdrop-blur-2xl border border-white/20 p-6 sm:p-8 md:p-10 rounded-3xl shadow-[0_0_50px_rgba(236,72,153,0.25)] w-full max-w-lg text-white text-center my-auto max-h-[92vh] overflow-y-auto">
        {/* 헤더: Thinking-Meditation (파스텔 무지개 그라데이션) */}
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-amber-200 via-emerald-200 via-sky-200 to-purple-300">
          Thinking-Meditation
        </h2>

        {/* 상단 명상자 및 명상시간 뱃지 */}
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-sky-500/20 border border-white/15 px-4 py-1.5 rounded-full text-xs font-bold text-amber-200 mb-6 shadow-sm">
          <span>🌸 {userName} 님</span>
          <span className="text-white/40">•</span>
          <span>🧘‍♂️ {durationMinutes}분 명상 완료</span>
        </div>

        {/* 대형 선명 가독성 문구 */}
        {!submitted && (
          <div className="bg-white/10 border border-white/15 p-4 rounded-2xl mb-6 shadow-inner backdrop-blur-md">
            <p className="text-base sm:text-lg md:text-xl font-bold leading-relaxed text-amber-100">
              명상 중간에 지나간 <br className="sm:hidden" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-amber-300 to-sky-300 font-extrabold underline decoration-amber-300/50 underline-offset-4">
                5개의 영문자
              </span>를 입력해주세요.
            </p>
          </div>
        )}

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
            {/* 5칸 영문 입력박스 */}
            <div className="flex justify-center gap-2 sm:gap-3">
              {inputs.map((val, idx) => (
                <input
                  key={idx}
                  ref={(el) => (inputRefs.current[idx] = el)}
                  type="text"
                  maxLength={2}
                  value={val}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  onFocus={handleFocus}
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck="false"
                  className={`w-11 h-14 sm:w-14 sm:h-18 text-xl sm:text-3xl font-extrabold text-center bg-white/10 border-2 rounded-2xl focus:outline-none uppercase transition-all transform focus:scale-105 ${rainbowBorders[idx]}`}
                  placeholder={`${idx + 1}`}
                />
              ))}
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-pink-300 via-amber-200 via-emerald-200 to-sky-300 text-slate-900 font-extrabold text-base sm:text-lg py-3.5 sm:py-4 rounded-2xl shadow-lg hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer"
            >
              정답 확인하기
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            {/* 결과 메시지 상자 */}
            <div
              className={`text-lg sm:text-xl font-extrabold p-5 rounded-2xl border leading-snug ${
                isCorrect
                  ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40 shadow-[0_0_30px_rgba(16,185,129,0.3)]'
                  : 'bg-rose-500/20 text-rose-200 border-rose-400/40 shadow-[0_0_30px_rgba(244,63,94,0.3)]'
              }`}
            >
              {isCorrect ? (
                <>
                  <div className="text-2xl mb-1">🌸 🎊 🎉</div>
                  <div>축하합니다! 정답입니다.</div>
                  <div className="text-sm font-semibold opacity-90 mt-1 text-emerald-300">
                    {userName} 님의 뛰어난 관조와 기억 집중력입니다!
                  </div>
                </>
              ) : (
                <>
                  <div>아쉽습니다!</div>
                  <div className="text-sm font-semibold opacity-90 mt-1 text-rose-300">
                    제출한 답과 정답을 다시 비교해보세요.
                  </div>
                </>
              )}
            </div>

            {/* 정답 및 입력 알파벳 비교 카드 */}
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl text-left text-sm space-y-3 backdrop-blur-md">
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-gray-300 font-semibold">제시된 알파벳:</span>
                <span className="font-mono text-lg sm:text-xl font-black text-amber-300 tracking-widest">
                  {targetLetters.join('  ')}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-gray-300 font-semibold">입력한 알파벳:</span>
                <span className="font-mono text-lg sm:text-xl font-black text-pink-300 tracking-widest">
                  {inputs.map((i) => i || '-').join('  ')}
                </span>
              </div>
            </div>

            {/* 하단 액션 버튼 */}
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full bg-gradient-to-r from-pink-300 via-amber-200 via-emerald-200 to-sky-300 text-slate-900 font-extrabold text-base sm:text-lg py-3.5 sm:py-4 rounded-2xl shadow-lg hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer"
              >
                메인 화면으로
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};




