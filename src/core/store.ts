import { MeditationState } from '../types';

type Listener = (state: MeditationState) => void;

class Store {
  private state: MeditationState = {
    settings: null,
    isRunning: false,
    currentLabel: null,
    sessionResults: null,
  };
  private listeners: Listener[] = [];

  getState() {
    return this.state;
  }

  setState(updater: (state: MeditationState) => Partial<MeditationState>) {
    this.state = { ...this.state, ...updater(this.state) };
    this.listeners.forEach((listener) => listener(this.state));
  }

  subscribe(listener: Listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
}

export const store = new Store();
