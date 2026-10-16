import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { describeProblem } from './problem.filter.js';
describe('public errors', () => {
  it('preserves a known translation key', () => {
    expect(describeProblem(new NotFoundException({ code: 'demoRecordNotFound' }))).toEqual({
      status: 404,
      code: 'demoRecordNotFound',
      detail: 'Demo record not found.',
    });
  });
  it('hides validation payloads and unexpected exception messages', () => {
    expect(describeProblem(new BadRequestException('private input'))).toEqual({
      status: 400,
      code: 'validationError',
      detail: 'Invalid request.',
    });
    expect(describeProblem(new Error('postgresql://secret'))).toEqual({
      status: 500,
      code: 'internalError',
      detail: 'An unexpected error occurred.',
    });
  });
});
