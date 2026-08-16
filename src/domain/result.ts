/**
 * Invariant checks return a result instead of throwing, so the UI can render a
 * reason and the repo can refuse a write through the same code path (§3).
 */
export type Ok<T> = { ok: true; value: T };
export type Err = { ok: false; code: RuleCode; message: string };
export type Result<T> = Ok<T> | Err;

export type RuleCode =
  | 'cap-reached'
  | 'slot-taken'
  | 'no-free-slot'
  | 'nesting-too-deep'
  | 'nesting-cross-traveller'
  | 'nesting-invalid-parent'
  | 'nesting-self'
  | 'not-found'
  | 'invalid-field';

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err(code: RuleCode, message: string): Err {
  return { ok: false, code, message };
}

/** Throwing wrapper for callers that have already checked, or for seeds. */
export function unwrap<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`);
  return result.value;
}
