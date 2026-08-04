import { store } from '../core/store';

export const validateQuiz = (inputs: string[]) => {
  const state = store.getState();
  if (!state.sessionResults) return false;
  
  return inputs.every((input, index) => input.toLowerCase() === state.sessionResults!.targetLetters[index].toLowerCase());
};
