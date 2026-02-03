/**
 * General settings section - appearance, application settings, network, and API key.
 */
import { useState } from 'react';
import { Link as RouterLink } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Field, FieldGroup, FieldLabel, FieldDescription, FieldError } from '@/components/ui/field';
import {
  AutosaveTextField,
  AutosaveNumberField,
  AutosaveSelectField,
  AutosaveSwitchField,
  SaveStatusIndicator,
} from '@/components/ui/autosave-field';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  RefreshCw,
  ExternalLink,
  Loader2,
  Copy,
  Globe,
  AlertTriangle,
  KeyRound,
  Sun,
  Moon,
  Monitor,
  Check,
  RotateCcw,
  Palette,
  Settings as SettingsIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTheme, ACCENT_PRESETS } from '@/components/theme-provider';
import { useDebouncedSave } from '@/hooks/useDebouncedSave';
import { useSettings, useApiKey, useRegenerateApiKey } from '@/hooks/queries';

type ThemeMode = 'light' | 'dark' | 'system';

const DEFAULT_THEME: ThemeMode = 'dark';
const DEFAULT_HUE = 187; // Cyan

const THEME_MODES: { value: ThemeMode; label: string; icon: typeof Sun; isDefault?: boolean }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon, isDefault: true },
  { value: 'system', label: 'System', icon: Monitor },
];

function ApiKeyCard() {
  const { data: apiKeyData, isLoading } = useApiKey();
  const regenerateApiKey = useRegenerateApiKey();
  const [showConfirm, setShowConfirm] = useState(false);

  const token = apiKeyData?.token;
  const hasKey = !!token;

  const handleCopy = async () => {
    if (token) {
      try {
        await navigator.clipboard.writeText(token);
        toast.success('Copied to clipboard');
      } catch {
        toast.error('Failed to copy to clipboard');
      }
    }
  };

  const handleRegenerate = () => {
    if (hasKey) {
      setShowConfirm(true);
    } else {
      regenerateApiKey.mutate();
    }
  };

  const confirmRegenerate = () => {
    regenerateApiKey.mutate();
    setShowConfirm(false);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                API Key
              </CardTitle>
              <CardDescription>
                Access the Tracearr API for third-party integrations like Homarr, Home Assistant,
                etc.
              </CardDescription>
            </div>
            <RouterLink to="/api-docs">
              <Button variant="outline" size="sm" className="gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" />
                API Docs
              </Button>
            </RouterLink>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={token ?? ''}
                  placeholder="No API key generated"
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  disabled={!hasKey}
                  title="Copy to clipboard"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-sm">
                  {hasKey
                    ? 'Your API key grants full read access to your Tracearr data.'
                    : 'Generate an API key to enable external integrations.'}
                </p>
                <Button
                  variant={hasKey ? 'outline' : 'default'}
                  size="sm"
                  onClick={handleRegenerate}
                  disabled={regenerateApiKey.isPending}
                >
                  {regenerateApiKey.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  {hasKey ? 'Regenerate' : 'Generate Key'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="Regenerate API Key?"
        description="This will invalidate your current API key. Any integrations using the old key will stop working."
        confirmLabel="Regenerate"
        onConfirm={confirmRegenerate}
      />
    </>
  );
}

export function GeneralSettings() {
  const { data: settings, isLoading } = useSettings();
  const { theme, setTheme, accentHue, setAccentHue } = useTheme();

  // General settings fields
  const unitSystemField = useDebouncedSave('unitSystem', settings?.unitSystem);
  const pollerEnabledField = useDebouncedSave('pollerEnabled', settings?.pollerEnabled);
  const pollerIntervalField = useDebouncedSave('pollerIntervalMs', settings?.pollerIntervalMs);
  const usePlexGeoipField = useDebouncedSave('usePlexGeoip', settings?.usePlexGeoip);

  // Network settings fields
  const externalUrlField = useDebouncedSave('externalUrl', settings?.externalUrl);
  const basePathField = useDebouncedSave('basePath', settings?.basePath);

  const intervalSeconds = Math.round((pollerIntervalField.value ?? 15000) / 1000);

  const handleIntervalChange = (seconds: number) => {
    const clamped = Math.max(5, Math.min(300, seconds));
    pollerIntervalField.setValue(clamped * 1000);
  };

  const handleDetectUrl = () => {
    let detectedUrl = window.location.origin;
    if (import.meta.env.DEV) {
      detectedUrl = detectedUrl.replace(':5173', ':3000');
    }
    externalUrlField.setValue(detectedUrl);
    setTimeout(() => externalUrlField.saveNow(), 0);
  };

  const externalUrl = externalUrlField.value ?? '';
  const isLocalhost = externalUrl.includes('localhost') || externalUrl.includes('127.0.0.1');
  const isHttp = externalUrl.startsWith('http://') && !isLocalhost;

  const isDefaultTheme = theme === DEFAULT_THEME && accentHue === DEFAULT_HUE;

  const handleThemeReset = () => {
    setTheme(DEFAULT_THEME);
    setAccentHue(DEFAULT_HUE);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Appearance */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance
              </CardTitle>
              <CardDescription>Customize the look and feel of Tracearr</CardDescription>
            </div>
            {!isDefaultTheme && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleThemeReset}
                className="text-muted-foreground hover:text-foreground gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mode Selection */}
          <div className="space-y-2">
            <label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Theme
            </label>
            <div className="flex gap-2">
              {THEME_MODES.map(({ value, label, icon: Icon, isDefault: isDefaultMode }) => (
                <Button
                  key={value}
                  variant={theme === value ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    'flex-1 gap-1.5',
                    theme === value && 'ring-primary ring-offset-background ring-1 ring-offset-1'
                  )}
                  onClick={() => setTheme(value)}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                  {isDefaultMode && <span className="text-[10px] opacity-60">(default)</span>}
                </Button>
              ))}
            </div>
          </div>

          {/* Accent Color Selection */}
          <div className="space-y-2">
            <label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Accent Color
            </label>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
              {ACCENT_PRESETS.map((preset) => {
                const isSelected = accentHue === preset.hue;
                const isDefaultColor = preset.hue === DEFAULT_HUE;
                return (
                  <button
                    key={preset.hue}
                    onClick={() => setAccentHue(preset.hue)}
                    className={cn(
                      'group relative flex flex-col items-center gap-1 rounded-lg p-1.5 transition-all',
                      'hover:bg-muted/50 focus:ring-primary focus:ring-offset-background focus:ring-2 focus:ring-offset-2 focus:outline-none'
                    )}
                    title={preset.name}
                  >
                    <div
                      className={cn(
                        'relative h-8 w-8 rounded-md transition-transform',
                        'group-hover:scale-105',
                        isSelected && 'ring-offset-background scale-105 ring-2 ring-offset-2'
                      )}
                      style={{
                        backgroundColor: preset.hex,
                        ['--tw-ring-color' as string]: isSelected ? preset.hex : undefined,
                      }}
                    >
                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Check className="h-4 w-4 text-white drop-shadow-md" />
                        </div>
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-[10px] leading-tight',
                        isSelected ? 'text-foreground font-medium' : 'text-muted-foreground'
                      )}
                    >
                      {preset.name}
                      {isDefaultColor && !isSelected && <span className="opacity-60">*</span>}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-muted-foreground text-[10px]">* Cyan is the default accent color</p>
          </div>
        </CardContent>
      </Card>

      {/* Application Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Application
          </CardTitle>
          <CardDescription>Configure basic application settings</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <AutosaveSelectField
              id="unitSystem"
              label="Unit System"
              description="Choose how distances and speeds are displayed"
              value={(unitSystemField.value as string) ?? 'metric'}
              onChange={(v) => unitSystemField.setValue(v as 'metric' | 'imperial')}
              options={[
                { value: 'metric', label: 'Metric (km, km/h)' },
                { value: 'imperial', label: 'Imperial (mi, mph)' },
              ]}
              status={unitSystemField.status}
              errorMessage={unitSystemField.errorMessage}
              onRetry={unitSystemField.retry}
              onReset={unitSystemField.reset}
            />

            <AutosaveSwitchField
              id="pollerEnabled"
              label="Session Sync"
              description="Enable session tracking for your media servers"
              checked={pollerEnabledField.value ?? true}
              onChange={(v) => pollerEnabledField.setValue(v)}
              status={pollerEnabledField.status}
              errorMessage={pollerEnabledField.errorMessage}
              onRetry={pollerEnabledField.retry}
              onReset={pollerEnabledField.reset}
            />

            <AutosaveNumberField
              id="pollerIntervalMs"
              label="Sync Interval"
              description="Polling frequency for Jellyfin/Emby (5-300 seconds)"
              value={intervalSeconds}
              onChange={handleIntervalChange}
              min={5}
              max={300}
              suffix="sec"
              disabled={!(pollerEnabledField.value ?? true)}
              status={pollerIntervalField.status}
              errorMessage={pollerIntervalField.errorMessage}
              onRetry={pollerIntervalField.retry}
              onReset={pollerIntervalField.reset}
            />

            <div className="bg-muted/50 space-y-2 rounded-lg p-4">
              <p className="text-muted-foreground text-sm">
                <strong>Plex:</strong> Uses real-time updates via SSE. Polling is only used as a
                fallback if the connection fails.
              </p>
              <p className="text-muted-foreground text-sm">
                <strong>Jellyfin/Emby:</strong> Uses the sync interval above for session detection.
                Lower values provide faster updates but increase server load.
              </p>
            </div>

            <AutosaveSwitchField
              id="usePlexGeoip"
              label="Enhanced GeoIP Lookup"
              description="Use Plex's GeoIP service for more accurate location data. When enabled, IP addresses are sent to plex.tv for lookup. Local MaxMind database is used as fallback."
              checked={usePlexGeoipField.value ?? false}
              onChange={(v) => usePlexGeoipField.setValue(v)}
              status={usePlexGeoipField.status}
              errorMessage={usePlexGeoipField.errorMessage}
              onRetry={usePlexGeoipField.retry}
              onReset={usePlexGeoipField.reset}
            />
          </FieldGroup>
        </CardContent>
      </Card>

      {/* Network / External Access */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            External Access
          </CardTitle>
          <CardDescription>
            Configure how external devices (like mobile apps) connect to your server
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="externalUrl">External URL</FieldLabel>
                <SaveStatusIndicator status={externalUrlField.status} />
              </div>
              <div className="flex gap-2">
                <Input
                  id="externalUrl"
                  placeholder="https://tracearr.example.com"
                  value={externalUrlField.value ?? ''}
                  onChange={(e) => externalUrlField.setValue(e.target.value)}
                  aria-invalid={externalUrlField.status === 'error'}
                />
                <Button variant="outline" onClick={handleDetectUrl}>
                  Detect
                </Button>
              </div>
              <FieldDescription>
                The URL that external devices should use to reach this server. Used for QR codes and
                mobile app pairing.
              </FieldDescription>
              {externalUrlField.status === 'error' && externalUrlField.errorMessage && (
                <div className="flex items-center justify-between">
                  <FieldError>{externalUrlField.errorMessage}</FieldError>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={externalUrlField.retry}
                      className="h-6 px-2 text-xs"
                    >
                      Retry
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={externalUrlField.reset}
                      className="h-6 px-2 text-xs"
                    >
                      Reset
                    </Button>
                  </div>
                </div>
              )}
              {isLocalhost && (
                <div className="flex items-start gap-2 rounded-lg bg-yellow-500/10 p-3 text-sm text-yellow-600 dark:text-yellow-400">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Localhost URLs only work when your phone is on the same machine. Use your local
                    IP (e.g., http://192.168.1.x:3000) for LAN access, or set up a domain for remote
                    access.
                  </span>
                </div>
              )}
              {isHttp && (
                <div className="flex items-start gap-2 rounded-lg bg-yellow-500/10 p-3 text-sm text-yellow-600 dark:text-yellow-400">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    iOS requires HTTPS for non-local connections. HTTP will work on local networks
                    but may fail for Tailscale or remote access. Consider using HTTPS with a reverse
                    proxy.
                  </span>
                </div>
              )}
            </Field>

            <AutosaveTextField
              id="basePath"
              label="Base Path"
              description="Only needed if running behind a reverse proxy with a path prefix (e.g., example.com/tracearr). Leave empty for root-level deployments."
              placeholder="/tracearr"
              value={basePathField.value ?? ''}
              onChange={basePathField.setValue}
              status={basePathField.status}
              errorMessage={basePathField.errorMessage}
              onRetry={basePathField.retry}
              onReset={basePathField.reset}
            />
          </FieldGroup>
        </CardContent>
      </Card>

      {/* API Key */}
      <ApiKeyCard />
    </div>
  );
}
