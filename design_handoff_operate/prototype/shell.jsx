/* global React, Icon, Button, SearchInput, Kbd, Avatar */
// Operate — App Shell
// Sidebar nav, topbar, theme toggle, command palette, keyboard shortcuts overlay
// Routing via hash (#overview, #accounting, etc.)

const { useState, useEffect, useCallback, useMemo, useRef } = React;

const NAV_ITEMS = [
  { id: 'overview',   label: 'Overview',   icon: 'home',     kbd: 'g o' },
  { id: 'reviews',    label: 'Reviews',    icon: 'star',     kbd: 'g r' },
  { id: 'scheduling', label: 'Scheduling', icon: 'calendar', kbd: 'g s' },
  { id: 'attendance', label: 'Attendance', icon: 'clock',    kbd: 'g a' },
  { id: 'payments',   label: 'Payments',   icon: 'wallet',   kbd: 'g p' },
  { id: 'animals',    label: 'Animals',    icon: 'paw',      kbd: 'g n' },
  { id: 'documents',  label: 'Documents',  icon: 'file',     kbd: 'g d' },
  { id: 'accounting', label: 'Accounting', icon: 'ledger',   kbd: 'g c' },
  { id: 'reports',    label: 'Reports',    icon: 'chart',    kbd: 'g e' },
  { id: 'contacts',   label: 'Contacts',   icon: 'users',    kbd: 'g t' },
  { id: 'wiki',       label: 'Wiki',       icon: 'book',     kbd: 'g w' },
  { id: 'brand',      label: 'Brand',      icon: 'palette',  kbd: 'g b' },
  { id: 'admin',      label: 'Admin',      icon: 'shield',   kbd: 'g m' },
];

const KBD_BY_ID = Object.fromEntries(NAV_ITEMS.map(n => [n.kbd.replace(' ', ''), n.id]));

/* -------------------- Theme hook -------------------- */
function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('operate.theme') || 'light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('operate.theme', theme);
  }, [theme]);
  return [theme, setTheme];
}

/* -------------------- Hash routing -------------------- */
function useRoute() {
  const [route, setRoute] = useState(() => (window.location.hash.slice(1) || 'overview'));
  useEffect(() => {
    const onHash = () => setRoute(window.location.hash.slice(1) || 'overview');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const go = useCallback((id) => { window.location.hash = id; }, []);
  return [route, go];
}

/* -------------------- Sidebar -------------------- */
function Sidebar({ route, go }) {
  return (
    <aside style={{
      width: 'var(--sidebar-w)',
      borderRight: '1px solid var(--line)',
      background: 'var(--surface-2)',
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: 0, height: '100vh',
    }}>
      {/* Brand */}
      <div style={{
        height: 'var(--topbar-h)',
        display: 'flex', alignItems: 'center',
        padding: '0 var(--s-5)',
        borderBottom: '1px solid var(--line)',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{
            fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em',
            color: 'var(--fg)', fontFamily: 'var(--font-sans)',
          }}>Operate</span>
          <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>v2.6</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{
        flex: 1, padding: 'var(--s-3) var(--s-3)',
        display: 'flex', flexDirection: 'column', gap: 1,
        overflowY: 'auto',
      }}>
        {NAV_ITEMS.map(item => {
          const active = route === item.id;
          return <NavItem key={item.id} item={item} active={active} onClick={() => go(item.id)} />;
        })}
      </nav>

      {/* User footer */}
      <div style={{
        padding: 'var(--s-3) var(--s-4)',
        borderTop: '1px solid var(--line)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <Avatar name="Léo Lecée" size={28} />
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>Léo Lecée</span>
          <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>Director</span>
        </div>
        <button
          onClick={() => window.location.hash = 'admin'}
          style={{
            width: 28, height: 28, display: 'inline-flex', alignItems: 'center',
            justifyContent: 'center', borderRadius: 6, color: 'var(--fg-3)',
          }}
        >
          <Icon name="settings" size={16} />
        </button>
      </div>
    </aside>
  );
}

function NavItem({ item, active, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '7px 10px', borderRadius: 8,
        fontSize: 13, fontWeight: active ? 500 : 400,
        color: active ? 'var(--fg)' : 'var(--fg-2)',
        background: active ? 'var(--surface)' : hover ? 'var(--row-hover)' : 'transparent',
        border: active ? '1px solid var(--line)' : '1px solid transparent',
        textAlign: 'left', width: '100%', cursor: 'pointer',
        transition: 'background var(--dur) var(--ease)',
      }}
    >
      <Icon name={item.icon} size={16} color={active ? 'var(--bronze)' : 'var(--fg-3)'} />
      <span style={{ flex: 1 }}>{item.label}</span>
    </button>
  );
}

/* -------------------- Topbar -------------------- */
function Topbar({ theme, setTheme, openCmd, openShortcuts }) {
  return (
    <div style={{
      height: 'var(--topbar-h)',
      borderBottom: '1px solid var(--line)',
      background: 'var(--bg)',
      padding: '0 var(--s-5)',
      display: 'flex', alignItems: 'center', gap: 'var(--s-3)',
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      <button
        onClick={openCmd}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          height: 34, padding: '0 12px', minWidth: 260,
          background: 'var(--surface)', border: '1px solid var(--line)',
          borderRadius: 'var(--r-md)', fontSize: 13, color: 'var(--fg-3)',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <Icon name="search" size={15} />
        <span style={{ flex: 1 }}>Jump to module, employee, document…</span>
        <Kbd>⌘K</Kbd>
      </button>

      <div style={{ flex: 1 }}></div>

      <button
        onClick={openShortcuts}
        title="Keyboard shortcuts"
        style={{
          width: 34, height: 34, display: 'inline-flex', alignItems: 'center',
          justifyContent: 'center', borderRadius: 'var(--r-md)',
          color: 'var(--fg-3)', cursor: 'pointer',
        }}
      >
        <Kbd>?</Kbd>
      </button>

      <button
        style={{
          width: 34, height: 34, display: 'inline-flex', alignItems: 'center',
          justifyContent: 'center', borderRadius: 'var(--r-md)',
          color: 'var(--fg-3)', cursor: 'pointer', position: 'relative',
        }}
      >
        <Icon name="bell" size={16} />
        <span style={{
          position: 'absolute', top: 8, right: 8,
          width: 6, height: 6, borderRadius: 999, background: 'var(--bronze)',
        }}></span>
      </button>

      <button
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        style={{
          width: 34, height: 34, display: 'inline-flex', alignItems: 'center',
          justifyContent: 'center', borderRadius: 'var(--r-md)',
          color: 'var(--fg-2)', cursor: 'pointer',
        }}
      >
        <Icon name={theme === 'light' ? 'moon' : 'sun'} size={16} />
      </button>
    </div>
  );
}

/* -------------------- Command palette -------------------- */
function CmdPalette({ open, onClose, go }) {
  const [q, setQ] = useState('');
  const inputRef = useRef(null);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (open) {
      setQ('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const items = useMemo(() => {
    const nav = NAV_ITEMS.map(n => ({ kind: 'nav', id: n.id, label: n.label, icon: n.icon, hint: 'Go to' }));
    const emps = (window.DATA?.EMPLOYEES || []).map(e => ({
      kind: 'employee', id: e.id, label: e.name, icon: 'user', hint: e.role,
      target: 'payments',
    }));
    const docs = (window.DATA?.DOCUMENTS || []).slice(0, 8).map(d => ({
      kind: 'doc', id: d.id, label: d.title, icon: 'file', hint: 'Document',
      target: 'documents',
    }));
    const shops = (window.DATA?.SHOPS || []).map(s => ({
      kind: 'shop', id: s.id, label: s.name, icon: 'building', hint: 'Shop · Reports',
      target: 'reports',
    }));
    const all = [...nav, ...emps, ...shops, ...docs];
    if (!q) return all.slice(0, 8);
    const lc = q.toLowerCase();
    return all.filter(x => x.label.toLowerCase().includes(lc) || (x.hint || '').toLowerCase().includes(lc)).slice(0, 10);
  }, [q]);

  const choose = useCallback((it) => {
    if (!it) return;
    onClose();
    if (it.kind === 'nav') go(it.id);
    else go(it.target || 'overview');
  }, [go, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(items.length - 1, s + 1)); }
      else if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(0, s - 1)); }
      else if (e.key === 'Enter')     { e.preventDefault(); choose(items[selected]); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, items, selected, choose, onClose]);

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(43,35,27,0.32)',
      backdropFilter: 'blur(2px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      paddingTop: '16vh',
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 540, maxWidth: '92vw', background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r-lg)',
          boxShadow: 'var(--shadow-2)',
          overflow: 'hidden',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', borderBottom: '1px solid var(--line)',
        }}>
          <Icon name="search" size={16} color="var(--fg-3)" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => { setQ(e.target.value); setSelected(0); }}
            placeholder="Jump to module, employee, shop, document…"
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 14, color: 'var(--fg)',
            }}
          />
          <Kbd>esc</Kbd>
        </div>
        <div style={{ maxHeight: 380, overflowY: 'auto', padding: 6 }}>
          {items.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--fg-4)', fontSize: 13 }}>
              Nothing matches “{q}”.
            </div>
          )}
          {items.map((it, i) => {
            const active = i === selected;
            return (
              <button
                key={`${it.kind}-${it.id}`}
                onClick={() => choose(it)}
                onMouseEnter={() => setSelected(i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  width: '100%', textAlign: 'left',
                  padding: '8px 12px', borderRadius: 8,
                  background: active ? 'var(--row-active)' : 'transparent',
                  cursor: 'pointer', color: 'var(--fg)',
                }}
              >
                <Icon name={it.icon} size={16} color="var(--fg-3)" />
                <span style={{ flex: 1, fontSize: 13 }}>{it.label}</span>
                <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>{it.hint}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* -------------------- Keyboard shortcuts overlay -------------------- */
function ShortcutsOverlay({ open, onClose }) {
  if (!open) return null;
  const sections = [
    { title: 'Navigation', items: [
      { keys: ['⌘', 'K'], label: 'Open command palette' },
      { keys: ['g', 'o'], label: 'Go to Overview' },
      { keys: ['g', 'c'], label: 'Go to Accounting' },
      { keys: ['g', 'p'], label: 'Go to Payments' },
      { keys: ['g', 'e'], label: 'Go to Reports' },
      { keys: ['g', 's'], label: 'Go to Scheduling' },
    ]},
    { title: 'Accounting', items: [
      { keys: ['j', '/', 'k'], label: 'Next / previous day' },
      { keys: ['Esc'], label: 'Close day drawer' },
      { keys: ['c'], label: 'Copy row as CSV' },
    ]},
    { title: 'General', items: [
      { keys: ['?'], label: 'Show this overlay' },
      { keys: ['T'], label: 'Toggle dark / light' },
    ]},
  ];
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(43,35,27,0.32)',
      backdropFilter: 'blur(2px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 520, maxWidth: '92vw', background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-lg)', overflow: 'hidden',
      }}>
        <div style={{
          padding: '14px 18px', borderBottom: '1px solid var(--line)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Keyboard shortcuts</div>
            <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 2 }}>Press <Kbd>?</Kbd> any time to open this.</div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, color: 'var(--fg-3)' }}>
            <Icon name="close" size={16} />
          </button>
        </div>
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {sections.map(s => (
            <div key={s.title}>
              <div className="eyebrow" style={{ marginBottom: 10 }}>{s.title}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {s.items.map((it, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ flex: 1, fontSize: 13 }}>{it.label}</span>
                    <span style={{ display: 'inline-flex', gap: 4 }}>
                      {it.keys.map((k, ki) => <Kbd key={ki}>{k}</Kbd>)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* -------------------- Greeting helpers -------------------- */
function timeOfDayGreeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Still up, Léo';
  if (h < 12) return 'Good morning, Léo';
  if (h < 17) return 'Good afternoon, Léo';
  if (h < 21) return 'Good evening, Léo';
  return 'Late tonight, Léo';
}

function todayLong() {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/* -------------------- App root -------------------- */
function App({ modules }) {
  const [theme, setTheme] = useTheme();
  const [route, go] = useRoute();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [kbOpen, setKbOpen] = useState(false);

  // global keyboard shortcuts
  useEffect(() => {
    let buffer = '';
    let bufferTimer;
    const onKey = (e) => {
      // ignore when typing in an input/textarea
      const tag = e.target.tagName;
      const inField = tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen(o => !o);
        return;
      }
      if (inField) return;

      if (e.key === '?') { setKbOpen(true); return; }
      if (e.key.toLowerCase() === 't') { setTheme(t => t === 'light' ? 'dark' : 'light'); return; }
      if (e.key === 'Escape') { setKbOpen(false); setCmdOpen(false); return; }

      // 'g' then nav letter
      buffer += e.key.toLowerCase();
      clearTimeout(bufferTimer);
      bufferTimer = setTimeout(() => { buffer = ''; }, 800);
      if (buffer.length === 2 && buffer[0] === 'g') {
        const target = KBD_BY_ID[buffer];
        if (target) go(target);
        buffer = '';
      }
      if (buffer.length > 2) buffer = '';
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, setTheme]);

  const Module = modules[route] || modules.overview;

  return (
    <div className="app-shell">
      <Sidebar route={route} go={go} />
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar
          theme={theme}
          setTheme={(arg) => typeof arg === 'function' ? setTheme(arg) : setTheme(arg)}
          openCmd={() => setCmdOpen(true)}
          openShortcuts={() => setKbOpen(true)}
        />
        <main className="module-scroll" key={route}>
          <Module go={go} />
        </main>
      </div>

      <CmdPalette open={cmdOpen} onClose={() => setCmdOpen(false)} go={go} />
      <ShortcutsOverlay open={kbOpen} onClose={() => setKbOpen(false)} />

      <style>{`
        @keyframes opFade {
          from { opacity: 0; transform: translateY(2px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .module-scroll { animation-fill-mode: both; }
      `}</style>
    </div>
  );
}

window.App = App;
window.useTheme = useTheme;
window.useRoute = useRoute;
window.NAV_ITEMS = NAV_ITEMS;
window.timeOfDayGreeting = timeOfDayGreeting;
window.todayLong = todayLong;
