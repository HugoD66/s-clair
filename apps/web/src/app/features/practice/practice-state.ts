export const practiceStates = [
  'ready',
  'listening',
  'countdown',
  'playing',
  'exit',
  'audio-error',
] as const;
export type PracticeState = (typeof practiceStates)[number];
export type PracticeAction = 'listen' | 'start' | 'leave' | 'continue' | 'confirm-leave';
