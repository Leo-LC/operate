/* global React, Icon, Card, Stat, Pill, Button, Tabs, Sparkline, PageHeader, thb, fmtPct, DATA, shopName */

const { useState, useMemo } = React;

function ReportsModule() {
  const [tab, setTab] = useState('operations');
  return (
    <div className="module-pad">
      <PageHeader
        eyebrow="Last 12 months"
        title="Reports"
        subtitle="Operations health and cash forecast."
        actions={
          <>
            <Button icon="filter">May 2025 → May 2026</Button>
            <Button icon="download">Export PDF</Button>
          </>
        }
      />

      <div style={{ marginBottom: 'var(--s-5)' }}>
        <Tabs value={tab} onChange={setTab} options={[
          { value: 'operations', label: 'Operations' },
          { value: 'treasury',   label: 'Treasury' },
        ]} />
      </div>

      {tab === 'operations' ? <OperationsTab /> : <TreasuryTab />}
    </div>
  );
}

/* -------------------- Operations -------------------- */
function OperationsTab() {
  const D = window.DATA;
  const K = D.REPORT_KPIS;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}>
      {/* KPI hero cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <KpiCard label="Revenue (12mo)" value={`฿${(K.revenue.value / 1e6).toFixed(2)}M`} delta={K.revenue.delta} spark={K.revenue.spark} tone="var(--bronze)" />
        <KpiCard label="Sessions" value={K.sessions.value.toLocaleString()} delta={K.sessions.delta} spark={K.sessions.spark} tone="var(--good)" />
        <KpiCard label="Avg rating" value={K.avgRating.value.toFixed(1)} suffix="/ 5" delta={K.avgRating.delta} spark={K.avgRating.spark} tone="var(--info)" />
        <KpiCard label="Drink uplift" value={`${K.uplift.value.toFixed(1)}%`} delta={K.uplift.delta} spark={K.uplift.spark} tone="var(--warn)" downBad />
      </div>

      {/* Revenue by shop + mix */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
        <Card padding="0">
          <div style={{
            padding: '14px var(--s-5)', borderBottom: '1px solid var(--line)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Revenue by shop</div>
              <div style={{ fontSize: 12, color: 'var(--fg-4)', marginTop: 2 }}>vs. prior year, same period</div>
            </div>
            <Pill tone="good" dot>8 shops</Pill>
          </div>
          <div style={{ padding: 'var(--s-5)' }}>
            <BarChart data={D.REVENUE_BY_SHOP} />
          </div>
        </Card>

        <Card padding="0">
          <div style={{
            padding: '14px var(--s-5)', borderBottom: '1px solid var(--line)',
          }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Revenue mix</div>
            <div style={{ fontSize: 12, color: 'var(--fg-4)', marginTop: 2 }}>The 30 mins drives 62% — the cup follows.</div>
          </div>
          <div style={{ padding: 'var(--s-5)', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
            <Donut data={D.REVENUE_MIX} />
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {D.REVENUE_MIX.map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }}></span>
                  <span style={{ flex: 1, color: 'var(--fg-2)' }}>{s.label}</span>
                  <span className="mono tabular" style={{ fontWeight: 500 }}>{s.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom row — leaderboard + rating */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card padding="0">
          <div style={{ padding: '14px var(--s-5)', borderBottom: '1px solid var(--line)' }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Top performers · this month</div>
          </div>
          <div style={{ padding: 'var(--s-3) var(--s-5)' }}>
            {[...D.REVENUE_BY_SHOP].sort((a,b) => b.revenue - a.revenue).slice(0, 5).map((s, i) => (
              <div key={s.shopId} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 0', borderBottom: i < 4 ? '1px solid var(--line-2)' : 'none',
              }}>
                <span style={{
                  width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: i === 0 ? 'var(--bronze)' : 'var(--bg-2)',
                  color: i === 0 ? '#fff8ee' : 'var(--fg-3)',
                  borderRadius: 6, fontSize: 12, fontWeight: 600,
                }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{shopName(s.shopId)}</span>
                <span className="mono tabular" style={{ fontSize: 13, fontWeight: 500 }}>{thb(s.revenue)}</span>
                <Pill tone={s.revenue > s.prior ? 'good' : 'bad'} size="sm">
                  {fmtPct((s.revenue - s.prior) / s.prior * 100)}
                </Pill>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="0">
          <div style={{ padding: '14px var(--s-5)', borderBottom: '1px solid var(--line)' }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Customer signal</div>
            <div style={{ fontSize: 12, color: 'var(--fg-4)', marginTop: 2 }}>Rolling 30-day reviews</div>
          </div>
          <div style={{ padding: 'var(--s-5)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span className="mono tabular" style={{ fontSize: 40, fontWeight: 500, letterSpacing: '-0.02em' }}>4.7</span>
              <span style={{ color: 'var(--fg-3)' }}>/ 5</span>
              <Pill tone="good" size="sm">+0.1</Pill>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 16 }}>
              {[
                { stars: 5, count: 184, pct: 76 },
                { stars: 4, count: 31,  pct: 13 },
                { stars: 3, count: 12,  pct: 5  },
                { stars: 2, count: 8,   pct: 3  },
                { stars: 1, count: 6,   pct: 3  },
              ].map(r => (
                <div key={r.stars} style={{ display: 'grid', gridTemplateColumns: '20px 1fr 36px', gap: 8, alignItems: 'center', fontSize: 12 }}>
                  <span style={{ color: 'var(--fg-3)' }}>{r.stars}★</span>
                  <div style={{ height: 6, background: 'var(--bg-2)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${r.pct}%`, height: '100%', background: r.stars >= 4 ? 'var(--good)' : r.stars >= 3 ? 'var(--warn)' : 'var(--bad)' }}></div>
                  </div>
                  <span className="mono tabular" style={{ color: 'var(--fg-3)', textAlign: 'right' }}>{r.count}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ label, value, suffix, delta, spark, tone, downBad }) {
  const positive = delta > 0;
  const deltaTone = downBad ? (positive ? 'bad' : 'good') : (positive ? 'good' : 'bad');
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--line)',
      borderRadius: 'var(--r-lg)', padding: 'var(--s-5)',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div className="eyebrow">{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span className="mono tabular" style={{ fontSize: 30, fontWeight: 500, letterSpacing: '-0.01em' }}>
          {value}{suffix && <span style={{ fontSize: 16, color: 'var(--fg-3)', marginLeft: 2 }}>{suffix}</span>}
        </span>
        <Pill tone={deltaTone} size="sm">
          <Icon name={positive ? 'arrowUp' : 'arrowDown'} size={10} />
          {fmtPct(Math.abs(delta))}
        </Pill>
      </div>
      <div style={{ marginTop: 4 }}>
        <Sparkline data={spark} width={220} height={32} color={tone} filled />
      </div>
    </div>
  );
}

function BarChart({ data }) {
  const max = Math.max(...data.map(d => Math.max(d.revenue, d.prior)));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map(d => (
        <div key={d.shopId} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 90px 60px', alignItems: 'center', gap: 10, fontSize: 12 }}>
          <span style={{ color: 'var(--fg-2)' }}>{d.name}</span>
          <div style={{ position: 'relative', height: 18 }}>
            <div style={{
              position: 'absolute', left: 0, top: 4, height: 10,
              width: `${d.prior / max * 100}%`, background: 'var(--bg-2)',
              borderRadius: 2,
            }}></div>
            <div style={{
              position: 'absolute', left: 0, top: 4, height: 10,
              width: `${d.revenue / max * 100}%`, background: 'var(--bronze)',
              borderRadius: 2,
            }}></div>
          </div>
          <span className="mono tabular" style={{ textAlign: 'right', fontWeight: 500 }}>{thb(d.revenue)}</span>
          <Pill tone={d.revenue > d.prior ? 'good' : 'bad'} size="sm">
            {fmtPct((d.revenue - d.prior) / d.prior * 100)}
          </Pill>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: 'var(--fg-4)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 8, background: 'var(--bronze)', borderRadius: 2 }}></span> This year
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 8, background: 'var(--bg-2)', borderRadius: 2 }}></span> Last year
        </span>
      </div>
    </div>
  );
}

function Donut({ data }) {
  const total = data.reduce((a, d) => a + d.value, 0);
  let cumAngle = -Math.PI / 2;
  const r = 70, R = 100, cx = 110, cy = 110;
  return (
    <svg width={220} height={220} viewBox="0 0 220 220">
      {data.map((d, i) => {
        const a1 = cumAngle;
        const a2 = cumAngle + (d.value / total) * Math.PI * 2;
        cumAngle = a2;
        const large = (a2 - a1) > Math.PI ? 1 : 0;
        const p = (a, rr) => [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
        const [x1, y1] = p(a1, R);
        const [x2, y2] = p(a2, R);
        const [x3, y3] = p(a2, r);
        const [x4, y4] = p(a1, r);
        return (
          <path
            key={i}
            d={`M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${r} ${r} 0 ${large} 0 ${x4} ${y4} Z`}
            fill={d.color}
          ></path>
        );
      })}
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize="13" fill="var(--fg-3)">Mix</text>
      <text x={cx} y={cy + 16} textAnchor="middle" fontSize="16" fontWeight="500" fill="var(--fg)" fontFamily="var(--font-mono)">100%</text>
    </svg>
  );
}

/* -------------------- Treasury -------------------- */
function TreasuryTab() {
  const D = window.DATA;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}>
      <Card padding="0">
        <div style={{ padding: '14px var(--s-5)', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>12-month projected cash</div>
            <div style={{ fontSize: 12, color: 'var(--fg-4)', marginTop: 2 }}>Operating account · linear forecast · ฿800k = danger</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Pill tone="bronze">Base case</Pill>
            <Pill tone="outline">Stress test</Pill>
          </div>
        </div>
        <div style={{ padding: 'var(--s-5)' }}>
          <CashCurve data={D.TREASURY} danger={800000} />
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card padding="0">
          <div style={{ padding: '14px var(--s-5)', borderBottom: '1px solid var(--line)' }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>What's eating the lean months</div>
            <div style={{ fontSize: 12, color: 'var(--fg-4)', marginTop: 2 }}>Sep — Nov · monsoon dip</div>
          </div>
          <div style={{ padding: 'var(--s-5)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <EatingItem icon="building" tone="bad"    title="Rent across coastal shops" value={460000} share={42} />
            <EatingItem icon="users"    tone="warn"   title="Fixed payroll"             value={310000} share={28} />
            <EatingItem icon="paw"      tone="info"   title="Animal care + vet"          value={140000} share={13} />
            <EatingItem icon="zap"      tone="neutral" title="Utilities"                 value={ 90000} share={ 8} />
            <EatingItem icon="bag"      tone="bronze" title="Other operating"           value={100000} share={ 9} />
          </div>
        </Card>

        <Card padding="0">
          <div style={{ padding: '14px var(--s-5)', borderBottom: '1px solid var(--line)' }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Recommended actions</div>
            <div style={{ fontSize: 12, color: 'var(--fg-4)', marginTop: 2 }}>To stay above ฿800k floor</div>
          </div>
          <div style={{ padding: 'var(--s-3) var(--s-5)' }}>
            {[
              { tone: 'good',   title: 'Pre-sell monsoon packages',  hint: 'Estimated +฿180k Sep–Oct revenue', impact: '+฿180k' },
              { tone: 'warn',   title: 'Renegotiate Pattaya lease',  hint: 'Current term ends Oct 2026',       impact: '-฿45k/mo' },
              { tone: 'info',   title: 'Shift vet schedule to dry mo.', hint: 'Move 2 of 4 vet visits to Aug', impact: '-฿70k Sep' },
              { tone: 'bronze', title: 'Move reserve to fixed-deposit', hint: '฿1.2M idle for 6 months',      impact: '+฿28k yield' },
            ].map((a, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '12px 0', borderBottom: i < 3 ? '1px solid var(--line-2)' : 'none',
              }}>
                <Pill tone={a.tone} size="sm" icon="check" style={{ padding: 6, marginTop: 2 }}>{null}</Pill>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--fg-4)' }}>{a.hint}</div>
                </div>
                <span className="mono tabular" style={{
                  fontSize: 12, fontWeight: 500,
                  color: a.impact.startsWith('+') ? 'var(--good)' : 'var(--bad)',
                }}>
                  {a.impact}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function CashCurve({ data, danger }) {
  const W = 880, H = 240, P = 36;
  const max = Math.max(...data.map(d => d.cash)) * 1.05;
  const min = Math.min(...data.map(d => d.cash), danger) * 0.95;
  const stepX = (W - P * 2) / (data.length - 1);
  const y = v => H - P - (v - min) / (max - min) * (H - P * 2);
  const x = i => P + i * stepX;
  const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.cash)}`).join(' ');
  const area = `${path} L ${x(data.length - 1)} ${H - P} L ${P} ${H - P} Z`;
  const dangerY = y(danger);

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* gridlines */}
        {[0.25, 0.5, 0.75].map(t => (
          <line key={t} x1={P} x2={W - P}
                y1={P + t * (H - P * 2)} y2={P + t * (H - P * 2)}
                stroke="var(--line)" strokeDasharray="2 4"></line>
        ))}
        {/* danger band */}
        <rect x={P} y={dangerY} width={W - P * 2} height={H - P - dangerY}
              fill="var(--bad)" opacity="0.06"></rect>
        <line x1={P} x2={W - P} y1={dangerY} y2={dangerY}
              stroke="var(--bad)" strokeWidth="1.5" strokeDasharray="6 3"></line>
        <text x={W - P - 4} y={dangerY - 4} textAnchor="end" fontSize="10" fill="var(--bad)">
          danger ฿800k
        </text>
        {/* area + line */}
        <path d={area} fill="var(--bronze)" opacity="0.1"></path>
        <path d={path} fill="none" stroke="var(--bronze)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
        {/* points */}
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(d.cash)} r={d.danger ? 4 : 3}
                    fill={d.danger ? 'var(--bad)' : 'var(--surface)'}
                    stroke={d.danger ? 'var(--bad)' : 'var(--bronze)'}
                    strokeWidth="2"></circle>
            <text x={x(i)} y={H - 12} textAnchor="middle" fontSize="10" fill="var(--fg-3)">{d.month}</text>
          </g>
        ))}
        {/* danger callout */}
        {data.map((d, i) => d.danger && (
          <text key={i + 'd'} x={x(i)} y={y(d.cash) - 10} textAnchor="middle" fontSize="10" fill="var(--bad)" fontWeight="500">
            {thb(d.cash, { compact: true })}
          </text>
        ))}
      </svg>
    </div>
  );
}

function EatingItem({ icon, tone, title, value, share }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <Pill tone={tone} size="sm" icon={icon} style={{ padding: 6 }}>{null}</Pill>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{title}</div>
        <div style={{ height: 4, background: 'var(--bg-2)', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
          <div style={{ width: `${share}%`, height: '100%', background: 'var(--bronze)' }}></div>
        </div>
      </div>
      <span className="mono tabular" style={{ fontSize: 13, fontWeight: 500 }}>{thb(value)}</span>
    </div>
  );
}

window.ReportsModule = ReportsModule;
