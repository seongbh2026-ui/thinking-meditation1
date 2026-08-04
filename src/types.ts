export type VoiceType = 'male' | 'female' | 'mute';

export interface MeditationSettings {
  name: string;
  durationMinutes: number;
  intervalSeconds: number;
  voiceType: VoiceType;
  sceneId: number;
}

export interface MeditationState {
  settings: MeditationSettings | null;
  isRunning: boolean;
  currentLabel: string | null;
  sessionResults: {
    targetLetters: string[];
    userInputs: string[];
  } | null;
}
