import { describe, expect, it } from 'vitest';
import { evaluate, evaluateDetails, firstExercise } from './exercise';

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

describe('per-beat presentation of the judgement', () => {
  it('marks an early correct hit on the matched note, not the previous visual beat', () => {
    const review = evaluateDetails(firstExercise, [850], 900);
    expect(review.beats[0]).toEqual({ judgement: 'missed', extra: false });
    expect(review.beats[1]).toEqual({ judgement: 'correct', extra: false });
    expect(review.result).toEqual(evaluate(firstExercise, [850], 900));
  });
  it('preserves both facts for a correct note with an extra hit, and flags a struck rest', () => {
    const review = evaluateDetails(firstExercise, [0, 50, 2000], 2500);
    expect(review.beats.slice(0, 4)).toEqual([
      { judgement: 'correct', extra: true },
      { judgement: 'missed', extra: false },
      { judgement: null, extra: true },
      { judgement: null, extra: false },
    ]);
    expect(review.result).toEqual({ correct: 1, missed: 1, extra: 2 });
  });
  it('leaves an open window and an unplayed rest neutral, then resolves a late event', () => {
    expect(evaluateDetails(firstExercise, [], 150).beats[0]?.judgement).toBeNull();
    expect(evaluateDetails(firstExercise, [], 151).beats[0]?.judgement).toBe('missed');
    expect(evaluateDetails(firstExercise, [150], 200).beats[0]?.judgement).toBe('correct');
    expect(evaluateDetails(firstExercise, [], 8000).beats[7]).toEqual({
      judgement: null,
      extra: false,
    });
  });
});
