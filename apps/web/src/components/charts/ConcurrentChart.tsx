import { useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { ChartSkeleton } from '@/components/ui/skeleton';

interface ConcurrentData {
  hour: string;
  total: number;
  direct: number;
  transcode: number;
}

interface ConcurrentChartProps {
  data: ConcurrentData[] | undefined;
  isLoading?: boolean;
  height?: number;
  period?: 'day' | 'week' | 'month' | 'year' | 'all' | 'custom';
}

export function ConcurrentChart({
  data,
  isLoading,
  height = 250,
  period = 'month',
}: ConcurrentChartProps) {
  const options = useMemo<Highcharts.Options>(() => {
    if (!data || data.length === 0) {
      return {};
    }

    return {
      chart: {
        type: 'area',
        height,
        backgroundColor: 'transparent',
        style: {
          fontFamily: 'inherit',
        },
        reflow: true,
      },
      title: {
        text: undefined,
      },
      credits: {
        enabled: false,
      },
      legend: {
        enabled: true,
        align: 'right',
        verticalAlign: 'top',
        floating: true,
        itemStyle: {
          color: 'hsl(var(--muted-foreground))',
          fontWeight: 'normal',
          fontSize: '11px',
        },
        itemHoverStyle: {
          color: 'hsl(var(--foreground))',
        },
      },
      xAxis: {
        categories: data.map((d) => d.hour),
        labels: {
          style: {
            color: 'hsl(var(--muted-foreground))',
          },
          formatter: function () {
            const categories = this.axis.categories;
            const categoryValue =
              typeof this.value === 'number' ? categories[this.value] : this.value;
            if (!categoryValue) return '';
            // PostgreSQL: "2026-01-28 05:00:00+00" -> JS needs "2026-01-28T05:00:00+00:00"
            const normalized = categoryValue.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00');
            const date = new Date(normalized);
            if (isNaN(date.getTime())) return '';

            if (period === 'year' || period === 'all') {
              return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            }
            if (period === 'day') {
              // Hourly - show time only
              return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
            }
            // week (6-hour) / month (daily): M/D format
            return `${date.getMonth() + 1}/${date.getDate()}`;
          },
          // Show ~7 labels for week, ~8 for day, ~12 for others
          step: Math.ceil(data.length / (period === 'week' ? 7 : period === 'day' ? 8 : 12)),
        },
        lineColor: 'hsl(var(--border))',
        tickColor: 'hsl(var(--border))',
      },
      yAxis: {
        title: {
          text: undefined,
        },
        labels: {
          style: {
            color: 'hsl(var(--muted-foreground))',
          },
        },
        gridLineColor: 'hsl(var(--border))',
        min: 0,
        allowDecimals: false,
      },
      plotOptions: {
        area: {
          stacking: 'normal',
          marker: {
            enabled: false,
            states: {
              hover: {
                enabled: true,
                radius: 4,
              },
            },
          },
          lineWidth: 2,
          states: {
            hover: {
              lineWidth: 2,
            },
          },
          threshold: null,
        },
      },
      tooltip: {
        backgroundColor: 'hsl(var(--popover))',
        borderColor: 'hsl(var(--border))',
        style: {
          color: 'hsl(var(--popover-foreground))',
        },
        shared: true,
        formatter: function () {
          const points = this.points || [];
          // Get category from axis using x index
          const categories = points[0]?.series?.xAxis?.categories;
          const xIndex = typeof this.x === 'number' ? this.x : 0;
          const categoryValue = categories?.[xIndex];
          // PostgreSQL: "2026-01-28 05:00:00+00" -> JS needs "2026-01-28T05:00:00+00:00"
          const normalized = categoryValue?.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00');
          const date = normalized ? new Date(normalized) : null;

          let dateStr = 'Unknown';
          if (date && !isNaN(date.getTime())) {
            if (period === 'all') {
              dateStr = `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
            } else if (period === 'year' || period === 'month') {
              // Daily buckets - just show date
              dateStr = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
            } else {
              // day (hourly) or week (6-hour) - show date and time
              dateStr = `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })}`;
            }
          }
          let html = `<b>${dateStr}</b>`;

          let total = 0;
          points.forEach((point) => {
            total += point.y || 0;
            html += `<br/><span style="color:${point.color}">●</span> ${point.series.name}: ${point.y}`;
          });
          html += `<br/><b>Peak Concurrent: ${total}</b>`;

          return html;
        },
      },
      series: [
        {
          type: 'area',
          name: 'Direct Play',
          data: data.map((d) => d.direct),
          color: 'hsl(var(--chart-2))',
          fillColor: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
              [0, 'hsl(var(--chart-2) / 0.4)'],
              [1, 'hsl(var(--chart-2) / 0.1)'],
            ],
          },
        },
        {
          type: 'area',
          name: 'Transcode',
          data: data.map((d) => d.transcode),
          color: 'hsl(var(--chart-4))',
          fillColor: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
              [0, 'hsl(var(--chart-4) / 0.4)'],
              [1, 'hsl(var(--chart-4) / 0.1)'],
            ],
          },
        },
      ],
      responsive: {
        rules: [
          {
            condition: {
              maxWidth: 400,
            },
            chartOptions: {
              legend: {
                floating: false,
                align: 'center',
                verticalAlign: 'bottom',
                itemStyle: {
                  fontSize: '10px',
                },
              },
              xAxis: {
                labels: {
                  style: {
                    fontSize: '9px',
                  },
                },
              },
              yAxis: {
                labels: {
                  style: {
                    fontSize: '9px',
                  },
                },
              },
            },
          },
        ],
      },
    };
  }, [data, height, period]);

  if (isLoading) {
    return <ChartSkeleton height={height} />;
  }

  if (!data || data.length === 0) {
    return (
      <div
        className="text-muted-foreground flex items-center justify-center rounded-lg border border-dashed"
        style={{ height }}
      >
        No concurrent stream data available
      </div>
    );
  }

  return (
    <HighchartsReact
      highcharts={Highcharts}
      options={options}
      containerProps={{ style: { width: '100%', height: '100%' } }}
    />
  );
}
