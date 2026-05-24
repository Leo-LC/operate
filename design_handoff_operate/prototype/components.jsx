/* global React, Icon */
// Operate — shared component library
// Button, Pill, Stat, Card, Drawer, Toggle, Tabs, Segmented, Avatar,
// Table primitives, Sparkline, KbdHint, Sheet, etc.

const { useState, useEffect, useRef, useCallback, useMemo } = React;

/* -------------------- Button -------------------- */
function Button({ variant = 'secondary', size = 'md', icon, iconRight, children, onClick, disabled, full, style, ...rest }) {
  const sz = {
    sm: { padding: '0 10px', height: 28, fontSize: 12, gap: 6, radius: 8 },
    md: { padding: '0 14px', height: 34, fontSize: 13, gap: 8, radius: 10 },
    lg: { padding: '0 18px', height: 40, fontSize: 14, gap: 8, radius: 12 },
  }[size];
  const baseBg = {
    primary:   { bg: 'var(--bronze)', fg: '#fff8ee', border: 'transparent', hover: 'var(--bronze-2)' },
    secondary: { bg: 'var(--surface)', fg: 'var(--fg)', border: 'var(--line-strong)', hover: 'var(--row-hover)' },
    ghost:     { bg: 'transparent', fg: 'var(--fg-2)', border: 'transparent', hover: 'var(--row-hover)' },
    danger:    { bg: 'transparent', fg: 'var(--bad)', border: 'var(--line-strong)', hover: 'var(--bad-soft)' },
    quiet:     { bg: 'var(--bg-2)', fg: 'var(--fg-2)', border: 'transparent', hover: 'var(--row-hover)' },
  }[variant];
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: sz.gap,
        padding: sz.padding, height: sz.height, fontSize: sz.fontSize, fontWeight: 500,
        background: hover && !disabled ? baseBg.hover : baseBg.bg,
        color: baseBg.fg,
        border: '1px solid', borderColor: baseBg.border,
        borderRadius: sz.radius,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        whiteSpace: 'nowrap',
        width: full ? '100%' : 'auto',
        transition: 'background var(--dur) var(--ease), border-color var(--dur) var(--ease)',
        ...style,
      }}
      {...rest}
    >
      {icon && <Icon name={icon} size={sz.fontSize + 3} />}
      {children}
      {iconRight && <Icon name={iconRight} size={sz.fontSize + 3} />}
    </button>
  );
}

/* -------------------- Pill (status / tag) -------------------- */
function Pill({ tone = 'neutral', size = 'md', children, dot, icon, style }) {
  const tones = {
    neutral: { bg: 'var(--bg-2)', fg: 'var(--fg-2)', dot: 'var(--ink-4)' },
    bronze:  { bg: 'var(--bronze-soft)', fg: 'var(--bronze-2)', dot: 'var(--bronze)' },
    good:    { bg: 'var(--good-soft)', fg: 'var(--good)', dot: 'var(--good)' },
    warn:    { bg: 'var(--warn-soft)', fg: 'var(--warn)', dot: 'var(--warn)' },
    bad:     { bg: 'var(--bad-soft)', fg: 'var(--bad)', dot: 'var(--bad)' },
    info:    { bg: 'var(--info-soft)', fg: 'var(--info)', dot: 'var(--info)' },
    outline: { bg: 'transparent', fg: 'var(--fg-2)', dot: 'var(--ink-4)', border: 'var(--line-strong)' },
  }[tone];
  const sz = size === 'sm'
    ? { p: '2px 8px', f: 11, gap: 5 }
    : { p: '3px 10px', f: 12, gap: 6 };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: sz.gap,
      padding: sz.p, fontSize: sz.f, fontWeight: 500,
      background: tones.bg, color: tones.fg,
      borderRadius: 'var(--r-pill)',
      border: tones.border ? `1px solid ${tones.border}` : 'none',
      lineHeight: 1.4,
      ...style,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 999, background: tones.dot }}></span>}
      {icon && <Icon name={icon} size={sz.f + 2} />}
      {children}
    </span>
  );
}

/* -------------------- Card -------------------- */
function Card({ children, padding = 'var(--s-5)', style, onClick, interactive }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-lg)',
        padding,
        cursor: interactive ? 'pointer' : 'default',
        transition: 'border-color var(--dur) var(--ease), box-shadow var(--dur) var(--ease)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* -------------------- Stat card -------------------- */
function Stat({ label, value, delta, deltaTone = 'good', spark, suffix, prefix, size = 'md', hint }) {
  const sizes = {
    sm: { v: 22, l: 11 },
    md: { v: 28, l: 12 },
    lg: { v: 36, l: 12 },
  }[size];
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--r-lg)',
      padding: 'var(--s-4) var(--s-5)',
      display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0,
    }}>
      <div className="eyebrow" style={{ fontSize: sizes.l }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span className="tabular" style={{ fontSize: sizes.v, fontWeight: 500, letterSpacing: '-0.01em', color: 'var(--fg)' }}>
          {prefix}{value}{suffix && <span style={{ fontSize: sizes.v * 0.55, color: 'var(--fg-3)', marginLeft: 2 }}>{suffix}</span>}
        </span>
        {delta != null && (
          <Pill tone={deltaTone} size="sm">
            <Icon name={deltaTone === 'good' ? 'arrowUp' : deltaTone === 'bad' ? 'arrowDown' : 'minus'} size={11} />
            {delta}
          </Pill>
        )}
      </div>
      {(spark || hint) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          {hint && <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>{hint}</span>}
          {spark && <div style={{ marginLeft: 'auto' }}>{spark}</div>}
        </div>
      )}
    </div>
  );
}

/* -------------------- Toggle -------------------- */
function Toggle({ checked, onChange, label, hint }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
      <span style={{
        position: 'relative', width: 34, height: 20,
        background: checked ? 'var(--bronze)' : 'var(--ink-5)',
        borderRadius: 999,
        transition: 'background var(--dur) var(--ease)',
        flexShrink: 0,
      }}>
        <span style={{
          position: 'absolute', top: 2, left: checked ? 16 : 2,
          width: 16, height: 16, borderRadius: 999, background: '#fff',
          transition: 'left var(--dur) var(--ease)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.18)',
        }}></span>
      </span>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ display: 'none' }} />
      {label && <span style={{ fontSize: 13 }}>{label}{hint && <span style={{ color: 'var(--fg-4)', marginLeft: 6 }}>{hint}</span>}</span>}
    </label>
  );
}

/* -------------------- Segmented control -------------------- */
function Segmented({ value, onChange, options, size = 'md' }) {
  const sz = size === 'sm' ? { h: 28, f: 12, p: '0 10px' } : { h: 32, f: 13, p: '0 14px' };
  return (
    <div style={{
      display: 'inline-flex',
      background: 'var(--bg-2)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--r-md)',
      padding: 3,
      gap: 2,
    }}>
      {options.map(opt => {
        const v = typeof opt === 'string' ? opt : opt.value;
        const label = typeof opt === 'string' ? opt : opt.label;
        const icon = typeof opt === 'object' ? opt.icon : null;
        const active = v === value;
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              height: sz.h - 6, padding: sz.p, fontSize: sz.f,
              background: active ? 'var(--surface)' : 'transparent',
              color: active ? 'var(--fg)' : 'var(--fg-3)',
              fontWeight: active ? 500 : 400,
              border: active ? '1px solid var(--line)' : '1px solid transparent',
              borderRadius: 'var(--r-sm)',
              boxShadow: active ? 'var(--shadow-1)' : 'none',
              cursor: 'pointer',
              transition: 'background var(--dur) var(--ease), color var(--dur) var(--ease)',
            }}
          >
            {icon && <Icon name={icon} size={14} />}
            {label}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------- Tabs -------------------- */
function Tabs({ value, onChange, options }) {
  return (
    <div style={{
      display: 'flex', gap: 0, borderBottom: '1px solid var(--line)',
      alignItems: 'flex-end',
    }}>
      {options.map(opt => {
        const v = typeof opt === 'string' ? opt : opt.value;
        const label = typeof opt === 'string' ? opt : opt.label;
        const count = typeof opt === 'object' ? opt.count : null;
        const active = v === value;
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            style={{
              padding: '10px 16px', fontSize: 13, fontWeight: active ? 500 : 400,
              color: active ? 'var(--fg)' : 'var(--fg-3)',
              borderBottom: '2px solid', borderColor: active ? 'var(--bronze)' : 'transparent',
              marginBottom: -1,
              cursor: 'pointer',
              transition: 'color var(--dur) var(--ease), border-color var(--dur) var(--ease)',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            {label}
            {count != null && (
              <span style={{
                fontSize: 11, padding: '1px 6px',
                background: active ? 'var(--bronze-soft)' : 'var(--bg-2)',
                color: active ? 'var(--bronze-2)' : 'var(--fg-3)',
                borderRadius: 999, fontWeight: 500,
              }}>{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------- Avatar -------------------- */
function Avatar({ name, size = 28, src, tone }) {
  const initials = name ? name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() : '?';
  const hash = name ? name.charCodeAt(0) + (name.charCodeAt(1) || 0) : 0;
  const palette = ['var(--bronze)', 'var(--good)', 'var(--info)', 'var(--warn)', 'var(--bad)'];
  const bg = tone || palette[hash % palette.length];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size, height: size,
      borderRadius: 999,
      background: bg, color: '#fff8ee',
      fontSize: size * 0.4, fontWeight: 600,
      flexShrink: 0,
      backgroundImage: src ? `url(${src})` : 'none',
      backgroundSize: 'cover',
    }}>
      {!src && initials}
    </span>
  );
}

/* -------------------- Drawer / Sheet -------------------- */
function Drawer({ open, onClose, width = 520, children, side = 'right' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      pointerEvents: open ? 'auto' : 'none',
    }}>
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(43, 35, 27, 0.32)',
          backdropFilter: 'blur(2px)',
          opacity: open ? 1 : 0,
          transition: 'opacity var(--dur-2) var(--ease)',
        }}
      ></div>
      <div style={{
        position: 'absolute', top: 0, bottom: 0,
        [side]: 0,
        width, maxWidth: '94vw',
        background: 'var(--surface)',
        borderLeft: side === 'right' ? '1px solid var(--line)' : 'none',
        borderRight: side === 'left' ? '1px solid var(--line)' : 'none',
        boxShadow: 'var(--shadow-drawer)',
        transform: open ? 'translateX(0)' : `translateX(${side === 'right' ? '100%' : '-100%'})`,
        transition: 'transform var(--dur-2) var(--ease)',
        display: 'flex', flexDirection: 'column',
      }}>
        {children}
      </div>
    </div>
  );
}

/* -------------------- Search input -------------------- */
function SearchInput({ value, onChange, placeholder = 'Search…', size = 'md', icon = 'search', kbd, style }) {
  const sz = size === 'sm' ? { h: 30, f: 13 } : { h: 36, f: 14 };
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      height: sz.h, padding: '0 12px',
      background: 'var(--surface)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--r-md)',
      fontSize: sz.f,
      transition: 'border-color var(--dur) var(--ease)',
      ...style,
    }}>
      <Icon name={icon} size={16} color="var(--fg-3)" />
      <input
        value={value || ''}
        onChange={e => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1, minWidth: 0, border: 'none', background: 'transparent',
          outline: 'none', fontSize: sz.f, color: 'var(--fg)',
        }}
      />
      {kbd && <Kbd>{kbd}</Kbd>}
    </div>
  );
}

/* -------------------- Kbd hint -------------------- */
function Kbd({ children, style }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '1px 6px', fontSize: 11, fontFamily: 'var(--font-mono)',
      background: 'var(--bg-2)',
      border: '1px solid var(--line)',
      borderRadius: 5, color: 'var(--fg-3)',
      lineHeight: 1.4,
      ...style,
    }}>{children}</span>
  );
}

/* -------------------- Sparkline (mini SVG) -------------------- */
function Sparkline({ data, width = 64, height = 18, color = 'var(--bronze)', filled = false, hover }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1 || 1);
  const points = data.map((v, i) => [i * stepX, height - ((v - min) / range) * height]);
  const path = points.map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`)).join(' ');
  const area = filled ? `${path} L ${width} ${height} L 0 ${height} Z` : null;
  const last = points[points.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', overflow: 'visible' }}>
      {area && <path d={area} fill={color} opacity={0.15}></path>}
      <path d={path} fill="none" stroke={color} strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round"></path>
      {hover && <circle cx={last[0]} cy={last[1]} r={2} fill={color}></circle>}
    </svg>
  );
}

/* -------------------- Bar (for inline bar charts) -------------------- */
function MiniBar({ data, width = 60, height = 16, color = 'var(--bronze)' }) {
  const max = Math.max(...data);
  const barW = width / data.length - 1;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {data.map((v, i) => {
        const h = (v / max) * height;
        return <rect key={i} x={i * (barW + 1)} y={height - h} width={barW} height={h} fill={color} rx={1}></rect>;
      })}
    </svg>
  );
}

/* -------------------- Page header -------------------- */
function PageHeader({ title, subtitle, actions, eyebrow }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      gap: 'var(--s-4)', flexWrap: 'wrap',
      paddingBottom: 'var(--s-5)',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 500, letterSpacing: '-0.01em', color: 'var(--fg)' }}>{title}</h1>
        {subtitle && <span style={{ color: 'var(--fg-3)', fontSize: 14 }}>{subtitle}</span>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  );
}

/* -------------------- Empty input field -------------------- */
function Field({ label, hint, children, required, style }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {label && (
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-2)' }}>
          {label}{required && <span style={{ color: 'var(--bad)', marginLeft: 2 }}>*</span>}
        </span>
      )}
      {children}
      {hint && <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>{hint}</span>}
    </label>
  );
}

function Input({ value, onChange, placeholder, type = 'text', icon, suffix, size = 'md', style, ...rest }) {
  const sz = size === 'sm' ? { h: 30, f: 13 } : { h: 36, f: 14 };
  const [focus, setFocus] = useState(false);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      height: sz.h, padding: '0 12px',
      background: 'var(--surface)',
      border: '1px solid',
      borderColor: focus ? 'var(--bronze)' : 'var(--line-strong)',
      borderRadius: 'var(--r-md)',
      boxShadow: focus ? '0 0 0 3px var(--focus-ring)' : 'none',
      transition: 'border-color var(--dur) var(--ease), box-shadow var(--dur) var(--ease)',
      ...style,
    }}>
      {icon && <Icon name={icon} size={15} color="var(--fg-3)" />}
      <input
        type={type}
        value={value ?? ''}
        onChange={e => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          flex: 1, minWidth: 0, border: 'none', background: 'transparent',
          outline: 'none', fontSize: sz.f, color: 'var(--fg)',
        }}
        {...rest}
      />
      {suffix && <span style={{ fontSize: 12, color: 'var(--fg-4)' }}>{suffix}</span>}
    </div>
  );
}

function Textarea({ value, onChange, placeholder, rows = 4, style, ...rest }) {
  const [focus, setFocus] = useState(false);
  return (
    <textarea
      value={value ?? ''}
      onChange={e => onChange && onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={{
        padding: '8px 12px',
        background: 'var(--surface)',
        border: '1px solid',
        borderColor: focus ? 'var(--bronze)' : 'var(--line-strong)',
        borderRadius: 'var(--r-md)',
        boxShadow: focus ? '0 0 0 3px var(--focus-ring)' : 'none',
        outline: 'none', fontSize: 14, color: 'var(--fg)',
        fontFamily: 'inherit', resize: 'vertical',
        transition: 'border-color var(--dur) var(--ease), box-shadow var(--dur) var(--ease)',
        ...style,
      }}
      {...rest}
    />
  );
}

/* -------------------- Table primitives -------------------- */
function Table({ children, style }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--r-lg)',
      overflow: 'hidden',
      ...style,
    }}>{children}</div>
  );
}

function TableHead({ children, style }) {
  return (
    <div style={{
      display: 'grid',
      padding: '10px var(--s-4)',
      background: 'var(--bg-2)',
      borderBottom: '1px solid var(--line)',
      fontSize: 11, fontWeight: 500, color: 'var(--fg-4)',
      textTransform: 'uppercase', letterSpacing: '0.06em',
      ...style,
    }}>{children}</div>
  );
}

function TableRow({ children, onClick, active, style, padding = '12px var(--s-4)' }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid',
        padding,
        background: active ? 'var(--row-active)' : hover && onClick ? 'var(--row-hover)' : 'transparent',
        borderBottom: '1px solid var(--line-2)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background var(--dur) var(--ease)',
        fontSize: 13,
        alignItems: 'center',
        ...style,
      }}
    >{children}</div>
  );
}

/* -------------------- Divider, Section -------------------- */
function Divider({ vertical, style }) {
  return vertical
    ? <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--line)', ...style }}></div>
    : <div style={{ height: 1, background: 'var(--line)', ...style }}></div>;
}

function Section({ title, action, children, dense, style }) {
  return (
    <section style={{ ...style }}>
      {(title || action) && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: dense ? 'var(--s-3)' : 'var(--s-4)',
        }}>
          {title && <h2 style={{ margin: 0, fontSize: 15, fontWeight: 500, color: 'var(--fg-2)' }}>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/* -------------------- Tooltip (basic) -------------------- */
function Tooltip({ content, children, side = 'top' }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      style={{ position: 'relative', display: 'inline-flex' }}
    >
      {children}
      {open && (
        <span style={{
          position: 'absolute',
          bottom: side === 'top' ? '100%' : 'auto',
          top: side === 'bottom' ? '100%' : 'auto',
          left: '50%', transform: 'translateX(-50%)',
          marginBottom: side === 'top' ? 6 : 0,
          marginTop: side === 'bottom' ? 6 : 0,
          padding: '6px 10px', fontSize: 11.5, lineHeight: 1.4,
          background: 'var(--ink)', color: 'var(--paper)',
          borderRadius: 6, whiteSpace: 'nowrap',
          pointerEvents: 'none', zIndex: 50,
          boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
        }}>{content}</span>
      )}
    </span>
  );
}

/* -------------------- Empty state -------------------- */
function Empty({ icon = 'sparkle', title, body, action }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 12, padding: 'var(--s-8) var(--s-5)',
      color: 'var(--fg-3)', textAlign: 'center',
    }}>
      <Icon name={icon} size={28} color="var(--fg-4)" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg-2)' }}>{title}</div>
        {body && <div style={{ fontSize: 13 }}>{body}</div>}
      </div>
      {action}
    </div>
  );
}

/* -------------------- Currency helpers -------------------- */
function thb(n, opts = {}) {
  if (n == null || isNaN(n)) return '—';
  const sign = n < 0 ? '-' : '';
  const v = Math.abs(n);
  const formatted = opts.compact && v >= 1000
    ? (v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : Math.round(v / 100) / 10 + 'k')
    : v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return `${sign}฿${formatted}`;
}

function fmtPct(n, sign = true) {
  const s = n > 0 && sign ? '+' : '';
  return `${s}${n.toFixed(1)}%`;
}

/* expose everything to window */
Object.assign(window, {
  Button, Pill, Card, Stat, Toggle, Segmented, Tabs, Avatar, Drawer,
  SearchInput, Kbd, Sparkline, MiniBar, PageHeader, Field, Input, Textarea,
  Table, TableHead, TableRow, Divider, Section, Tooltip, Empty,
  thb, fmtPct,
});
