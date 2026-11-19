import { lazy, Suspense, useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { domAnimation, LazyMotion, MotionConfig } from 'framer-motion';
import { Shell } from './components/Shell';
import { Skeleton } from './components/Skeleton';
import { DayDetail } from './features/calendar/DayDetail';
import { TradeDetail } from './features/trades/TradeDetail';
import { handleOAuthRedirect } from './ctrader/oauth';
import { installAutoSync, loadAccountList } from './ctrader/controller';
import { useUI } from './store/ui';
import { strings, errorText } from './i18n';

const Dashboard = lazy(() => import('./features/dashboard/DashboardPage'));
const Trades = lazy(() => import('./features/trades/TradesPage'));
const Calendar = lazy(() => import('./features/calendar/CalendarPage'));
const Reports = lazy(() => import('./features/reports/ReportsPage'));
const Settings = lazy(() => import('./features/settings/SettingsPage'));
const Debug = lazy(() => import('./features/debug/DebugPage'));

export default function App() {
  useEffect(() => {
    void (async () => {
      const r = await handleOAuthRedirect();
      const toast = useUI.getState().showToast;
      if (r === 'ok') {
        toast(strings.settings.oauthSuccess);
        window.location.hash = '#/settings';
        await loadAccountList().catch(() => undefined);
      } else if (r === 'cors') {
        toast(strings.settings.oauthCorsFailed, 'err');
        window.location.hash = '#/settings';
      } else if (r === 'state') toast(strings.settings.oauthStateMismatch, 'err');
      else if (typeof r === 'object') toast(errorText(r.error), 'err');
      installAutoSync();
    })();
  }, []);

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <HashRouter>
          <Shell>
            <Suspense fallback={<Skeleton className="h-[60vh] w-full" />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/trades" element={<Trades />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/debug" element={<Debug />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </Shell>
          <DayDetail />
          <TradeDetail />
        </HashRouter>
      </MotionConfig>
    </LazyMotion>
  );
}
