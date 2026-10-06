import { NextResponse } from 'next/server';
import { RequestAuthError } from './requestAuth';

type StatusError = Error & { status: number };

export function errorResponse(error: unknown, fallbackMessage: string, knownErrors: Array<new (...args: never[]) => StatusError> = []) {
  if (error instanceof RequestAuthError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  if (knownErrors.some((ErrorType) => error instanceof ErrorType)) {
    const known = error as StatusError;
    return NextResponse.json({ error: known.message }, { status: known.status });
  }
  console.error(fallbackMessage, error);
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
