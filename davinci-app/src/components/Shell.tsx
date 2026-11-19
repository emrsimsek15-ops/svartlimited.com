import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, m } from 'framer-motion';
import { BarChart3, CalendarDays, LayoutDashboard, ListOrdered, PanelLeftClose, PanelLeftOpen, Settings } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { strings } from '../i18n';
import { useUI } from '../store/ui';
import { useIsDesktop } from '../hooks/useMedia';
import { Wordmark } from './Logo';
import { SyncBadge } from './SyncBadge';
import { Toast } from './Toast';

const NAV = [
  { to: '/', label: strings.nav.dashboard, icon: LayoutDashboard },
  { to: '/trades', label: strings.nav.trades, icon: ListOrdered },
  { to: '/calendar', label: strings.nav.calendar, icon: CalendarDays },
  { to: '/reports', label: strings.nav.reports, icon: BarChart3 },
  { to: '/settings', label: strings.nav.settings, icon: Settings },
];

export function Shell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const desktop = useIsDesktop();
  const userCollapsed = useUI((s) => s.sidebarCollapsed);
  const [tabletExpanded, setTabletExpanded] = useState(false);
  // iPad (640–1180): icon rail by default; desktop: full sidebar unless the user collapsed it.
  const collapsed = desktop ? userCollapsed : !tabletExpanded;
  const toggle = () => (desktop ? useUI.getState().toggleSidebar() : setTabletExpanded((v) => !v));
  const sidebarW = collapsed ? 72 : 232;

  return (
    <div className="min-h-[100dvh]" style={{ ['--sidebar-w' as string]: `${sidebarW}px` }}>
      <aside
        className="fixed bottom-0 left-0 top-0 z-40 hidden flex-col border-r border-line/[0.06] bg-bg transition-[width] duration-200 ease-out sm:flex"
        style={{ width: `calc(${sidebarW}px + var(--safe-left))`, paddingLeft: 'var(--safe-left)', paddingTop: 'var(--safe-top)' }}
      >
        <div className={`flex h-16 items-center ${collapsed ? 'justify-center' : 'px-5'}`}>
          <Wordmark collapsed={collapsed} />
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3 pt-2" aria-label="Ana menü">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              title={collapsed ? label : undefined}
              aria-label={label}
              className={({ isActive }) =>
                `group relative flex h-11 items-center gap-3 rounded-ctl text-[14px] font-medium transition-colors duration-150 ${collapsed ? 'justify-center' : 'px-3'} ${isActive ? 'text-text' : 'text-muted hover:bg-surface hover:text-text'}`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <m.span layoutId="nav-active" className="absolute inset-0 rounded-ctl border border-line/[0.07] bg-surface2" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                  <Icon size={19} className={`relative shrink-0 ${isActive ? 'text-accent' : ''}`} />
                  {!collapsed && <span className="relative truncate">{label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className={`flex flex-col gap-2 p-3 pb-[calc(12px+var(--safe-bottom))] ${collapsed ? 'items-center' : ''}`}>
          <SyncBadge compact={collapsed} />
          <button className="icon-btn" onClick={toggle} aria-label={collapsed ? strings.nav.expand : strings.nav.collapse}>
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>
      </aside>

      {/* Phone top bar */}
      <header className="glass sticky top-0 z-30 flex items-center justify-between border-b border-line/[0.06] px-4 sm:hidden" style={{ paddingTop: 'var(--safe-top)', minHeight: 'calc(52px + var(--safe-top))' }}>
        <Wordmark />
        <SyncBadge compact />
      </header>

      <main className="sm:pl-[calc(var(--sidebar-w)+var(--safe-left))]" style={{ paddingRight: 'var(--safe-right)' }}>
        <div className="pb-safe-tabbar mx-auto w-full max-w-[1320px] px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8" style={{ paddingLeft: 'max(16px, var(--safe-left))' }}>
          <AnimatePresence mode="wait" initial={false}>
            <m.div key={location.pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}>
              {children}
            </m.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Phone tab bar */}
      <nav className="glass fixed inset-x-0 bottom-0 z-40 border-t border-line/[0.07] sm:hidden" style={{ paddingBottom: 'var(--safe-bottom)', paddingLeft: 'var(--safe-left)', paddingRight: 'var(--safe-right)' }} aria-label="Ana menü">
        <div className="grid h-[var(--tabbar-h)] grid-cols-5">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `flex min-w-0 flex-col items-center justify-center gap-1 text-[10.5px] font-medium transition-colors ${isActive ? 'text-text' : 'text-muted'}`}>
              {({ isActive }) => (
                <>
                  <Icon size={21} className={isActive ? 'text-accent' : ''} />
                  <span className="max-w-full truncate px-0.5">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
      <Toast />
    </div>
  );
}
