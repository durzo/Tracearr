import { useState, useMemo, lazy, Suspense } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow, format } from 'date-fns';
import type { ColumnDef } from '@tanstack/react-table';
import type {
  ViolationSessionInfo,
  LocationStats,
  GroupEvidence,
  ConditionEvidence,
} from '@tracearr/shared';
import {
  getViolationDescription,
  getViolationDetails,
  collectViolationSessions,
  CONDITION_FIELD_LABELS,
  OPERATOR_LABELS,
} from '@tracearr/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SeverityBadge } from '@/components/violations/SeverityBadge';
import { ActionResultsList } from '@/components/violations/ActionResultsList';
import { getAvatarUrl } from '@/components/users/utils';
import { getCountryName, getMediaDisplay } from '@/lib/utils';
import {
  useViolation,
  useAcknowledgeViolation,
  useDismissViolation,
  useSettings,
} from '@/hooks/queries';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  User,
  ArrowLeft,
  AlertTriangle,
  Check,
  X,
  MapPin,
  Clock,
  AlertCircle,
  Film,
  CheckCircle2,
  XCircle,
  Shield,
} from 'lucide-react';

const StreamMap = lazy(() =>
  import('@/components/map/StreamMap').then((m) => ({ default: m.StreamMap }))
);

import { ruleIconsLarge as ruleIcons } from '@/components/violations/ruleIcons';

function ConditionEvidenceRow({
  condition,
  unitSystem: _unitSystem,
}: {
  condition: ConditionEvidence;
  unitSystem: string;
}) {
  const label = CONDITION_FIELD_LABELS[condition.field] ?? condition.field;
  const op = OPERATOR_LABELS[condition.operator] ?? condition.operator;
  const actual =
    condition.actual !== null && condition.actual !== undefined
      ? String(condition.actual)
      : 'unknown';
  const threshold = String(condition.threshold);

  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-0.5 shrink-0">
        {condition.matched ? (
          <CheckCircle2 className="h-4 w-4 text-red-500" />
        ) : (
          <XCircle className="text-muted-foreground h-4 w-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-sm font-medium">{label}</span>
          <span className="text-muted-foreground text-xs">
            {op} {threshold}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span
            className={`text-sm ${condition.matched ? 'font-semibold text-red-600' : 'text-muted-foreground'}`}
          >
            Actual: {actual}
          </span>
          {condition.relatedSessionIds && condition.relatedSessionIds.length > 0 && (
            <span className="text-muted-foreground text-xs">
              ({condition.relatedSessionIds.length} related session
              {condition.relatedSessionIds.length !== 1 ? 's' : ''})
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function EvidenceGroupCard({ group, unitSystem }: { group: GroupEvidence; unitSystem: string }) {
  const matchedCount = group.conditions.filter((c) => c.matched).length;
  const totalCount = group.conditions.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Condition Group {group.groupIndex + 1}
          </span>
          <Badge variant={group.matched ? 'destructive' : 'secondary'} className="text-xs">
            {matchedCount}/{totalCount} matched
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y">
          {group.conditions.map((condition, idx) => (
            <ConditionEvidenceRow
              key={`${condition.field}-${idx}`}
              condition={condition}
              unitSystem={unitSystem}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ViolationDetail() {
  const { t } = useTranslation(['pages', 'common']);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [dismissConfirmOpen, setDismissConfirmOpen] = useState(false);

  const { data: violation, isLoading } = useViolation(id!);
  const { data: settings } = useSettings();
  const unitSystem = settings?.unitSystem ?? 'metric';
  const acknowledgeViolation = useAcknowledgeViolation();
  const dismissViolation = useDismissViolation();

  // Collect all sessions (triggering + related, deduped)
  const allSessions = useMemo(
    () => (violation ? collectViolationSessions(violation) : []),
    [violation]
  );

  // Map sessions to LocationStats for StreamMap
  const mapLocations = useMemo((): LocationStats[] => {
    const locationMap = new Map<string, LocationStats>();

    for (const session of allSessions) {
      if (session.geoLat == null || session.geoLon == null) continue;
      const key = `${session.geoLat},${session.geoLon}`;
      const existing = locationMap.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        locationMap.set(key, {
          city: session.geoCity,
          region: session.geoRegion,
          country: session.geoCountry,
          lat: session.geoLat,
          lon: session.geoLon,
          count: 1,
        });
      }
    }

    return Array.from(locationMap.values());
  }, [allSessions]);

  const hasGeoData = mapLocations.length > 0;

  // Session table columns
  const sessionColumns: ColumnDef<ViolationSessionInfo>[] = useMemo(
    () => [
      {
        accessorKey: 'mediaTitle',
        header: t('common:labels.media'),
        cell: ({ row }) => {
          const session = row.original;
          const { title, subtitle } = getMediaDisplay(session);
          const isTriggering = violation?.session?.id === session.id;
          return (
            <div className="flex items-center gap-2">
              <div className="max-w-[200px]">
                <p className="truncate font-medium">{title}</p>
                {subtitle ? (
                  <p className="text-muted-foreground text-xs">{subtitle}</p>
                ) : (
                  <p className="text-muted-foreground text-xs capitalize">{session.mediaType}</p>
                )}
              </div>
              {isTriggering && (
                <Badge
                  variant="outline"
                  className="text-primary border-primary/50 shrink-0 text-xs"
                >
                  {t('pages:violations.detail.trigger')}
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'ipAddress',
        header: t('common:labels.ipAddress'),
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.ipAddress}</span>,
      },
      {
        accessorKey: 'geoCity',
        header: t('common:labels.location'),
        cell: ({ row }) => {
          const session = row.original;
          if (!session.geoCity && !session.geoCountry) {
            return <span className="text-muted-foreground">—</span>;
          }
          return (
            <span className="text-sm">
              {session.geoCity && `${session.geoCity}, `}
              {getCountryName(session.geoCountry) ?? ''}
            </span>
          );
        },
      },
      {
        accessorKey: 'device',
        header: t('common:labels.device'),
        cell: ({ row }) => {
          const session = row.original;
          return (
            <div className="text-sm">
              <p>{session.device || session.platform || t('common:labels.unknown')}</p>
              {session.playerName && (
                <p className="text-muted-foreground text-xs">{session.playerName}</p>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'quality',
        header: t('common:labels.quality'),
        cell: ({ row }) => <span className="text-sm">{row.original.quality ?? '—'}</span>,
      },
      {
        accessorKey: 'startedAt',
        header: t('common:labels.started'),
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {formatDistanceToNow(new Date(row.original.startedAt), { addSuffix: true })}
          </span>
        ),
      },
    ],
    [t, violation?.session?.id]
  );

  const handleAcknowledge = () => {
    if (!violation) return;
    acknowledgeViolation.mutate(violation.id);
  };

  const handleDismiss = () => {
    if (!violation) return;
    dismissViolation.mutate(violation.id, {
      onSuccess: () => {
        setDismissConfirmOpen(false);
        void navigate('/violations');
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Skeleton className="h-48" />
          </div>
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!violation) {
    return (
      <div className="space-y-6">
        <Link to="/violations">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common:actions.back')}
          </Button>
        </Link>
        <Card>
          <CardContent className="flex h-32 items-center justify-center">
            <p className="text-muted-foreground">{t('pages:violations.detail.notFound')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const description = getViolationDescription(violation, unitSystem);
  const details = getViolationDetails(violation, unitSystem);
  const isPending = !violation.acknowledgedAt;
  const ruleIcon = (violation.rule.type && ruleIcons[violation.rule.type]) ?? (
    <AlertTriangle className="h-5 w-5" />
  );
  const avatarUrl = getAvatarUrl(violation.user.serverId, violation.user.thumbUrl, 80);
  const isInactivity = violation.rule.type === 'account_inactivity';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link to="/violations">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('common:actions.back')}
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
              {ruleIcon}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{violation.rule.name}</h1>
                <SeverityBadge severity={violation.severity} />
              </div>
              <p className="text-muted-foreground text-sm">{description}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isPending && (
            <Button onClick={handleAcknowledge} disabled={acknowledgeViolation.isPending}>
              <Check className="mr-2 h-4 w-4" />
              {acknowledgeViolation.isPending
                ? t('common:states.acknowledging')
                : t('common:actions.acknowledge')}
            </Button>
          )}
          <Button variant="destructive" onClick={() => setDismissConfirmOpen(true)}>
            <X className="mr-2 h-4 w-4" />
            {t('common:actions.dismiss')}
          </Button>
        </div>
      </div>

      {/* Timestamps row */}
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="flex items-center gap-1.5">
          <Clock className="h-4 w-4" />
          {t('pages:violations.detail.detected')}{' '}
          {formatDistanceToNow(new Date(violation.createdAt), { addSuffix: true })}
        </span>
        {violation.acknowledgedAt && (
          <>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-green-600" />
              {t('common:states.acknowledged')}{' '}
              {formatDistanceToNow(new Date(violation.acknowledgedAt), { addSuffix: true })}
            </span>
          </>
        )}
      </div>

      {/* Top row: Violation Details + User Info */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Violation Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('pages:violations.detail.violationDetails')}</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(details).length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {Object.entries(details).map(([key, value]) => {
                  if (Array.isArray(value)) {
                    return (
                      <div key={key} className="col-span-full">
                        <p className="text-muted-foreground mb-1 text-xs">{key}</p>
                        <div className="flex flex-wrap gap-1">
                          {value.map((item, idx) => (
                            <span
                              key={idx}
                              className="bg-muted inline-flex items-center rounded-md px-2 py-1 text-xs font-medium"
                            >
                              {String(item)}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={key}>
                      <p className="text-muted-foreground mb-1 text-xs">{key}</p>
                      <p className="text-sm font-medium">{String(value)}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">{description}</p>
            )}
          </CardContent>
        </Card>

        {/* User Info */}
        <Card>
          <CardHeader>
            <CardTitle>{t('pages:violations.detail.userInfo')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link to={`/users/${violation.user.id}`} className="group flex items-center gap-4">
              <div className="bg-muted flex h-14 w-14 shrink-0 items-center justify-center rounded-full">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={violation.user.identityName ?? violation.user.username}
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  <User className="text-muted-foreground h-7 w-7" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold group-hover:underline">
                  {violation.user.identityName ?? violation.user.username}
                </p>
                <p className="text-muted-foreground truncate text-sm">@{violation.user.username}</p>
                {violation.server?.name && (
                  <p className="text-muted-foreground truncate text-xs">{violation.server.name}</p>
                )}
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Condition Evidence (V2 violations) */}
      {violation.evidence && violation.evidence.length > 0 && (
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Shield className="h-5 w-5" />
            Condition Evidence
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {violation.evidence.map((group) => (
              <EvidenceGroupCard key={group.groupIndex} group={group} unitSystem={unitSystem} />
            ))}
          </div>
        </div>
      )}

      {/* Sessions Table */}
      {allSessions.length > 0 && !isInactivity && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Film className="h-5 w-5" />
              {t('pages:violations.detail.sessions')}
              <Badge variant="secondary" className="ml-1">
                {allSessions.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={sessionColumns}
              data={allSessions}
              emptyMessage={t('pages:violations.detail.noSessions')}
            />
          </CardContent>
        </Card>
      )}

      {/* Map */}
      {hasGeoData && !isInactivity && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {t('pages:violations.detail.map')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] overflow-hidden rounded-lg">
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center">
                    <Skeleton className="h-full w-full" />
                  </div>
                }
              >
                <StreamMap locations={mapLocations} viewMode="circles" />
              </Suspense>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account Inactivity Details */}
      {isInactivity && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t('pages:violations.detail.inactivity')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
              <div>
                <p className="text-muted-foreground mb-1 text-xs">
                  {t('pages:violations.detail.daysInactive')}
                </p>
                <p className="text-3xl font-bold">
                  {(violation.data.inactiveDays as number) ?? 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1 text-xs">
                  {t('pages:violations.detail.threshold')}
                </p>
                <p className="text-3xl font-bold">
                  {(violation.data.thresholdDays as number) ?? 'N/A'}
                  <span className="text-muted-foreground ml-1 text-sm font-normal">
                    {t('common:labels.days')}
                  </span>
                </p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <p className="text-muted-foreground mb-1 text-xs">
                  {t('pages:violations.detail.lastActivity')}
                </p>
                {violation.data.neverActive ? (
                  <p className="flex items-center gap-1 font-medium text-yellow-600">
                    <AlertCircle className="h-4 w-4" />
                    {t('pages:violations.detail.neverActive')}
                  </p>
                ) : violation.data.lastActivityAt ? (
                  <div>
                    <p className="font-medium">
                      {format(new Date(violation.data.lastActivityAt as string), 'PPpp')}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {formatDistanceToNow(new Date(violation.data.lastActivityAt as string), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">{t('common:labels.unknown')}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Results */}
      {violation.actionResults && violation.actionResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('pages:violations.detail.actions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionResultsList results={violation.actionResults} />
          </CardContent>
        </Card>
      )}

      {/* Timestamps */}
      <Card>
        <CardHeader>
          <CardTitle>{t('pages:violations.detail.timestamps')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground mb-1 text-xs">
                {t('pages:violations.detail.created')}
              </p>
              <p className="text-sm font-medium">{format(new Date(violation.createdAt), 'PPpp')}</p>
              <p className="text-muted-foreground text-xs">
                {formatDistanceToNow(new Date(violation.createdAt), { addSuffix: true })}
              </p>
            </div>
            {violation.acknowledgedAt && (
              <div>
                <p className="text-muted-foreground mb-1 text-xs">
                  {t('pages:violations.detail.acknowledged')}
                </p>
                <p className="text-sm font-medium">
                  {format(new Date(violation.acknowledgedAt), 'PPpp')}
                </p>
                <p className="text-muted-foreground text-xs">
                  {formatDistanceToNow(new Date(violation.acknowledgedAt), { addSuffix: true })}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dismiss Confirmation Dialog */}
      <Dialog open={dismissConfirmOpen} onOpenChange={setDismissConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('pages:violations.dismissViolation')}</DialogTitle>
            <DialogDescription>{t('pages:violations.dismissViolationConfirm')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDismissConfirmOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDismiss}
              disabled={dismissViolation.isPending}
            >
              {dismissViolation.isPending
                ? t('common:states.dismissing')
                : t('common:actions.dismiss')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
