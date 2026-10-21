import { ValidateBy, ValidationOptions } from 'class-validator';

export const SNAPSHOT_MAX_BYTES = 1_500_000;
export const SNAPSHOT_MAX_DEPTH = 12;
export const SNAPSHOT_MAX_ARRAY_ITEMS = 200;
export const SNAPSHOT_MAX_OBJECT_KEYS = 200;
export const SNAPSHOT_MAX_STRING_LENGTH = 5_000;
export const SNAPSHOT_MAX_NODES = 25_000;

export function IsBoundedSnapshot(validationOptions?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isBoundedSnapshot',
      validator: {
        validate: (value: unknown) => isBoundedSnapshot(value),
        defaultMessage: () =>
          'Снимок расчёта превышает допустимый размер или сложность',
      },
    },
    validationOptions,
  );
}

export function isBoundedSnapshot(value: unknown): boolean {
  if (!isPlainObject(value)) return false;

  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    return false;
  }
  if (Buffer.byteLength(serialized, 'utf8') > SNAPSHOT_MAX_BYTES) return false;

  const queue: Array<{ value: unknown; depth: number }> = [{ value, depth: 0 }];
  let nodes = 0;

  while (queue.length > 0) {
    const current = queue.pop()!;
    nodes += 1;
    if (nodes > SNAPSHOT_MAX_NODES || current.depth > SNAPSHOT_MAX_DEPTH) {
      return false;
    }

    if (typeof current.value === 'string') {
      if (current.value.length > SNAPSHOT_MAX_STRING_LENGTH) return false;
      continue;
    }
    if (typeof current.value === 'number') {
      if (!Number.isFinite(current.value) || Math.abs(current.value) > 1e12) {
        return false;
      }
      continue;
    }
    if (current.value === null || typeof current.value === 'boolean') {
      continue;
    }
    if (Array.isArray(current.value)) {
      if (current.value.length > SNAPSHOT_MAX_ARRAY_ITEMS) return false;
      for (const item of current.value) {
        queue.push({ value: item, depth: current.depth + 1 });
      }
      continue;
    }
    if (!isPlainObject(current.value)) return false;

    const entries = Object.entries(current.value);
    if (entries.length > SNAPSHOT_MAX_OBJECT_KEYS) return false;
    for (const [key, item] of entries) {
      if (
        key.length > 100 ||
        key === '__proto__' ||
        key === 'prototype' ||
        key === 'constructor'
      ) {
        return false;
      }
      queue.push({ value: item, depth: current.depth + 1 });
    }
  }

  return true;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
