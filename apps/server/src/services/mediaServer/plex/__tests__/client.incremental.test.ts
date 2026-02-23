import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlexClient } from '../client.js';

vi.mock('../../../../utils/http.js', () => ({
  fetchJson: vi.fn(),
  fetchText: vi.fn(),
  plexHeaders: vi.fn().mockReturnValue({ 'X-Plex-Token': 'test-token' }),
}));

import { fetchJson } from '../../../../utils/http.js';

const mockFetchJson = vi.mocked(fetchJson);

function makeClient() {
  return new PlexClient({ url: 'http://plex.local:32400', token: 'test-token' });
}

function makeMediaContainerResponse(items: unknown[] = [], totalSize = 0) {
  return {
    MediaContainer: {
      totalSize,
      Metadata: items,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PlexClient incremental fetch methods', () => {
  describe('getLibraryItemsSince', () => {
    it('uses the /library/sections/{id}/all endpoint', async () => {
      mockFetchJson.mockResolvedValue(makeMediaContainerResponse());

      const client = makeClient();
      await client.getLibraryItemsSince('42', new Date('2024-01-15T00:00:00Z'));

      const calledUrl = mockFetchJson.mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain('/library/sections/42/all');
    });

    it('includes addedAt>>= as unix seconds in the query string', async () => {
      mockFetchJson.mockResolvedValue(makeMediaContainerResponse());

      const since = new Date('2024-06-01T12:00:00Z');
      const expectedUnix = String(Math.floor(since.getTime() / 1000));

      const client = makeClient();
      await client.getLibraryItemsSince('1', since);

      const calledUrl = mockFetchJson.mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain(`addedAt%3E%3E%3D=${expectedUnix}`);
    });

    it('includes includeGuids=1 in the query string', async () => {
      mockFetchJson.mockResolvedValue(makeMediaContainerResponse());

      const client = makeClient();
      await client.getLibraryItemsSince('1', new Date());

      const calledUrl = mockFetchJson.mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain('includeGuids=1');
    });

    it('returns items and totalCount in the expected shape', async () => {
      const mockItem = {
        ratingKey: '101',
        title: 'New Movie',
        type: 'movie',
        year: 2024,
        addedAt: 1717200000,
        Media: [{ Part: [{ file: '/movies/new.mkv', size: 8000000000 }] }],
        Guid: [],
      };
      mockFetchJson.mockResolvedValue(makeMediaContainerResponse([mockItem], 1));

      const client = makeClient();
      const result = await client.getLibraryItemsSince('1', new Date('2024-01-01T00:00:00Z'));

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('totalCount', 1);
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('returns totalCount of 0 when MediaContainer is absent', async () => {
      mockFetchJson.mockResolvedValue({});

      const client = makeClient();
      const result = await client.getLibraryItemsSince('1', new Date());

      expect(result.totalCount).toBe(0);
      expect(result.items).toEqual([]);
    });

    it('passes offset and limit pagination options', async () => {
      mockFetchJson.mockResolvedValue(makeMediaContainerResponse());

      const client = makeClient();
      await client.getLibraryItemsSince('5', new Date(), { offset: 200, limit: 50 });

      const calledUrl = mockFetchJson.mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain('X-Plex-Container-Start=200');
      expect(calledUrl).toContain('X-Plex-Container-Size=50');
    });
  });

  describe('getLibraryLeavesSince', () => {
    it('uses the /library/sections/{id}/allLeaves endpoint', async () => {
      mockFetchJson.mockResolvedValue(makeMediaContainerResponse());

      const client = makeClient();
      await client.getLibraryLeavesSince('7', new Date('2024-01-15T00:00:00Z'));

      const calledUrl = mockFetchJson.mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain('/library/sections/7/allLeaves');
    });

    it('includes addedAt>>= as unix seconds in the query string', async () => {
      mockFetchJson.mockResolvedValue(makeMediaContainerResponse());

      const since = new Date('2024-03-20T08:30:00Z');
      const expectedUnix = String(Math.floor(since.getTime() / 1000));

      const client = makeClient();
      await client.getLibraryLeavesSince('7', since);

      const calledUrl = mockFetchJson.mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain(`addedAt%3E%3E%3D=${expectedUnix}`);
    });

    it('includes includeGuids=1 in the query string', async () => {
      mockFetchJson.mockResolvedValue(makeMediaContainerResponse());

      const client = makeClient();
      await client.getLibraryLeavesSince('7', new Date());

      const calledUrl = mockFetchJson.mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain('includeGuids=1');
    });

    it('returns items and totalCount in the expected shape', async () => {
      const mockEpisode = {
        ratingKey: '202',
        title: 'Pilot',
        type: 'episode',
        year: 2024,
        addedAt: 1717200000,
        Media: [{ Part: [{ file: '/shows/s01e01.mkv', size: 2000000000 }] }],
        Guid: [],
      };
      mockFetchJson.mockResolvedValue(makeMediaContainerResponse([mockEpisode], 1));

      const client = makeClient();
      const result = await client.getLibraryLeavesSince('7', new Date('2024-01-01T00:00:00Z'));

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('totalCount', 1);
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('returns totalCount of 0 when MediaContainer is absent', async () => {
      mockFetchJson.mockResolvedValue({});

      const client = makeClient();
      const result = await client.getLibraryLeavesSince('7', new Date());

      expect(result.totalCount).toBe(0);
      expect(result.items).toEqual([]);
    });
  });
});
