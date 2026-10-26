import { describe, expect, it } from 'vitest';
import type { PracticeAudio, PracticeSound } from './practice-audio';
import { PracticeEngine } from './practice-engine';

class FakeAudio implements PracticeAudio {
  time = 0;
  available = true;
  events: { sound: PracticeSound; at: number }[] = [];
  open(): Promise<void> {
    return this.available ? Promise.resolve() : Promise.reject(new Error('unavailable'));
  }
  now(): number {
    return this.time;
  }
  startTime(): number {
    return this.time + 200;
  }
  running(): boolean {
    return this.available;
  }
  schedule(sound: PracticeSound, at: number): void {
    if (!this.available) throw new Error('unavailable');
    this.events.push({ sound, at });
  }
  stop(): void {
    this.events = [];
  }
  close(): void {
    this.stop();
  }
}
async function ready() {
  const audio = new FakeAudio();
  const engine = new PracticeEngine(audio);
  await engine.listen();
  audio.time = 8200;
  expect(engine.view().listened).toBe(true);
  return { audio, engine };
}

describe('local practice session', () => {
  it('requires a completed model and schedules eight pulses and five model hits', async () => {
    const audio = new FakeAudio();
    const engine = new PracticeEngine(audio);
    engine.start();
    expect(engine.view().phase).toBe('ready');
    await engine.listen();
    expect(audio.events.filter((e) => e.sound === 'drum').map((e) => e.at)).toEqual([
      200, 1200, 3200, 4200, 6200,
    ]);
    expect(audio.events.filter((e) => e.sound === 'pulse')).toHaveLength(8);
    engine.start();
    expect(engine.view().phase).toBe('listening');
    audio.time = 8200;
    expect(engine.view()).toMatchObject({ phase: 'ready', listened: true, active: false });
  });
  it('runs 4–3–2–1 and the full eight-beat attempt, accepts the first early boundary', async () => {
    const { audio, engine } = await ready();
    engine.start();
    expect(audio.events.filter((e) => e.sound === 'count')).toHaveLength(4);
    expect(audio.events.filter((e) => e.sound === 'drum')).toHaveLength(0);
    const origin = 12400;
    for (let index = 0; index < 4; index++) {
      audio.time = 8400 + index * 1000;
      expect(engine.view()).toMatchObject({
        phase: 'countdown',
        countdown: 4 - index,
        active: true,
      });
    }
    expect(engine.hit(origin - 151)).toBe(false);
    audio.time = origin - 150;
    expect(engine.hit(audio.time)).toBe(true);
    for (const elapsed of [1000, 3000, 4000, 6000]) {
      audio.time = origin + elapsed;
      engine.view();
      engine.hit(audio.time);
    }
    audio.time = origin + 7999;
    expect(engine.view().phase).toBe('playing');
    audio.time++;
    expect(engine.view()).toMatchObject({
      phase: 'result',
      active: false,
      result: { perfect: 4, good: 1, missed: 0, extra: 0 },
    });
    expect(engine.hit(audio.time)).toBe(false);
    engine.reset();
    expect(engine.view()).toMatchObject({ phase: 'ready', result: null, listened: true });
  });
  it('reports each grade immediately and preserves the same grades in the result', async () => {
    const { audio, engine } = await ready();
    engine.start();
    audio.time = 12450;
    engine.hit(audio.time);
    expect(engine.view().feedback).toBe('perfect');
    expect(engine.view().outcomes[0]?.judgement).toBe('perfect');
    audio.time = 13550;
    engine.hit(audio.time);
    expect(engine.view().feedback).toBe('good');
    expect(engine.view().outcomes[1]?.judgement).toBe('good');
    audio.time = 15551;
    engine.hit(audio.time);
    expect(engine.view().outcomes[3]).toEqual({ judgement: 'missed', extra: true });
    audio.time = 20400;
    expect(engine.view().result).toEqual({ perfect: 1, good: 1, missed: 3, extra: 1 });
    await engine.listen();
    expect(engine.view().outcomes).toEqual([]);
    expect(engine.view().result).toBeNull();
  });
  it('continues after errors and resets every count on replay', async () => {
    const { audio, engine } = await ready();
    engine.start();
    audio.time = 12400;
    engine.hit(audio.time);
    engine.hit(audio.time + 10);
    audio.time = 14400;
    engine.view();
    engine.hit(audio.time);
    audio.time = 20400;
    expect(engine.view().result).toEqual({ perfect: 1, good: 0, missed: 4, extra: 2 });
    engine.reset();
    engine.start();
    audio.time = 32600;
    expect(engine.view().result).toEqual({ perfect: 0, good: 0, missed: 5, extra: 0 });
  });
  it('freezes evaluation during exit and count-in, resuming at the exact musical offset', async () => {
    const { audio, engine } = await ready();
    engine.start();
    audio.time = 12400;
    engine.hit(audio.time);
    audio.time = 13700;
    engine.pause();
    expect(engine.view()).toMatchObject({ phase: 'exit', beat: 1, active: true });
    const pausedOutcomes = engine.view().outcomes;
    expect(audio.events).toHaveLength(0);
    audio.time += 10000;
    expect(engine.view().outcomes).toEqual(pausedOutcomes);
    expect(engine.hit(audio.time)).toBe(false);
    engine.continue();
    expect(engine.view().outcomes).toEqual(pausedOutcomes);
    const resumed = audio.time + 4200;
    expect(engine.hit(resumed - 1)).toBe(false);
    audio.time = resumed;
    expect(engine.view()).toMatchObject({ phase: 'playing', beat: 1 });
    audio.time = resumed + 1700;
    engine.hit(audio.time); // Original beat four.
    audio.time = resumed + 6700;
    expect(engine.view().result).toEqual({ perfect: 2, good: 0, missed: 3, extra: 0 });
  });
  it('restarts a paused initial count-in and discards an abandoned attempt', async () => {
    const { audio, engine } = await ready();
    engine.start();
    audio.time += 1500;
    engine.pause();
    engine.continue();
    expect(engine.view()).toMatchObject({ phase: 'countdown', countdown: 4 });
    engine.reset();
    expect(engine.view()).toMatchObject({
      phase: 'ready',
      active: false,
      result: null,
      outcomes: [],
    });
    expect(audio.events).toHaveLength(0);
  });
  it('cancels stale audio activation without starting playback after leaving', async () => {
    const audio = new FakeAudio();
    let activate!: () => void;
    audio.open = () =>
      new Promise<void>((resolve) => {
        activate = resolve;
      });
    const engine = new PracticeEngine(audio);
    const pending = engine.listen();
    expect(engine.view().phase).toBe('loading');
    engine.reset();
    activate();
    await pending;
    expect(engine.view()).toMatchObject({ phase: 'ready', listened: false });
    expect(audio.events).toHaveLength(0);
  });
  it('reports audio failures and allows a fresh listen without a fictional result', async () => {
    const audio = new FakeAudio();
    audio.available = false;
    const engine = new PracticeEngine(audio);
    await engine.listen();
    expect(engine.view()).toMatchObject({ phase: 'audio-error', active: false, result: null });
    audio.available = true;
    await engine.listen();
    audio.time = 8200;
    engine.view();
    engine.start();
    audio.available = false;
    expect(engine.view()).toMatchObject({
      phase: 'audio-error',
      active: false,
      result: null,
      listened: false,
    });
  });
});
