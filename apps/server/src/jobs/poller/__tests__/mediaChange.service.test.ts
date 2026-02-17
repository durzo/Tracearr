import { describe, it, expect, beforeEach } from 'vitest';
import { detectMediaChange } from '../stateTracker.js';

describe('Media Change Detection', () => {
  describe('detectMediaChange', () => {
    it('returns true when ratingKey changes', () => {
      expect(detectMediaChange('episode-100', 'episode-101')).toBe(true);
    });

    it('returns false when ratingKey is the same', () => {
      expect(detectMediaChange('episode-100', 'episode-100')).toBe(false);
    });

    it('returns false when existing ratingKey is null', () => {
      expect(detectMediaChange(null, 'episode-100')).toBe(false);
    });

    it('returns false when new ratingKey is null', () => {
      expect(detectMediaChange('episode-100', null)).toBe(false);
    });

    describe('Live TV UUID handling', () => {
      it('returns false when ratingKey changes but liveUuid matches (channel change)', () => {
        expect(detectMediaChange('channel-1', 'channel-2', 'live-abc', 'live-abc')).toBe(false);
      });

      it('returns true when both ratingKey and liveUuid differ (different sessions)', () => {
        expect(detectMediaChange('channel-1', 'channel-2', 'live-abc', 'live-xyz')).toBe(true);
      });

      it('returns true when ratingKey changes and only existing has liveUuid', () => {
        expect(detectMediaChange('channel-1', 'channel-2', 'live-abc', undefined)).toBe(true);
      });

      it('returns true when ratingKey changes and only new has liveUuid', () => {
        expect(detectMediaChange('channel-1', 'channel-2', undefined, 'live-xyz')).toBe(true);
      });

      it('returns false when ratingKey is same regardless of liveUuid', () => {
        expect(detectMediaChange('channel-1', 'channel-1', 'live-abc', 'live-xyz')).toBe(false);
      });
    });
  });

  describe('processor behavior', () => {
    let cachedSessionKeys: Set<string>;
    let sessionsCreated: { sessionKey: string; ratingKey: string }[];
    let sessionsUpdated: { sessionKey: string; ratingKey: string }[];

    function simulateProcessorDecision(
      serverId: string,
      poll: { sessionKey: string; ratingKey: string },
      existingSessionRatingKey: string | null
    ): 'create' | 'update' {
      const fullSessionKey = `${serverId}:${poll.sessionKey}`;
      const isNew = !cachedSessionKeys.has(fullSessionKey);

      if (isNew) {
        cachedSessionKeys.add(fullSessionKey);
        sessionsCreated.push(poll);
        return 'create';
      }

      if (detectMediaChange(existingSessionRatingKey, poll.ratingKey)) {
        sessionsCreated.push(poll);
        return 'create';
      }

      sessionsUpdated.push(poll);
      return 'update';
    }

    beforeEach(() => {
      cachedSessionKeys = new Set();
      sessionsCreated = [];
      sessionsUpdated = [];
    });

    it('creates separate sessions when media changes', () => {
      const serverId = 'server-1';

      const episode1 = { sessionKey: 'emby-session-abc', ratingKey: 'episode-100' };
      const result1 = simulateProcessorDecision(serverId, episode1, null);

      expect(result1).toBe('create');
      expect(sessionsCreated).toHaveLength(1);

      const episode2 = { sessionKey: 'emby-session-abc', ratingKey: 'episode-101' };
      const result2 = simulateProcessorDecision(serverId, episode2, episode1.ratingKey);

      expect(result2).toBe('create');
      expect(sessionsCreated).toHaveLength(2);
      expect(sessionsUpdated).toHaveLength(0);
    });

    it('updates existing session when media is unchanged', () => {
      const serverId = 'server-1';

      const episode1Start = { sessionKey: 'emby-session-abc', ratingKey: 'episode-100' };
      simulateProcessorDecision(serverId, episode1Start, null);

      const episode1Progress = { sessionKey: 'emby-session-abc', ratingKey: 'episode-100' };
      const result2 = simulateProcessorDecision(
        serverId,
        episode1Progress,
        episode1Start.ratingKey
      );

      expect(result2).toBe('update');
      expect(sessionsCreated).toHaveLength(1);
      expect(sessionsUpdated).toHaveLength(1);
    });
  });
});
