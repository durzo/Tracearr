import { useMemo } from 'react';
import { Database, HardDrive, Film, Tv, Calendar, TrendingUp } from 'lucide-react';
import type { GrowthDataPoint } from '@tracearr/shared';
import { StatCard, formatNumber } from '@/components/ui/stat-card';
import { LibraryStatsSkeleton } from '@/components/ui/skeleton';
import { TimeRangePicker } from '@/components/ui/time-range-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState, LibraryEmptyState } from '@/components/library';
import { LibraryGrowthChart } from '@/components/charts';
import { useLibraryStats, useLibraryGrowth, useLibraryStatus } from '@/hooks/queries';
import { useServer } from '@/hooks/useServer';
import { useTimeRange } from '@/hooks/useTimeRange';
import { formatBytes } from '@/lib/formatters';
import { getHour12 } from '@/lib/timeFormat';

/**
 * Format date for last updated display
 */
function formatLastUpdated(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: getHour12(),
  });
}

export function LibraryOverview() {
  const { selectedServerId } = useServer();
  const { value: timeRange, setValue: setTimeRange } = useTimeRange();
  const status = useLibraryStatus(selectedServerId);
  const { data: stats, isLoading, isError, error, refetch } = useLibraryStats(selectedServerId);

  // Map TimeRangePicker periods to API format
  const apiPeriod = useMemo(() => {
    switch (timeRange.period) {
      case 'week':
        return '7d';
      case 'month':
        return '30d';
      case 'year':
        return '1y';
      case 'all':
        return 'all';
      default:
        return '30d';
    }
  }, [timeRange.period]);

  const growth = useLibraryGrowth(selectedServerId, null, apiPeriod);

  // Calculate period changes from growth data
  const periodChanges = useMemo(() => {
    if (!growth.data) {
      return { movies: 0, episodes: 0, music: 0, total: 0 };
    }

    // Sum additions from each media type
    const sumAdditions = (series: GrowthDataPoint[] | undefined) =>
      series?.reduce((sum, d) => sum + d.additions, 0) ?? 0;

    const movies = sumAdditions(growth.data.movies);
    const episodes = sumAdditions(growth.data.episodes);
    const music = sumAdditions(growth.data.music);

    return { movies, episodes, music, total: movies + episodes + music };
  }, [growth.data]);

  // Period label for display
  const periodLabel = useMemo(() => {
    switch (timeRange.period) {
      case 'week':
        return 'this week';
      case 'month':
        return 'this month';
      case 'year':
        return 'this year';
      case 'all':
        return 'all time';
      default:
        return 'this period';
    }
  }, [timeRange.period]);

  // Show loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header with time range picker */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Library</h1>
            <p className="text-muted-foreground text-sm">Library health and growth metrics</p>
          </div>
          <TimeRangePicker value={timeRange} onChange={setTimeRange} />
        </div>
        <LibraryStatsSkeleton />
      </div>
    );
  }

  // Show error state with retry
  if (isError) {
    return (
      <div className="space-y-6">
        {/* Header with time range picker */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Library</h1>
            <p className="text-muted-foreground text-sm">Library health and growth metrics</p>
          </div>
          <TimeRangePicker value={timeRange} onChange={setTimeRange} />
        </div>
        <ErrorState
          title="Failed to load library statistics"
          message={error?.message ?? 'Could not fetch library data. Please try again.'}
          onRetry={refetch}
        />
      </div>
    );
  }

  // Show empty state if library not synced or needs backfill
  const needsSetup =
    !status.isLoading &&
    (!status.data?.isSynced || status.data?.needsBackfill || status.data?.isBackfillRunning);
  if (needsSetup) {
    return (
      <div className="space-y-6">
        {/* Header with time range picker */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Library</h1>
            <p className="text-muted-foreground text-sm">Library health and growth metrics</p>
          </div>
          <TimeRangePicker value={timeRange} onChange={setTimeRange} />
        </div>
        <LibraryEmptyState onComplete={refetch} />
      </div>
    );
  }

  // Format period change for display
  const periodChangeLabel =
    periodChanges.total > 0 ? `+${formatNumber(periodChanges.total)} ${periodLabel}` : undefined;

  return (
    <div className="space-y-6">
      {/* Header with last updated and time range picker */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Library</h1>
          <p className="text-muted-foreground text-sm">Library health and growth metrics</p>
          <div className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
            <Calendar className="h-3 w-3" />
            <span>Last updated: {formatLastUpdated(stats?.asOf)}</span>
          </div>
        </div>
        <TimeRangePicker value={timeRange} onChange={setTimeRange} />
      </div>

      {/* KPI Cards Grid - 5 columns on desktop, 3 on tablet, 2 on mobile */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          icon={Database}
          label="Total Items"
          value={formatNumber(stats?.totalItems ?? 0)}
          subValue={periodChangeLabel}
          isLoading={growth.isLoading}
        />
        <StatCard icon={HardDrive} label="Total Size" value={formatBytes(stats?.totalSizeBytes)} />
        <StatCard icon={Film} label="Movies" value={formatNumber(stats?.movieCount ?? 0)} />
        <StatCard
          icon={Tv}
          label="Episodes"
          value={formatNumber(stats?.episodeCount ?? 0)}
          subValue={stats?.showCount ? `${formatNumber(stats.showCount)} shows` : undefined}
        />
        <StatCard
          icon={TrendingUp}
          label="Added"
          value={`+${formatNumber(periodChanges.total)}`}
          subValue={periodLabel}
          isLoading={growth.isLoading}
        />
      </div>

      {/* Library Growth */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Library Growth</CardTitle>
        </CardHeader>
        <CardContent>
          <LibraryGrowthChart
            data={growth.data}
            isLoading={growth.isLoading}
            height={250}
            period={timeRange.period}
          />
        </CardContent>
      </Card>
    </div>
  );
}
