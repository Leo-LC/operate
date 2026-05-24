/* global React, Icon, Card, Stat, Pill, Button, Sparkline, MiniBar, Segmented, Tooltip, PageHeader, Drawer, Kbd, thb, fmtPct, DATA, shopName, shopShort */

const { useState, useMemo, useEffect, useCallback } = React;

function AccountingModule() {
  const D = window.DATA;
  const [view, setView] = useState('smart');     // smart | focus
  const [openDay, setOpenDay] = useState(null);  // {weekIdx, dayIdx}
  const [hoverSpark, setHoverSpark] = useState(null);

  const flatDays = useMemo(() => {
    const out = [];
    D.ACCT_WEEKS.forEach((w, wi) => w.days.forEach((d, di) => out.push({ ...d, weekIdx: wi, dayIdx: di })));
    return out;
  }, [D]);

  const dayOpen = useMemo(() => openDay && D.ACCT_WEEKS[openDay.weekIdx]?.days[openDay.dayIdx], [openDay, D]);

  // j/k navigation
  useEffect(() => {
    if (!openDay) return;
    const onKey = (e) => {
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        const idx = flatDays.findIndex(d => d.weekIdx === openDay.weekIdx && d.dayIdx === openDay.dayIdx);
        const next = flatDays[Math.min(flatDays.length - 1, idx + 1)];
        setOpenDay({ weekIdx: next.weekIdx, dayIdx: next.dayIdx });
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        const idx = flatDays.findIndex(d => d.weekIdx === openDay.weekIdx && d.dayIdx === openDay.dayIdx);
        const prev = flatDays[Math.max(0, idx - 1)];
        setOpenDay({ weekIdx: prev.weekIdx, dayIdx: prev.dayIdx });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openDay, flatDays]);

  // monthly totals + sparklines
  const cols = ['sales', 'payments', 'expenses', 'hr', 'net'];
  const colMeta = {
    sales:    { label: 'Sales',    tone: 'var(--good)'  },
    payments: { label: 'Payments', tone: 'var(--info)'  },
    expenses: { label: 'Expenses', tone: 'var(--bad)'   },
    hr:       { label: 'HR',       tone: 'var(--warn)'  },
    net:      { label: 'Net',      tone: 'var(--bronze)'},
  };
  const sparks = cols.reduce((acc, c) => { acc[c] = flatDays.map(d => d[c]); return acc; }, {});

  const monthTotals = flatDays.reduce((acc, d) => {
    cols.forEach(c => { acc[c] = (acc[c] || 0) + d[c]; });
    return acc;
  }, {});

  return (
    <div className="module-pad">
      <PageHeader
        eyebrow="May 2026 · 4 weeks"
        title="Accounting"
        subtitle="Daily roll-up across 8 shops. Click any day to see the breakdown."
        actions={
          <>
            <Segmented value={view} onChange={setView} options={[
              { value: 'smart', label: 'Smart table', icon: 'list' },
              { value: 'focus', label: 'Focus day',   icon: 'eye' },
            ]} />
            <Button icon="filter" size="md">Filters</Button>
            <Button icon="download" size="md">Export</Button>
          </>
        }
      />

      {view === 'smart' ? (
        <SmartTable
          weeks={D.ACCT_WEEKS}
          sparks={sparks}
          monthTotals={monthTotals}
          cols={cols} colMeta={colMeta}
          onOpenDay={setOpenDay}
          hoverSpark={hoverSpark}
          setHoverSpark={setHoverSpark}
        />
      ) : (
        <FocusDay days={flatDays} onOpenDay={setOpenDay} />
      )}

      <DayDrawer
        open={!!openDay}
        day={dayOpen}
        onClose={() => setOpenDay(null)}
      />
    </div>
  );
}

/* -------------------- Smart Table -------------------- */
function SmartTable({ weeks, sparks, monthTotals, cols, colMeta, onOpenDay, hoverSpark, setHoverSpark }) {
  const grid = '110px 1fr 1fr 1fr 1fr 1fr 36px';
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--r-lg)', overflow: 'hidden',
    }}>
      {/* Header with sparklines */}
      <div style={{
        display: 'grid', gridTemplateColumns: grid,
        padding: '12px var(--s-4)', background: 'var(--bg-2)',
        borderBottom: '1px solid var(--line)',
        alignItems: 'center', gap: 12,
      }}>
        <div className="eyebrow">Day</div>
        {cols.map(c => (
          <ColumnHeader
            key={c}
            label={colMeta[c].label}
            data={sparks[c]}
            tone={colMeta[c].tone}
            total={monthTotals[c]}
            hover={hoverSpark === c}
            onHover={() => setHoverSpark(c)}
            onLeave={() => setHoverSpark(null)}
          />
        ))}
        <div></div>
      </div>

      {/* Weeks */}
      {weeks.map((w, wi) => (
        <div key={wi}>
          {/* Days */}
          {w.days.map((d, di) => (
            <DayRow key={di} day={d} cols={cols} colMeta={colMeta}
                    grid={grid}
                    onOpen={() => onOpenDay({ weekIdx: wi, dayIdx: di })}
            />
          ))}
          {/* Weekly subtotal */}
          <div style={{
            display: 'grid', gridTemplateColumns: grid,
            padding: '10px var(--s-4)',
            background: 'var(--bg-2)',
            borderTop: '1px solid var(--line)',
            borderBottom: '1px solid var(--line)',
            alignItems: 'center', gap: 12,
            fontSize: 12,
          }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 500, color: 'var(--fg)' }}>{w.label}</span>
              <span style={{ color: 'var(--fg-4)' }}>subtotal</span>
            </div>
            {cols.map(c => (
              <span key={c} className="mono tabular" style={{
                fontWeight: 500, color: 'var(--fg)',
              }}>
                {thb(w.totals[c])}
              </span>
            ))}
            <div></div>
          </div>
        </div>
      ))}

      {/* Month total */}
      <div style={{
        display: 'grid', gridTemplateColumns: grid,
        padding: '14px var(--s-4)',
        background: 'var(--bronze-soft)',
        alignItems: 'center', gap: 12,
        fontSize: 13,
      }}>
        <div style={{ fontWeight: 600, color: 'var(--ink)' }}>May total</div>
        {cols.map(c => (
          <span key={c} className="mono tabular" style={{
            fontWeight: 600, color: 'var(--ink)',
          }}>
            {thb(monthTotals[c])}
          </span>
        ))}
        <div></div>
      </div>
    </div>
  );
}

function ColumnHeader({ label, data, tone, total, hover, onHover, onLeave }) {
  const [tip, setTip] = useState(null);
  return (
    <div
      onMouseEnter={onHover}
      onMouseLeave={() => { onLeave(); setTip(null); }}
      style={{ display: 'flex', flexDirection: 'column', gap: 4, cursor: 'help', position: 'relative' }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      }}>
        <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>
          {label}
        </span>
      </div>
      <div
        onMouseMove={e => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const idx = Math.min(data.length - 1, Math.max(0, Math.round(x / rect.width * (data.length - 1))));
          setTip({ idx, x });
        }}
        style={{ position: 'relative', height: 22 }}
      >
        <Sparkline data={data} width={120} height={22} color={tone} filled hover />
        {tip && (
          <span style={{
            position: 'absolute', left: tip.x, top: -32,
            transform: 'translateX(-50%)',
            background: 'var(--ink)', color: 'var(--paper)',
            padding: '4px 8px', borderRadius: 6, fontSize: 11,
            whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 20,
            fontFamily: 'var(--font-mono)',
          }}>
            d{tip.idx + 1}: {thb(data[tip.idx])}
          </span>
        )}
      </div>
      <span className="mono" style={{ fontSize: 12, color: 'var(--fg-2)', fontWeight: 500 }}>
        {thb(total)}
      </span>
    </div>
  );
}

function DayRow({ day, cols, colMeta, grid, onOpen }) {
  const [hover, setHover] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyCSV = useCallback((e) => {
    e.stopPropagation();
    const csv = `date,${cols.join(',')}\n${day.dateStr},${cols.map(c => day[c]).join(',')}`;
    navigator.clipboard?.writeText(csv).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  }, [day, cols]);

  return (
    <div
      onClick={onOpen}
      data-row-kind="day"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid', gridTemplateColumns: grid,
        padding: '10px var(--s-4)',
        borderBottom: '1px solid var(--line-2)',
        cursor: 'pointer',
        background: hover ? 'var(--row-hover)' : 'transparent',
        transition: 'background var(--dur) var(--ease)',
        gap: 12,
        alignItems: 'center',
        fontSize: 13,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontWeight: 500 }}>{day.dayLabel}</span>
        <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>{day.dateStr}</span>
      </div>
      {cols.map(c => (
        <span key={c} className="mono tabular" style={{ color: c === 'net' && day[c] < 0 ? 'var(--bad)' : 'var(--fg)' }}>
          {thb(day[c])}
        </span>
      ))}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        {hover && (
          <button
            onClick={copyCSV}
            title="Copy row as CSV"
            style={{
              width: 26, height: 26, borderRadius: 6,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: copied ? 'var(--good)' : 'var(--fg-3)',
              background: copied ? 'var(--good-soft)' : 'transparent',
            }}
          >
            <Icon name={copied ? 'check' : 'copy'} size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

/* -------------------- Focus Day view -------------------- */
function FocusDay({ days, onOpenDay }) {
  const [idx, setIdx] = useState(days.length - 2);
  const day = days[idx];

  return (
    <div>
      {/* Day strip */}
      <div style={{
        display: 'flex', gap: 6, overflowX: 'auto',
        marginBottom: 'var(--s-5)', padding: '4px 0',
      }}>
        {days.map((d, i) => {
          const active = i === idx;
          return (
            <button
              key={i}
              onClick={() => setIdx(i)}
              style={{
                flexShrink: 0, padding: '10px 12px',
                background: active ? 'var(--bronze)' : 'var(--surface)',
                color: active ? '#fff8ee' : 'var(--fg-2)',
                border: `1px solid ${active ? 'var(--bronze)' : 'var(--line)'}`,
                borderRadius: 8, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', gap: 2, minWidth: 78,
                fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 500, textAlign: 'left' }}>{d.dayLabel}</span>
              <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'left' }}>{d.dateStr}</span>
              <span className="mono" style={{ fontSize: 11, opacity: 0.85, textAlign: 'left' }}>{thb(d.sales, { compact: true })}</span>
            </button>
          );
        })}
      </div>

      {/* Focus content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card padding="var(--s-5)">
          <div className="eyebrow">Net for {day.dayLabel} {day.dateStr}</div>
          <div className="mono tabular" style={{ fontSize: 44, fontWeight: 500, marginTop: 6, letterSpacing: '-0.02em' }}>
            {thb(day.net)}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
            <Pill tone="good" dot>+12% vs last {day.dayLabel}</Pill>
            <Pill tone="info">Forecast met</Pill>
          </div>

          <div style={{ marginTop: 'var(--s-5)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <BreakdownBar label="Sales" value={day.sales} max={day.sales} tone="var(--good)" />
            <BreakdownBar label="Payments collected" value={day.payments} max={day.sales} tone="var(--info)" />
            <BreakdownBar label="Expenses" value={day.expenses} max={day.sales} tone="var(--bad)" />
            <BreakdownBar label="HR cost" value={day.hr} max={day.sales} tone="var(--warn)" />
          </div>
        </Card>

        <Card padding="0">
          <div style={{ padding: '14px var(--s-5)', borderBottom: '1px solid var(--line)' }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>By shop</div>
            <div style={{ fontSize: 12, color: 'var(--fg-4)', marginTop: 2 }}>{day.shops.length} locations</div>
          </div>
          <div style={{ padding: 'var(--s-3) var(--s-5)' }}>
            {day.shops.map((s, i) => {
              const pct = s.sales / Math.max(...day.shops.map(x => x.sales)) * 100;
              return (
                <div key={s.shopId} style={{
                  display: 'grid', gridTemplateColumns: '1fr 100px 80px',
                  alignItems: 'center', gap: 12,
                  padding: '8px 0',
                  borderBottom: i < day.shops.length - 1 ? '1px solid var(--line-2)' : 'none',
                }}>
                  <span style={{ fontSize: 13 }}>{shopName(s.shopId)}</span>
                  <div style={{ height: 6, background: 'var(--bg-2)', borderRadius: 3 }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'var(--bronze)', borderRadius: 3 }}></div>
                  </div>
                  <span className="mono tabular" style={{ fontSize: 12, textAlign: 'right', color: 'var(--fg-2)' }}>
                    {thb(s.sales)}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

function BreakdownBar({ label, value, max, tone }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
        <span style={{ color: 'var(--fg-2)' }}>{label}</span>
        <span className="mono tabular" style={{ fontWeight: 500 }}>{thb(value)}</span>
      </div>
      <div style={{ height: 8, background: 'var(--bg-2)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${value / max * 100}%`, height: '100%', background: tone, borderRadius: 4 }}></div>
      </div>
    </div>
  );
}

/* -------------------- Day Drawer -------------------- */
function DayDrawer({ open, day, onClose }) {
  if (!day) return <Drawer open={false} onClose={onClose}></Drawer>;
  const sections = [
    { id: 'sales',    title: 'Sales',    icon: 'cash',    tone: 'good',    amount: day.sales,    items: [
      { label: 'Animal experience tickets', value: Math.round(day.sales * 0.62) },
      { label: 'F&B', value: Math.round(day.sales * 0.24) },
      { label: 'Merch', value: Math.round(day.sales * 0.09) },
      { label: 'Events', value: Math.round(day.sales * 0.05) },
    ]},
    { id: 'payments', title: 'Payments', icon: 'wallet',  tone: 'info',    amount: day.payments, items: [
      { label: 'Cash drawer', value: Math.round(day.payments * 0.34) },
      { label: 'Card (POS)', value: Math.round(day.payments * 0.52) },
      { label: 'PromptPay QR', value: Math.round(day.payments * 0.14) },
    ]},
    { id: 'expenses', title: 'Expenses', icon: 'bag',     tone: 'bad',     amount: day.expenses, items: [
      { label: 'Animal food + bedding', value: Math.round(day.expenses * 0.31) },
      { label: 'Beans + dairy', value: Math.round(day.expenses * 0.28) },
      { label: 'Utilities (est.)', value: Math.round(day.expenses * 0.18) },
      { label: 'Misc / petty', value: Math.round(day.expenses * 0.23) },
    ]},
    { id: 'hr',       title: 'HR',       icon: 'users',   tone: 'warn',    amount: day.hr, items: [
      { label: 'Day shift wages', value: Math.round(day.hr * 0.55) },
      { label: 'Evening shift wages', value: Math.round(day.hr * 0.30) },
      { label: 'Tips pool', value: Math.round(day.hr * 0.15) },
    ]},
    { id: 'treasury', title: 'Treasury', icon: 'layers',  tone: 'bronze',  amount: day.net, items: [
      { label: 'Net to operating account', value: day.net },
      { label: 'Reserve transfer (10%)', value: -Math.round(day.net * 0.10) },
    ]},
  ];

  return (
    <Drawer open={open} onClose={onClose} width={560}>
      {/* Header */}
      <div style={{
        padding: 'var(--s-4) var(--s-5)',
        borderBottom: '1px solid var(--line)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div className="eyebrow">{day.dayLabel} · breakdown</div>
          <div style={{ fontSize: 20, fontWeight: 500, marginTop: 2 }}>{day.dateStr}, 2026</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Tooltip content="Previous day">
            <button style={{ width: 30, height: 30, color: 'var(--fg-3)' }}>
              <Kbd>k</Kbd>
            </button>
          </Tooltip>
          <Tooltip content="Next day">
            <button style={{ width: 30, height: 30, color: 'var(--fg-3)' }}>
              <Kbd>j</Kbd>
            </button>
          </Tooltip>
          <button onClick={onClose} style={{
            width: 32, height: 32, color: 'var(--fg-3)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 6,
          }}>
            <Icon name="close" size={16} />
          </button>
        </div>
      </div>

      {/* Headline net */}
      <div style={{
        padding: 'var(--s-5)',
        borderBottom: '1px solid var(--line)',
        background: 'var(--surface-2)',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div className="eyebrow">Net</div>
            <div className="mono tabular" style={{ fontSize: 32, fontWeight: 500, letterSpacing: '-0.01em', marginTop: 2, color: day.net >= 0 ? 'var(--fg)' : 'var(--bad)' }}>
              {thb(day.net)}
            </div>
          </div>
          <div>
            <div className="eyebrow">Sessions</div>
            <div className="mono tabular" style={{ fontSize: 32, fontWeight: 500, letterSpacing: '-0.01em', marginTop: 2 }}>
              {Math.round(day.sales / 380)}
            </div>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--s-4) var(--s-5)' }}>
        {sections.map(sec => (
          <DrawerSection key={sec.id} section={sec} />
        ))}
      </div>

      {/* Footer */}
      <div style={{
        padding: 'var(--s-3) var(--s-5)',
        borderTop: '1px solid var(--line)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'var(--surface-2)',
      }}>
        <div style={{ display: 'flex', gap: 6, fontSize: 11, color: 'var(--fg-4)' }}>
          <Kbd>j</Kbd> next · <Kbd>k</Kbd> prev · <Kbd>esc</Kbd> close
        </div>
        <Button size="sm" icon="external">Open full ledger</Button>
      </div>
    </Drawer>
  );
}

function DrawerSection({ section }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ padding: '14px 0', borderBottom: '1px solid var(--line-2)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          width: '100%', textAlign: 'left', cursor: 'pointer',
        }}
      >
        <Pill tone={section.tone} icon={section.icon} size="sm" style={{ padding: 6 }}>{null}</Pill>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{section.title}</span>
        <span className="mono tabular" style={{ fontSize: 14, fontWeight: 500, color: section.amount < 0 ? 'var(--bad)' : 'var(--fg)' }}>
          {thb(section.amount)}
        </span>
        <Icon name={open ? 'chevUp' : 'chevDown'} size={14} color="var(--fg-4)" />
      </button>
      {open && (
        <div style={{
          marginTop: 10, marginLeft: 36,
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          {section.items.map((it, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--fg-3)' }}>{it.label}</span>
              <span className="mono tabular" style={{ color: it.value < 0 ? 'var(--bad)' : 'var(--fg-2)' }}>
                {thb(it.value)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

window.AccountingModule = AccountingModule;
