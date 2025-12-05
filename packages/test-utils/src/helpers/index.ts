/**
 * Test helper utilities
 *
 * @module @tracearr/test-utils/helpers
 */

// Authentication helpers
export {
  generateTestToken,
  generateExpiredToken,
  generateInvalidToken,
  decodeToken,
  verifyTestToken,
  generateOwnerToken,
  generateAdminToken,
  generateMemberToken,
  authHeaders,
  ownerAuthHeaders,
  adminAuthHeaders,
  memberAuthHeaders,
  getTestJwtSecret,
  generateMobilePairingToken,
  generateQRPairingPayload,
  type TestTokenPayload,
  type GenerateTokenOptions,
} from './auth.js';

// Time manipulation helpers
export {
  relativeDate,
  time,
  timestamp,
  todayAt,
  dateAt,
  duration,
  parseDuration,
  formatDuration,
  dateDiff,
  isWithinRange,
  dateSequence,
  mockTime,
} from './time.js';

// Wait and polling helpers
export {
  wait,
  nextTick,
  nextLoop,
  flushPromises,
  waitFor,
  waitForValue,
  waitForResult,
  waitForLength,
  waitForNoThrow,
  retry,
  withTimeout,
  concurrent,
  measureTime,
  assertFastEnough,
  type WaitForOptions,
  type RetryOptions,
} from './wait.js';
