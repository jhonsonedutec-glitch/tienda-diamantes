import type { Prisma } from '@ff/database';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export function generateTrackingToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashTrackingToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function verifyTrackingToken(token: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashTrackingToken(token), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function generatePublicCode(): string {
  const year = new Date().getUTCFullYear();
  const suffix = randomBytes(5).toString('hex').toUpperCase();
  return `FF-${year}-${suffix}`;
}

export function safeJson<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(value, (_key, item) =>
      typeof item === 'bigint' ? item.toString() : item,
    ),
  ) as Prisma.InputJsonValue;
}
