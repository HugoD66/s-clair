import {
  evaluate,
  evaluateDetails,
  firstExercise,
  type Exercise,
  type PracticeResult,
  type BeatOutcome,
} from './exercise';
import type { PracticeAudio } from './practice-audio';

export type SessionPhase =
  'ready' | 'loading' | 'listening' | 'countdown' | 'playing' | 'exit' | 'audio-error' | 'result';
export type SessionFeedback = 'perfect' | 'good' | 'missed' | 'extra' | null;
export interface SessionView {
  phase: SessionPhase;
  beat: number | null;
  countdown: number;
  listened: boolean;
  active: boolean;
  feedback: SessionFeedback;
  result: PracticeResult | null;
  outcomes: readonly BeatOutcome[];
}

/** Finite local session. Audio, rendering and input adapters share one output clock. */
export class PracticeEngine {
  private phase: SessionPhase = 'ready';
  private listened = false;
  private active = false;
  private hits: number[] = [];
  private feedback: SessionFeedback = null;
  private feedbackUntil = 0;
  private missed = 0;
  private origin = 0;
  private resumeAt = 0;
  private frozen = 0;
  private resuming = false;
  private operation = 0;
  private result: PracticeResult | null = null;
  private readonly interval: number;
  private readonly duration: number;

  constructor(
    private readonly audio: PracticeAudio,
    private readonly exercise: Exercise = firstExercise,
  ) {
    this.interval = 60_000 / exercise.bpm;
    this.duration = Math.max(
      exercise.beats.length * this.interval,
      (exercise.beats.length - 1) * this.interval + exercise.toleranceMs + 1,
    );
  }

  async listen(): Promise<void> {
    if (this.active || this.phase === 'loading' || this.phase === 'listening') return;
    this.reset();
    const operation = ++this.operation;
    this.phase = 'loading';
    try {
      await this.audio.open();
      if (operation !== this.operation) return;
      // Allow the output clock to settle after activation; all sounds are scheduled ahead.
      this.origin = this.audio.startTime();
      this.exercise.beats.forEach((hit, beat) => {
        this.audio.schedule('pulse', this.origin + beat * this.interval);
        if (hit) this.audio.schedule('drum', this.origin + beat * this.interval);
      });
      this.phase = 'listening';
    } catch {
      if (operation === this.operation) this.failAudio();
    }
  }

  start(): void {
    if (!this.listened || this.phase !== 'ready') return;
    this.hits = [];
    this.missed = 0;
    this.result = null;
    this.feedback = null;
    this.active = true;
    this.frozen = 0;
    this.resuming = false;
    this.scheduleAttempt();
  }

  private scheduleAttempt(): void {
    try {
      this.audio.stop();
      const countStart = this.audio.startTime();
      this.resumeAt = countStart + this.exercise.countIn * this.interval;
      this.origin = this.resumeAt - this.frozen;
      for (let index = 0; index < this.exercise.countIn; index++) {
        this.audio.schedule('count', countStart + index * this.interval);
      }
      this.exercise.beats.forEach((_, beat) => {
        const time = beat * this.interval;
        if (time >= this.frozen) this.audio.schedule('pulse', this.origin + time);
      });
      this.phase = 'countdown';
    } catch {
      this.failAudio();
    }
  }

  /** A hit is dated on the audio output clock by the input adapter. */
  hit(atMs: number): boolean {
    if (!this.active || !['countdown', 'playing'].includes(this.phase) || !Number.isFinite(atMs))
      return false;
    if (this.resuming && atMs < this.resumeAt) return false;
    const elapsed = atMs - this.origin;
    if (elapsed < -this.exercise.toleranceMs || elapsed >= this.duration) return false;
    const before = evaluate(this.exercise, this.hits, elapsed);
    this.hits.push(elapsed);
    const after = evaluate(this.exercise, this.hits, elapsed);
    this.feedback =
      after.perfect > before.perfect ? 'perfect' : after.good > before.good ? 'good' : 'extra';
    this.feedbackUntil = this.audio.now() + 650;
    // The model is never replayed during an attempt. Only the player's own hit sounds.
    try {
      this.audio.schedule('drum', this.audio.now());
    } catch {
      this.failAudio();
    }
    return true;
  }

  pause(): void {
    if (!this.active || this.phase === 'exit') return;
    this.tick();
    if (!this.active) return;
    if (this.phase === 'playing') this.frozen = Math.max(0, this.audio.now() - this.origin);
    this.audio.stop();
    this.feedback = null;
    this.phase = 'exit';
  }

  continue(): void {
    if (this.phase !== 'exit') return;
    this.resuming = this.frozen > 0;
    this.scheduleAttempt();
  }

  reset(): void {
    this.operation++;
    this.audio.stop();
    this.active = false;
    this.hits = [];
    this.result = null;
    this.feedback = null;
    this.missed = 0;
    this.frozen = 0;
    this.phase = 'ready';
  }

  close(): void {
    this.operation++;
    this.audio.close();
  }

  private failAudio(): void {
    this.reset();
    this.listened = false;
    this.audio.close();
    this.phase = 'audio-error';
  }

  private tick(): void {
    if (!['listening', 'countdown', 'playing'].includes(this.phase)) return;
    if (!this.audio.running()) {
      this.failAudio();
      return;
    }
    const now = this.audio.now();
    const elapsed = now - this.origin;
    if (this.phase === 'listening') {
      if (elapsed >= this.exercise.beats.length * this.interval) {
        this.listened = true;
        this.phase = 'ready';
        this.audio.stop();
      }
      return;
    }
    if (now < this.resumeAt) return;
    this.phase = 'playing';
    const result = evaluate(this.exercise, this.hits, elapsed);
    if (result.missed > this.missed) {
      this.feedback = 'missed';
      this.feedbackUntil = now + 650;
      this.missed = result.missed;
    } else if (now > this.feedbackUntil) this.feedback = null;
    if (elapsed >= this.duration) {
      this.result = result;
      this.active = false;
      this.phase = 'result';
      this.audio.stop();
    }
  }

  view(): SessionView {
    this.tick();
    const now = this.audio.now();
    const elapsed = now - this.origin;
    const beat =
      this.phase === 'exit'
        ? Math.floor(this.frozen / this.interval)
        : ['listening', 'playing'].includes(this.phase) && elapsed >= 0
          ? Math.floor(elapsed / this.interval)
          : null;
    return {
      phase: this.phase,
      beat: beat === null ? null : Math.min(this.exercise.beats.length - 1, beat),
      countdown: Math.min(
        this.exercise.countIn,
        Math.max(1, Math.ceil((this.resumeAt - now) / this.interval)),
      ),
      listened: this.listened,
      active: this.active,
      feedback: this.feedback,
      result: this.result,
      outcomes:
        this.active || this.phase === 'result'
          ? evaluateDetails(
              this.exercise,
              this.hits,
              this.phase === 'exit' || (this.phase === 'countdown' && this.resuming)
                ? this.frozen
                : elapsed,
            ).beats
          : [],
    };
  }
}
