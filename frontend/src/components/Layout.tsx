import {
  ArrowUpRight,
  ChartNoAxesCombined,
  ChevronRight,
  FileUp,
  History,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const navigation = [
  { href: '#/', label: 'Overview', icon: LayoutDashboard, page: 'overview' },
  { href: '#/import', label: 'Import data', icon: FileUp, page: 'import' },
  { href: '#/history', label: 'Processing history', icon: History, page: 'history' },
];

export function Layout({ page, children }: { page: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && open) {
        setOpen(false);
        menu.current?.focus();
      }
      if (event.key === 'Tab' && open) {
        const links = sidebar.current?.querySelectorAll<HTMLAnchorElement>('a');
        if (!links?.length) return;
        const first = links[0];
        const last = links[links.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open]);
  useEffect(() => {
    if (open) sidebar.current?.querySelector<HTMLAnchorElement>('a')?.focus();
  }, [open]);
  const active = page === 'result' || page === 'demo' ? 'overview' : page;
  return (
    <div className="app-shell">
      {open && (
        <button
          className="nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        ref={sidebar}
        className={`sidebar ${open ? 'sidebar-open' : ''}`}
        aria-label="Main navigation"
      >
        <a href="#/" className="brand" aria-label="FlowOps home" onClick={() => setOpen(false)}>
          <img src="/favicon.svg" alt="" />
          <span>
            FlowOps<span className="brand-dot">.</span>
          </span>
        </a>
        <div className="workspace-switch">
          <span className="workspace-avatar">F</span>
          <div>
            <strong>Sales workspace</strong>
            <span>Single-user demo</span>
          </div>
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav>
          {navigation.map(({ href, label, icon: Icon, page: itemPage }) => (
            <a
              key={href}
              href={href}
              aria-current={active === itemPage ? 'page' : undefined}
              className={active === itemPage ? 'nav-link active' : 'nav-link'}
              onClick={() => setOpen(false)}
            >
              <Icon size={18} strokeWidth={1.7} />
              {label}
              {active === itemPage && <span className="active-dot" />}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <ShieldCheck size={22} />
            <h3>Your data, made clearer.</h3>
            <p>
              Clean spreadsheets.
              <br />
              Confident next steps.
            </p>
            <a href="#/import">
              Bring in your data <ArrowUpRight size={14} />
            </a>
          </div>
          <div className="demo-identity">
            <span className="demo-avatar">FO</span>
            <div>
              <strong>Local demo</strong>
              <span>Single-user workspace</span>
            </div>
            <span className="online-dot" />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              ref={menu}
              className="icon-button mobile-menu"
              aria-label={open ? 'Close navigation' : 'Open navigation'}
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              {open ? <PanelLeftClose size={21} /> : <PanelLeftOpen size={21} />}
            </button>
            <ChartNoAxesCombined size={17} />
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>
              {page === 'demo'
                ? 'Explore demo'
                : page === 'result'
                  ? 'Import results'
                  : (navigation.find((item) => item.page === page)?.label ?? 'Overview')}
            </strong>
          </div>
          <span className="local-tag">
            <span className="online-dot" /> Local workspace
          </span>
        </header>
        <main id="main-content" className="main-content" tabIndex={-1}>
          {children}
        </main>
        <footer className="app-footer">
          <span>
            FlowOps <span className="footer-separator">/</span> A little less spreadsheet work.
          </span>
          <span>Single-user demo · v0.1.0</span>
        </footer>
      </div>
    </div>
  );
}
