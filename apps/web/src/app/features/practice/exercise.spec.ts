import { describe, expect, it } from 'vitest';
import { evaluate, firstExercise } from './exercise';

describe('first exercise evaluation', () => {
  it('counts the approved five hits and all three rests without a score', () => {
    expect(evaluate(firstExercise, [0, 1000, 3000, 4000, 6000], 8000)).toEqual({
      correct: 5,
      missed: 0,
      extra: 0,
    });
    expect(evaluate(firstExercise, [], 8000)).toEqual({ correct: 0, missed: 5, extra: 0 });
  });
  it('accepts both inclusive tolerance boundaries, including the first early hit', () => {
    expect(evaluate(firstExercise, [-150, 1150, 2850, 4150, 5850], 8000)).toEqual({
      correct: 5,
      missed: 0,
      extra: 0,
    });
    expect(evaluate(firstExercise, [-151, 1151], 8000)).toEqual({
      correct: 0,
      missed: 5,
      extra: 2,
    });
  });
  it('matches once and counts duplicates, rests and out-of-window hits separately', () => {
    expect(evaluate(firstExercise, [0, 50, 1000, 2000, 3000, 4250], 8000)).toEqual({
      correct: 3,
      missed: 2,
      extra: 3,
    });
  });
  it('waits for the end of a note window and accepts delayed delivery of a dated event', () => {
    expect(evaluate(firstExercise, [], 150).missed).toBe(0);
    expect(evaluate(firstExercise, [], 151).missed).toBe(1);
    expect(evaluate(firstExercise, [150], 200)).toEqual({ correct: 1, missed: 0, extra: 0 });
    expect(evaluate(firstExercise, [1000], 200).correct).toBe(0);
  });
  it('uses the supplied exercise rather than hard-coded level-one note times', () => {
    expect(
      evaluate(
        { bpm: 120, beats: [false, true, true], toleranceMs: 50, countIn: 2 },
        [450, 1050],
        1500,
      ),
    ).toEqual({ correct: 2, missed: 0, extra: 0 });
  });
});
