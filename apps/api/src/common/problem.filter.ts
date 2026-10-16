import { Catch, HttpException, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '../generated/prisma/client.js';

const messages: Record<string, string> = {
  demoRecordNotFound: 'Demo record not found.',
  validationError: 'Invalid request.',
  databaseUnavailable: 'Database unavailable.',
  notFound: 'Resource not found.',
  internalError: 'An unexpected error occurred.',
};
export function describeProblem(error: unknown): { status: number; code: string; detail: string } {
  let status = 500;
  let code = 'internalError';
  if (error instanceof HttpException) {
    status = error.getStatus();
    const payload = error.getResponse();
    if (
      typeof payload === 'object' &&
      'code' in payload &&
      typeof payload.code === 'string' &&
      Object.hasOwn(messages, payload.code)
    )
      code = payload.code;
    else if (status === 400) code = 'validationError';
    else if (status === 404) code = 'notFound';
  } else if (
    error instanceof Prisma.PrismaClientInitializationError ||
    (error instanceof Prisma.PrismaClientKnownRequestError &&
      ['P1001', 'P1002', 'P1017', 'P2024'].includes(error.code))
  ) {
    status = 503;
    code = 'databaseUnavailable';
  }
  return { status, code, detail: messages[code] ?? messages['internalError']! };
}
@Catch()
export class ProblemFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemFilter.name);
  catch(error: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();
    const { status, code, detail } = describeProblem(error);
    const requestId = String(response.getHeader('x-request-id'));
    if (status >= 500) this.logger.error({ code, requestId, method: request.method, status });
    response
      .status(status)
      .type('application/problem+json')
      .json({
        type: 'about:blank',
        title:
          status === 503
            ? 'Service Unavailable'
            : status === 404
              ? 'Not Found'
              : status === 400
                ? 'Bad Request'
                : 'Internal Server Error',
        status,
        detail,
        code,
        requestId,
      });
  }
}
