import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router';
import { Loader2 } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Login } from '@/pages/Login';
import { PlexCallback } from '@/pages/PlexCallback';
import { Setup } from '@/pages/Setup';
import { Maintenance } from '@/pages/Maintenance';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';

function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
    </div>
  );
}

// Lazy-load all route pages for code splitting
const Dashboard = lazy(() => import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const Map = lazy(() => import('@/pages/Map').then((m) => ({ default: m.Map })));
const StatsActivity = lazy(() =>
  import('@/pages/stats/Activity').then((m) => ({ default: m.StatsActivity }))
);
const StatsUsers = lazy(() =>
  import('@/pages/stats/Users').then((m) => ({ default: m.StatsUsers }))
);
const StatsDevices = lazy(() =>
  import('@/pages/stats/Devices').then((m) => ({ default: m.StatsDevices }))
);
const StatsBandwidth = lazy(() =>
  import('@/pages/stats/Bandwidth').then((m) => ({ default: m.StatsBandwidth }))
);
const LibraryOverview = lazy(() =>
  import('@/pages/library/Overview').then((m) => ({ default: m.LibraryOverview }))
);
const LibraryQuality = lazy(() =>
  import('@/pages/library/Quality').then((m) => ({ default: m.LibraryQuality }))
);
const LibraryStorage = lazy(() =>
  import('@/pages/library/Storage').then((m) => ({ default: m.LibraryStorage }))
);
const LibraryWatch = lazy(() =>
  import('@/pages/library/Watch').then((m) => ({ default: m.LibraryWatch }))
);
const Users = lazy(() => import('@/pages/Users').then((m) => ({ default: m.Users })));
const UserDetail = lazy(() =>
  import('@/pages/UserDetail').then((m) => ({ default: m.UserDetail }))
);
const Rules = lazy(() => import('@/pages/Rules').then((m) => ({ default: m.Rules })));
const Violations = lazy(() =>
  import('@/pages/Violations').then((m) => ({ default: m.Violations }))
);
const ViolationDetail = lazy(() =>
  import('@/pages/ViolationDetail').then((m) => ({ default: m.ViolationDetail }))
);
const History = lazy(() => import('@/pages/History').then((m) => ({ default: m.History })));
const Settings = lazy(() => import('@/pages/Settings').then((m) => ({ default: m.Settings })));
const Debug = lazy(() => import('@/pages/Debug').then((m) => ({ default: m.Debug })));
const NotFound = lazy(() => import('@/pages/NotFound').then((m) => ({ default: m.NotFound })));
const ApiDocs = lazy(() => import('@/pages/ApiDocs').then((m) => ({ default: m.ApiDocs })));

export function App() {
  // Automatically update document title based on current route
  useDocumentTitle();
  const { isInMaintenance } = useMaintenanceMode();

  if (isInMaintenance) {
    return <Maintenance />;
  }

  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/auth/plex-callback" element={<PlexCallback />} />
        <Route path="/setup" element={<Setup />} />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={
              <Suspense fallback={<PageLoader />}>
                <Dashboard />
              </Suspense>
            }
          />
          <Route
            path="map"
            element={
              <Suspense fallback={<PageLoader />}>
                <Map />
              </Suspense>
            }
          />

          {/* Stats routes */}
          <Route path="stats" element={<Navigate to="/stats/activity" replace />} />
          <Route
            path="stats/activity"
            element={
              <Suspense fallback={<PageLoader />}>
                <StatsActivity />
              </Suspense>
            }
          />
          <Route path="stats/library" element={<Navigate to="/library" replace />} />
          <Route
            path="stats/users"
            element={
              <Suspense fallback={<PageLoader />}>
                <StatsUsers />
              </Suspense>
            }
          />

          {/* Performance routes */}
          <Route
            path="stats/devices"
            element={
              <Suspense fallback={<PageLoader />}>
                <StatsDevices />
              </Suspense>
            }
          />
          <Route
            path="stats/bandwidth"
            element={
              <Suspense fallback={<PageLoader />}>
                <StatsBandwidth />
              </Suspense>
            }
          />

          {/* Library routes */}
          <Route
            path="library"
            element={
              <Suspense fallback={<PageLoader />}>
                <LibraryOverview />
              </Suspense>
            }
          />
          <Route
            path="library/quality"
            element={
              <Suspense fallback={<PageLoader />}>
                <LibraryQuality />
              </Suspense>
            }
          />
          <Route
            path="library/storage"
            element={
              <Suspense fallback={<PageLoader />}>
                <LibraryStorage />
              </Suspense>
            }
          />
          <Route
            path="library/watch"
            element={
              <Suspense fallback={<PageLoader />}>
                <LibraryWatch />
              </Suspense>
            }
          />

          {/* Other routes */}
          <Route
            path="history/:sessionId?"
            element={
              <Suspense fallback={<PageLoader />}>
                <History />
              </Suspense>
            }
          />
          <Route
            path="users"
            element={
              <Suspense fallback={<PageLoader />}>
                <Users />
              </Suspense>
            }
          />
          <Route
            path="users/:id"
            element={
              <Suspense fallback={<PageLoader />}>
                <UserDetail />
              </Suspense>
            }
          />
          <Route
            path="rules"
            element={
              <Suspense fallback={<PageLoader />}>
                <Rules />
              </Suspense>
            }
          />
          <Route
            path="violations"
            element={
              <Suspense fallback={<PageLoader />}>
                <Violations />
              </Suspense>
            }
          />
          <Route
            path="violations/:id"
            element={
              <Suspense fallback={<PageLoader />}>
                <ViolationDetail />
              </Suspense>
            }
          />
          <Route
            path="settings/*"
            element={
              <Suspense fallback={<PageLoader />}>
                <Settings />
              </Suspense>
            }
          />
          <Route
            path="api-docs"
            element={
              <Suspense fallback={<PageLoader />}>
                <ApiDocs />
              </Suspense>
            }
          />

          {/* Hidden debug page (owner only) */}
          <Route
            path="debug"
            element={
              <Suspense fallback={<PageLoader />}>
                <Debug />
              </Suspense>
            }
          />

          {/* Legacy redirects */}
          <Route path="analytics" element={<Navigate to="/stats/activity" replace />} />
          <Route path="activity" element={<Navigate to="/stats/activity" replace />} />

          <Route
            path="*"
            element={
              <Suspense fallback={<PageLoader />}>
                <NotFound />
              </Suspense>
            }
          />
        </Route>
      </Routes>
      <Toaster />
    </>
  );
}
