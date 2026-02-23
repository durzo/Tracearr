import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JellyfinClient } from '../../jellyfin/client.js';

vi.mock('../../../../utils/http.js', () => ({
  fetchJson: vi.fn(),
  jellyfinEmbyHeaders: vi.fn().mockReturnValue({}),
}));

import { fetchJson } from '../../../../utils/http.js';

const mockFetchJson = vi.mocked(fetchJson);

function makeClient() {
  return new JellyfinClient({ url: 'http://jellyfin.local:8096', token: 'test-api-key' });
}

function makeItemsResponse(items: unknown[] = [], totalRecordCount = 0) {
  return { Items: items, TotalRecordCount: totalRecordCount };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('BaseMediaServerClient incremental fetch methods', () => {
  describe('getLibraryItemsSince', () => {
    it('uses the /Items endpoint', async () => {
      mockFetchJson.mockResolvedValue(makeItemsResponse());

      const client = makeClient();
      await client.getLibraryItemsSince('lib-1', new Date('2024-06-01T00:00:00Z'));

      const calledUrl = mockFetchJson.mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain('/Items?');
    });

    it('includes minDateLastSaved as ISO 8601 in the query string', async () => {
      mockFetchJson.mockResolvedValue(makeItemsResponse());

      const since = new Date('2024-06-01T12:00:00.000Z');
      const client = makeClient();
      await client.getLibraryItemsSince('lib-1', since);

      const calledUrl = mockFetchJson.mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain(`minDateLastSaved=${encodeURIComponent(since.toISOString())}`);
    });

    it('includes ParentId in the query string', async () => {
      mockFetchJson.mockResolvedValue(makeItemsResponse());

      const client = makeClient();
      await client.getLibraryItemsSince('abc-123', new Date());

      const calledUrl = mockFetchJson.mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain('ParentId=abc-123');
    });

    it('includes Recursive=true', async () => {
      mockFetchJson.mockResolvedValue(makeItemsResponse());

      const client = makeClient();
      await client.getLibraryItemsSince('lib-1', new Date());

      const calledUrl = mockFetchJson.mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain('Recursive=true');
    });

    it('includes the expected IncludeItemTypes (no Episode)', async () => {
      mockFetchJson.mockResolvedValue(makeItemsResponse());

      const client = makeClient();
      await client.getLibraryItemsSince('lib-1', new Date());

      const calledUrl = mockFetchJson.mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain(
        'IncludeItemTypes=Movie%2CSeries%2CMusicArtist%2CMusicAlbum%2CAudio'
      );
    });

    it('includes IsMissing=false', async () => {
      mockFetchJson.mockResolvedValue(makeItemsResponse());

      const client = makeClient();
      await client.getLibraryItemsSince('lib-1', new Date());

      const calledUrl = mockFetchJson.mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain('IsMissing=false');
    });

    it('includes Fields parameter', async () => {
      mockFetchJson.mockResolvedValue(makeItemsResponse());

      const client = makeClient();
      await client.getLibraryItemsSince('lib-1', new Date());

      const calledUrl = mockFetchJson.mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain('Fields=');
      expect(calledUrl).toContain('ProviderIds');
    });

    it('passes offset and limit as StartIndex and Limit', async () => {
      mockFetchJson.mockResolvedValue(makeItemsResponse());

      const client = makeClient();
      await client.getLibraryItemsSince('lib-1', new Date(), { offset: 100, limit: 50 });

      const calledUrl = mockFetchJson.mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain('StartIndex=100');
      expect(calledUrl).toContain('Limit=50');
    });

    it('defaults offset to 0 and limit to 100 when options are omitted', async () => {
      mockFetchJson.mockResolvedValue(makeItemsResponse());

      const client = makeClient();
      await client.getLibraryItemsSince('lib-1', new Date());

      const calledUrl = mockFetchJson.mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain('StartIndex=0');
      expect(calledUrl).toContain('Limit=100');
    });

    it('returns items and totalCount in the expected shape', async () => {
      mockFetchJson.mockResolvedValue(makeItemsResponse([], 42));

      const client = makeClient();
      const result = await client.getLibraryItemsSince('lib-1', new Date());

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('totalCount', 42);
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('falls back to items.length when TotalRecordCount is absent', async () => {
      mockFetchJson.mockResolvedValue({ Items: [] });

      const client = makeClient();
      const result = await client.getLibraryItemsSince('lib-1', new Date());

      expect(result.totalCount).toBe(0);
      expect(result.items).toEqual([]);
    });
  });

  describe('getLibraryLeavesSince', () => {
    it('uses the /Items endpoint', async () => {
      mockFetchJson.mockResolvedValue(makeItemsResponse());

      const client = makeClient();
      await client.getLibraryLeavesSince('lib-2', new Date('2024-03-01T00:00:00Z'));

      const calledUrl = mockFetchJson.mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain('/Items?');
    });

    it('includes minDateLastSaved as ISO 8601 in the query string', async () => {
      mockFetchJson.mockResolvedValue(makeItemsResponse());

      const since = new Date('2024-03-20T08:30:00.000Z');
      const client = makeClient();
      await client.getLibraryLeavesSince('lib-2', since);

      const calledUrl = mockFetchJson.mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain(`minDateLastSaved=${encodeURIComponent(since.toISOString())}`);
    });

    it('uses IncludeItemTypes=Episode', async () => {
      mockFetchJson.mockResolvedValue(makeItemsResponse());

      const client = makeClient();
      await client.getLibraryLeavesSince('lib-2', new Date());

      const calledUrl = mockFetchJson.mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain('IncludeItemTypes=Episode');
    });

    it('includes ParentId in the query string', async () => {
      mockFetchJson.mockResolvedValue(makeItemsResponse());

      const client = makeClient();
      await client.getLibraryLeavesSince('xyz-999', new Date());

      const calledUrl = mockFetchJson.mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain('ParentId=xyz-999');
    });

    it('includes Recursive=true', async () => {
      mockFetchJson.mockResolvedValue(makeItemsResponse());

      const client = makeClient();
      await client.getLibraryLeavesSince('lib-2', new Date());

      const calledUrl = mockFetchJson.mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain('Recursive=true');
    });

    it('includes IsMissing=false', async () => {
      mockFetchJson.mockResolvedValue(makeItemsResponse());

      const client = makeClient();
      await client.getLibraryLeavesSince('lib-2', new Date());

      const calledUrl = mockFetchJson.mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain('IsMissing=false');
    });

    it('includes Fields parameter with episode metadata fields', async () => {
      mockFetchJson.mockResolvedValue(makeItemsResponse());

      const client = makeClient();
      await client.getLibraryLeavesSince('lib-2', new Date());

      const calledUrl = mockFetchJson.mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain('Fields=');
      expect(calledUrl).toContain('SeriesId');
      expect(calledUrl).toContain('ParentIndexNumber');
    });

    it('passes offset and limit as StartIndex and Limit', async () => {
      mockFetchJson.mockResolvedValue(makeItemsResponse());

      const client = makeClient();
      await client.getLibraryLeavesSince('lib-2', new Date(), { offset: 200, limit: 25 });

      const calledUrl = mockFetchJson.mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain('StartIndex=200');
      expect(calledUrl).toContain('Limit=25');
    });

    it('returns items and totalCount in the expected shape', async () => {
      mockFetchJson.mockResolvedValue(makeItemsResponse([], 7));

      const client = makeClient();
      const result = await client.getLibraryLeavesSince('lib-2', new Date());

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('totalCount', 7);
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('falls back to items.length when TotalRecordCount is absent', async () => {
      mockFetchJson.mockResolvedValue({ Items: [] });

      const client = makeClient();
      const result = await client.getLibraryLeavesSince('lib-2', new Date());

      expect(result.totalCount).toBe(0);
      expect(result.items).toEqual([]);
    });
  });
});
