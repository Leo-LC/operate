/* global React, Icon, Card, Stat, Pill, Button, Avatar, Segmented, PageHeader, Sparkline, thb, fmtPct, DATA, shopName, emp */

const { useState, useMemo } = React;

function PaymentsModule() {
  const D = window.DATA;
  const [view, setView] = useState('table');
  const [selected, setSelected] = useState(D.PAYMENTS[0].id);
  const [statusFilter, setStatusFilter] = useState('all');
  const [checked, setChecked] = useState(new Set());

  const stats = useMemo(() => {
    const total = D.PAYMENTS.reduce((a, p) => a + p.total, 0);
    const drafts = D.PAYMENTS.filter(p => p.status === 'draft');
    const draftAmt = drafts.reduce((a, p) => a + p.total, 0);
    const paid = D.PAYMENTS.filter(p => p.status === 'paid').reduce((a, p) => a + p.total, 0);
    return { total, draftCount: drafts.length, draftAmt, paid, headcount: D.PAYMENTS.length };
  }, [D]);

  const filtered = statusFilter === 'all'
    ? D.PAYMENTS
    : D.PAYMENTS.filter(p => p.status === statusFilter);

  const grouped = useMemo(() => {
    const out = { draft: [], confirmed: [], paid: [] };
    filtered.forEach(p => out[p.status].push(p));
    return out;
  }, [filtered]);

  const toggle = (id) => {
    const next = new Set(checked);
    if (next.has(id)) next.delete(id); else next.add(id);
    setChecked(next);
  };

  return (
    <div className="module-pad">
      <PageHeader
        eyebrow="Payroll · May 2026"
        title="Payments"
        subtitle="Wages, tips and deductions for the period."
        actions={
          <>
            <Segmented value={view} onChange={setView} options={[
              { value: 'table',  label: 'Table',  icon: 'list' },
              { value: 'detail', label: 'Detail', icon: 'eye'  },
            ]} />
            <Button icon="plus">New payment</Button>
            <Button variant="primary" icon="check" disabled={stats.draftCount === 0}>
              Confirm {stats.draftCount} drafts
            </Button>
          </>
        }
      />

      {/* Stats band */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
        marginBottom: 'var(--s-5)',
      }}>
        <Stat label="Total payroll" prefix="฿" value={(stats.total / 1000).toFixed(0) + 'k'} hint={`${stats.headcount} people`} />
        <Stat label="Drafts" value={stats.draftCount} delta={thb(stats.draftAmt)} deltaTone="warn" hint="Awaiting confirm" />
        <Stat label="Paid so far" prefix="฿" value={(stats.paid / 1000).toFixed(0) + 'k'} hint="May 1–24" />
        <Stat label="Due in" value="7" suffix="days" hint="May 31, 2026" />
      </div>

      {view === 'table' ? (
        <TableView
          grouped={grouped}
          checked={checked} toggle={toggle}
          statusFilter={statusFilter} setStatusFilter={setStatusFilter}
        />
      ) : (
        <DetailView selected={selected} setSelected={setSelected} payments={D.PAYMENTS} />
      )}
    </div>
  );
}

/* -------------------- Table view -------------------- */
function TableView({ grouped, checked, toggle, statusFilter, setStatusFilter }) {
  const grid = '30px 1.4fr 1fr 90px 100px 100px 110px 110px 100px';
  return (
    <div>
      {/* filter row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s-3)' }}>
        <Segmented value={statusFilter} onChange={setStatusFilter} options={[
          { value: 'all',       label: 'All' },
          { value: 'draft',     label: 'Drafts' },
          { value: 'confirmed', label: 'Confirmed' },
          { value: 'paid',      label: 'Paid' },
        ]} size="sm" />
        <span style={{ fontSize: 12, color: 'var(--fg-4)' }}>
          {checked.size > 0 ? `${checked.size} selected · ` : ''}
          Period May 2026 · Due May 31
        </span>
      </div>

      <div style={{
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: 'var(--r-lg)', overflow: 'hidden',
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: grid,
          padding: '10px var(--s-4)', background: 'var(--bg-2)',
          borderBottom: '1px solid var(--line)', fontSize: 11,
          textTransform: 'uppercase', letterSpacing: '0.06em',
          color: 'var(--fg-4)', fontWeight: 500, gap: 12, alignItems: 'center',
        }}>
          <div></div>
          <div>Employee</div>
          <div>Shop · Role</div>
          <div style={{ textAlign: 'right' }}>Hours</div>
          <div style={{ textAlign: 'right' }}>Base</div>
          <div style={{ textAlign: 'right' }}>Tips</div>
          <div style={{ textAlign: 'right' }}>Deduct.</div>
          <div style={{ textAlign: 'right' }}>Total</div>
          <div></div>
        </div>

        {['draft', 'confirmed', 'paid'].filter(g => grouped[g].length > 0).map(group => (
          <div key={group}>
            <div style={{
              padding: '8px var(--s-4)',
              background: 'var(--surface-2)',
              borderBottom: '1px solid var(--line-2)',
              fontSize: 11, color: 'var(--fg-3)', fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Pill tone={group === 'draft' ? 'warn' : group === 'confirmed' ? 'info' : 'good'} size="sm" dot>
                {group.toUpperCase()}
              </Pill>
              <span>{grouped[group].length} · {thb(grouped[group].reduce((a, p) => a + p.total, 0))}</span>
            </div>
            {grouped[group].map(p => (
              <PaymentRow key={p.id} p={p} grid={grid} checked={checked.has(p.id)} onToggle={() => toggle(p.id)} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function PaymentRow({ p, grid, checked, onToggle }) {
  const [hover, setHover] = useState(false);
  const e = emp(p.employeeId);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid', gridTemplateColumns: grid,
        padding: '12px var(--s-4)', alignItems: 'center', gap: 12,
        background: hover ? 'var(--row-hover)' : 'transparent',
        borderBottom: '1px solid var(--line-2)',
        fontSize: 13,
      }}
    >
      <div onClick={onToggle} style={{ cursor: 'pointer' }}>
        <span style={{
          width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: checked ? 'var(--bronze)' : 'var(--surface)',
          border: `1px solid ${checked ? 'var(--bronze)' : 'var(--line-strong)'}`,
          borderRadius: 4, color: '#fff',
        }}>
          {checked && <Icon name="check" size={11} />}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar name={p.employeeName} size={28} />
        <div>
          <div style={{ fontWeight: 500 }}>{p.employeeName}</div>
          <div style={{ fontSize: 11, color: 'var(--fg-4)' }}>Joined {e?.joined}</div>
        </div>
      </div>
      <div>
        <div>{shopName(p.shopId)}</div>
        <div style={{ fontSize: 11, color: 'var(--fg-4)' }}>{p.role}</div>
      </div>
      <span className="mono tabular" style={{ textAlign: 'right' }}>{p.hours}h{p.overtime ? ` +${p.overtime}` : ''}</span>
      <span className="mono tabular" style={{ textAlign: 'right' }}>{thb(p.base)}</span>
      <span className="mono tabular" style={{ textAlign: 'right', color: 'var(--good)' }}>+{thb(p.tips)}</span>
      <span className="mono tabular" style={{ textAlign: 'right', color: p.deduction ? 'var(--bad)' : 'var(--fg-4)' }}>
        {p.deduction ? `-${thb(p.deduction)}` : '—'}
      </span>
      <span className="mono tabular" style={{ textAlign: 'right', fontWeight: 500, fontSize: 14 }}>{thb(p.total)}</span>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
        {hover && (
          <button style={{ width: 26, height: 26, color: 'var(--fg-3)', borderRadius: 6 }}>
            <Icon name="more" size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

/* -------------------- Detail view (two-pane) -------------------- */
function DetailView({ selected, setSelected, payments }) {
  const p = payments.find(x => x.id === selected) || payments[0];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
      {/* List left */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: 'var(--r-lg)', overflow: 'hidden',
        height: 'calc(100vh - 280px)', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          padding: '10px 14px', borderBottom: '1px solid var(--line)',
          fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em',
          color: 'var(--fg-4)', fontWeight: 500,
        }}>
          People · {payments.length}
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {payments.map(pay => {
            const active = pay.id === selected;
            return (
              <button
                key={pay.id}
                onClick={() => setSelected(pay.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', width: '100%', textAlign: 'left',
                  background: active ? 'var(--row-active)' : 'transparent',
                  borderBottom: '1px solid var(--line-2)',
                  cursor: 'pointer',
                  borderLeft: `2px solid ${active ? 'var(--bronze)' : 'transparent'}`,
                }}
              >
                <Avatar name={pay.employeeName} size={28} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{pay.employeeName}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-4)' }}>{shopName(pay.shopId)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="mono tabular" style={{ fontSize: 12, fontWeight: 500 }}>{thb(pay.total)}</div>
                  <Pill tone={pay.status === 'draft' ? 'warn' : pay.status === 'confirmed' ? 'info' : 'good'} size="sm" dot>
                    {pay.status}
                  </Pill>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail right */}
      <DetailPane p={p} />
    </div>
  );
}

function DetailPane({ p }) {
  const [whyOpen, setWhyOpen] = useState(false);
  const e = emp(p.employeeId);
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--line)',
      borderRadius: 'var(--r-lg)', padding: 'var(--s-5)',
      display: 'flex', flexDirection: 'column', gap: 'var(--s-5)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 'var(--s-4)', borderBottom: '1px solid var(--line)' }}>
        <Avatar name={p.employeeName} size={48} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 500 }}>{p.employeeName}</div>
          <div style={{ fontSize: 13, color: 'var(--fg-3)' }}>{p.role} · {shopName(p.shopId)} · Joined {e?.joined}</div>
        </div>
        <Pill tone={p.status === 'draft' ? 'warn' : p.status === 'confirmed' ? 'info' : 'good'} dot>{p.status}</Pill>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Comp stack */}
        <div>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Comp stack · May 2026</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <LineItem label="Base salary"   value={p.base}        positive />
            <LineItem label="Tips pool"     value={p.tips}        positive small="+" />
            {p.bonus > 0 && <LineItem label="Performance bonus" value={p.bonus} positive small="+" />}
            <LineItem label="Hours worked"  value={`${p.hours}h${p.overtime ? ` + ${p.overtime}h OT` : ''}`} raw />
            {p.deduction > 0 && (
              <div style={{
                background: 'var(--bad-soft)', border: '1px solid var(--bad-soft)',
                borderRadius: 8, padding: 12,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--bad)' }}>Deduction</span>
                  <span className="mono tabular" style={{ color: 'var(--bad)', fontWeight: 500 }}>-{thb(p.deduction)}</span>
                </div>
                <button
                  onClick={() => setWhyOpen(o => !o)}
                  style={{
                    marginTop: 6, fontSize: 11, color: 'var(--bad)',
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <Icon name="question" size={12} /> Why this deduction?
                </button>
                {whyOpen && (
                  <div style={{
                    marginTop: 8, padding: 8,
                    background: 'var(--surface)', borderRadius: 6,
                    fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.5,
                    animation: 'opFade 240ms var(--ease)',
                  }}>
                    {p.deductionReason}. Pulled from attendance log entry #4821. Override only with director's sign-off.
                  </div>
                )}
              </div>
            )}
            <div style={{
              marginTop: 4, padding: '12px 0',
              borderTop: '1px solid var(--line)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Total payable</span>
              <span className="mono tabular" style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.01em' }}>
                {thb(p.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Attendance pull */}
        <div>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Attendance pull · last 14 days</div>
          <div style={{
            background: 'var(--bg-2)', borderRadius: 8, padding: 12,
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {Array.from({ length: 14 }).map((_, i) => {
                const r = (Math.sin(p.employeeId.charCodeAt(0) + i * 1.3) * 0.5 + 0.5);
                const tone = i % 7 === 6 ? 'var(--bg-2)'
                  : r > 0.92 ? 'var(--warn)'
                  : r > 0.97 ? 'var(--bad)'
                  : 'var(--good)';
                return (
                  <span key={i} title={`Day ${i + 1}`} style={{
                    width: 18, height: 18, borderRadius: 4, background: tone,
                    border: '1px solid var(--line-2)',
                  }}></span>
                );
              })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}>
              <span><span style={{ color: 'var(--good)', fontWeight: 600 }}>10</span> on time</span>
              <span><span style={{ color: 'var(--warn)', fontWeight: 600 }}>{p.deduction ? 1 : 0}</span> late</span>
              <span><span style={{ color: 'var(--bad)', fontWeight: 600 }}>0</span> absent</span>
              <span><span style={{ color: 'var(--fg-4)', fontWeight: 600 }}>3</span> off-duty</span>
            </div>
          </div>

          <div className="eyebrow" style={{ marginTop: 18, marginBottom: 12 }}>Recent payments</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {['Apr 2026', 'Mar 2026', 'Feb 2026'].map((m, i) => (
              <div key={m} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 12px', background: 'var(--bg-2)', borderRadius: 6,
                fontSize: 12,
              }}>
                <span>{m}</span>
                <span className="mono tabular" style={{ fontWeight: 500 }}>{thb(p.total - i * 200)}</span>
                <Pill tone="good" size="sm" dot>paid</Pill>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, paddingTop: 'var(--s-4)', borderTop: '1px solid var(--line)' }}>
        <Button variant="primary" icon="check">Confirm payment</Button>
        <Button icon="edit">Edit</Button>
        <Button icon="download">Slip PDF</Button>
        <div style={{ flex: 1 }}></div>
        <Button variant="danger" icon="trash">Void draft</Button>
      </div>
    </div>
  );
}

function LineItem({ label, value, positive, raw, small }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
      <span style={{ fontSize: 13, color: 'var(--fg-2)' }}>{label}</span>
      <span className="mono tabular" style={{
        fontSize: 13, fontWeight: 500,
        color: raw ? 'var(--fg-3)' : 'var(--fg)',
      }}>
        {small}{typeof value === 'number' ? thb(value) : value}
      </span>
    </div>
  );
}

window.PaymentsModule = PaymentsModule;
