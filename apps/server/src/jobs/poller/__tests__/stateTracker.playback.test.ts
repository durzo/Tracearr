import { describe, it, expect } from 'vitest';
import {
  isPlaybackConfirmed,
  createInitialConfirmationState,
  updateConfirmationState,
} from '../stateTracker.js';
import { PLAYBACK_CONFIRM_THRESHOLD_MS } from '../types.js';

describe('isPlaybackConfirmed', () => {
  const baseState = {
    rulesEvaluated: false,
    confirmedPlayback: false,
    firstSeenAt: Date.now(),
    maxViewOffset: 0,
  };

  it('returns true if already confirmed', () => {
    const state = { ...baseState, confirmedPlayback: true };
    expect(isPlaybackConfirmed(state, 0, 'playing', Date.now())).toBe(true);
  });

  it('returns true if viewOffset exceeds threshold', () => {
    const state = { ...baseState };
    expect(
      isPlaybackConfirmed(state, PLAYBACK_CONFIRM_THRESHOLD_MS + 1, 'playing', Date.now())
    ).toBe(true);
  });

  it('returns false if viewOffset equals threshold', () => {
    const state = { ...baseState };
    expect(isPlaybackConfirmed(state, PLAYBACK_CONFIRM_THRESHOLD_MS, 'playing', Date.now())).toBe(
      false
    );
  });

  it('returns true if active duration exceeds threshold while playing', () => {
    const now = Date.now();
    const state = { ...baseState, firstSeenAt: now - PLAYBACK_CONFIRM_THRESHOLD_MS - 1 };
    expect(isPlaybackConfirmed(state, 0, 'playing', now)).toBe(true);
  });

  it('returns false if active duration equals threshold', () => {
    const now = Date.now();
    const state = { ...baseState, firstSeenAt: now - PLAYBACK_CONFIRM_THRESHOLD_MS };
    expect(isPlaybackConfirmed(state, 0, 'playing', now)).toBe(false);
  });

  it('returns false if active duration exceeds threshold but paused', () => {
    const now = Date.now();
    const state = { ...baseState, firstSeenAt: now - PLAYBACK_CONFIRM_THRESHOLD_MS - 1 };
    expect(isPlaybackConfirmed(state, 0, 'paused', now)).toBe(false);
  });

  it('returns false for new session with no progress', () => {
    const state = { ...baseState };
    expect(isPlaybackConfirmed(state, 0, 'playing', Date.now())).toBe(false);
  });
});

describe('createInitialConfirmationState', () => {
  it('creates state with correct initial values', () => {
    const now = Date.now();
    const state = createInitialConfirmationState(now);
    expect(state).toEqual({
      rulesEvaluated: false,
      confirmedPlayback: false,
      firstSeenAt: now,
      maxViewOffset: 0,
    });
  });
});

describe('updateConfirmationState', () => {
  it('updates maxViewOffset when higher', () => {
    const state = {
      rulesEvaluated: false,
      confirmedPlayback: false,
      firstSeenAt: Date.now(),
      maxViewOffset: 1000,
    };
    const updated = updateConfirmationState(state, 5000);
    expect(updated.maxViewOffset).toBe(5000);
  });

  it('does not decrease maxViewOffset', () => {
    const state = {
      rulesEvaluated: false,
      confirmedPlayback: false,
      firstSeenAt: Date.now(),
      maxViewOffset: 5000,
    };
    const updated = updateConfirmationState(state, 1000);
    expect(updated.maxViewOffset).toBe(5000);
  });
});
