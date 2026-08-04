import { store } from '../core/store';
import { eventBus } from '../core/eventBus';

let activeInterval: ReturnType<typeof setInterval> | null = null;

export const stopMeditation = () => {
  if (activeInterval) {
    clearInterval(activeInterval);
    activeInterval = null;
  }
};

export const startMeditation = (durationMinutes: number, intervalSeconds: number = 5) => {
  stopMeditation();

  const stepDuration = Math.max(1, intervalSeconds);
  const totalSteps = Math.max(1, Math.floor((durationMinutes * 60) / stepDuration));

  // 1-100 카운팅 수열 생성 규칙
  // totalSteps <= 100 이면 totalSteps부터 1까지 (예: 1분 선택 시 12 -> 12, 11, ... 1)
  // totalSteps > 100 이면 (예: 10분 선택 시 120단계)
  //   첫 블록: 120 % 100 = 20 부터 1까지 (20단계: 20, 19, ..., 1)
  //   두 번째 블록: 100 부터 1까지 (100단계: 100, 99, ..., 1)
  const stepNumbers: number[] = [];
  const rem = totalSteps % 100;
  let remaining = totalSteps;

  if (rem > 0) {
    for (let i = rem; i >= 1; i--) {
      stepNumbers.push(i);
      remaining--;
    }
  }

  while (remaining > 0) {
    const startVal = Math.min(100, remaining);
    for (let i = startVal; i >= 1; i--) {
      stepNumbers.push(i);
      remaining--;
    }
  }

  // 1세트당 5개의 영문자 위치 무작위 추출 (첫 번째 스텝 index 0은 영문자에서 배제)
  const maxLetters = Math.min(5, Math.max(0, totalSteps - 1));
  const letterStepIndicesSet = new Set<number>();
  while (letterStepIndicesSet.size < maxLetters) {
    const randIndex = Math.floor(Math.random() * totalSteps);
    if (randIndex !== 0) {
      letterStepIndicesSet.add(randIndex);
    }
  }
  const letterIndicesArray = Array.from(letterStepIndicesSet).sort((a, b) => a - b);

  // 무작위 알파벳 5개 선택
  const alphabetPool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const chosenLetters: string[] = [];
  for (let i = 0; i < maxLetters; i++) {
    const randIdx = Math.floor(Math.random() * alphabetPool.length);
    chosenLetters.push(alphabetPool.splice(randIdx, 1)[0]);
  }

  store.setState((s) => ({
    ...s,
    sessionResults: {
      targetLetters: chosenLetters,
      userInputs: [],
    },
  }));

  let currentStepIndex = 0;

  const tick = () => {
    if (currentStepIndex >= totalSteps) {
      stopMeditation();
      eventBus.emit('SESSION_END');
      return;
    }

    const alphabetPos = letterIndicesArray.indexOf(currentStepIndex);
    let label: string;

    if (alphabetPos !== -1) {
      // 영문자 출력 및 음성 재생
      label = chosenLetters[alphabetPos];
    } else {
      // 숫자 출력 및 음성 재생
      label = stepNumbers[currentStepIndex].toString();
    }

    store.setState((s) => ({ ...s, currentLabel: label }));
    eventBus.emit('TICK', label);

    currentStepIndex++;
  };

  // 첫 번째 카운트 즉시 실행
  tick();

  activeInterval = setInterval(tick, stepDuration * 1000);
};

