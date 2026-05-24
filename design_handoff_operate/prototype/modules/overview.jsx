/* global React, Icon, Card, Stat, Pill, Button, Sparkline, MiniBar, Avatar, Section, Tooltip, PageHeader, Segmented, Kbd, todayLong, timeOfDayGreeting, thb, fmtPct, DATA, shopName */

const { useState, useMemo } = React;

function OverviewModule({ go }) {
  const D = window.DATA;
  const topShops = [...D.REVENUE_BY_SHOP].sort((a, b) => b.revenue - a.revenue).slice(0, 4);
  const today = D.ACCT_WEEKS[D.ACCT_WEEKS.length - 1].days[D.ACCT_WEEKS[0].days.length - 1];
  const open = D.SHOPS.length;
  const drafts = D.PAYMENTS.filter(p => p.status === 'draft').length;
  const newReviews = D.REVIEWS.filter(r => !r.replied).length;
  const upcomingDocs = D.DOCUMENTS.slice(0, 3);

  return (
    <div className="module-pad">
      {/* Greeting hero */}
      <div style={{ paddingBottom: 'var(--s-6)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
            <span className="eyebrow">{todayLong()}</span>
            <h1 style={{
              margin: 0, fontSize: 40, fontWeight: 400, color: 'var(--fg)',
              fontFamily: 'var(--font-display)', letterSpacing: '-0.005em', lineHeight: 1.05,
            }}>
              {timeOfDayGreeting()}.
            </h1>
            <p className="script" style={{
              margin: 0, marginTop: 6,
              fontSize: 30, color: 'var(--bronze)', lineHeight: 1,
              fontStyle: 'normal',
            }}>
              Slow morning, sharp eye on Pattaya.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button icon="plus">Log expense</Button>
            <Button variant="primary" icon="zap">Today's check-in</Button>
          </div>
        </div>
      </div>

      {/* Top stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 'var(--s-5)' }}>
        <Stat label="Yesterday's revenue" prefix="฿" value={(today.sales / 1000).toFixed(0) + 'k'} delta="+8%" deltaTone="good"
          spark={<Sparkline data={[42,48,51,46,53,61,58,64,71,68,74,82]} width={68} />}
        />
        <Stat label="Drafts to confirm" value={drafts} delta={`${drafts} pending`} deltaTone="warn" hint="Payments · May 2026" />
        <Stat label="New reviews" value={newReviews} delta="3 ★5 · 1 ★2" deltaTone="neutral" hint="Last 7 days" />
        <Stat label="Cash runway" suffix="mo" value="14" delta="—" deltaTone="neutral" hint="At current burn" />
      </div>

      {/* Two-col layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
        {/* Today across shops */}
        <Card padding="0">
          <div style={{
            padding: '14px var(--s-5)', borderBottom: '1px solid var(--line)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Today across shops</div>
              <div style={{ fontSize: 12, color: 'var(--fg-4)', marginTop: 2 }}>Live snapshot · updates every 5 min</div>
            </div>
            <Button size="sm" variant="ghost" iconRight="chevRight" onClick={() => go('reports')}>Reports</Button>
          </div>
          <div>
            {topShops.map((s, i) => {
              const pct = (s.revenue / topShops[0].revenue) * 100;
              const trend = s.revenue > s.prior;
              return (
                <div key={s.shopId} style={{
                  padding: '12px var(--s-5)',
                  display: 'grid', gridTemplateColumns: '1fr 80px 110px 80px',
                  alignItems: 'center', gap: 16,
                  borderBottom: i < topShops.length - 1 ? '1px solid var(--line-2)' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      width: 28, height: 28, borderRadius: 6, background: 'var(--bg-2)',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--fg-3)',
                    }}>
                      <Icon name="building" size={14} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{shopName(s.shopId)}</div>
                      <div style={{ fontSize: 11, color: 'var(--fg-4)' }}>{Math.round(s.revenue / s.prior * 100)}% of plan</div>
                    </div>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-2)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      width: `${pct}%`, height: '100%',
                      background: trend ? 'var(--good)' : 'var(--warn)',
                    }}></div>
                  </div>
                  <div className="mono" style={{ fontSize: 13, textAlign: 'right' }}>{thb(s.revenue)}</div>
                  <Pill tone={trend ? 'good' : 'warn'} size="sm">
                    <Icon name={trend ? 'arrowUp' : 'arrowDown'} size={10} />
                    {fmtPct(((s.revenue - s.prior) / s.prior) * 100)}
                  </Pill>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Side column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Needs your eye */}
          <Card padding="0">
            <div style={{ padding: '14px var(--s-5)', borderBottom: '1px solid var(--line)' }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Needs your eye</div>
              <div style={{ fontSize: 12, color: 'var(--fg-4)', marginTop: 2 }}>4 items · today</div>
            </div>
            <div style={{ padding: 'var(--s-3)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Todo icon="wallet" tone="warn"
                title={`${drafts} payroll drafts to confirm`}
                hint="Due May 31"
                onClick={() => go('payments')}
              />
              <Todo icon="star" tone="bad"
                title="2★ review · Pattaya"
                hint="James R · 8 hours ago"
                onClick={() => go('reviews')}
              />
              <Todo icon="file" tone="info"
                title="Phuket lease renewal"
                hint="Expires in 28 days"
                onClick={() => go('documents')}
              />
              <Todo icon="paw" tone="bronze"
                title="Daifuku · vet follow-up"
                hint="Watch · Phangan"
                onClick={() => go('animals')}
              />
            </div>
          </Card>

          {/* Quote / context */}
          <Card style={{ background: 'var(--bronze-soft)', borderColor: 'transparent' }} padding="var(--s-5)">
            <div className="eyebrow" style={{ color: 'var(--bronze-2)' }}>This week</div>
            <p className="display" style={{
              margin: '8px 0 0', fontSize: 22, lineHeight: 1.35, color: 'var(--ink)',
              fontStyle: 'italic', fontWeight: 500,
            }}>
              We sell the 30 minutes — not the cup. Watch the average dwell time before the average ticket.
            </p>
          </Card>
        </div>
      </div>

      {/* Bottom row: schedule + recent */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 'var(--s-5)' }}>
        <Card padding="0">
          <div style={{
            padding: '14px var(--s-5)', borderBottom: '1px solid var(--line)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>On shift right now</div>
            <Button size="sm" variant="ghost" iconRight="chevRight" onClick={() => go('scheduling')}>Schedule</Button>
          </div>
          <div style={{ padding: 'var(--s-3) var(--s-5)' }}>
            {D.EMPLOYEES.slice(0, 5).map((e, i) => (
              <div key={e.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 0',
                borderBottom: i < 4 ? '1px solid var(--line-2)' : 'none',
              }}>
                <Avatar name={e.name} size={26} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{e.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-4)' }}>{shopName(e.shopId)} · {e.role}</div>
                </div>
                <span className="mono" style={{ fontSize: 12, color: 'var(--fg-3)' }}>
                  {['08–16', '09–17', '12–20', '14–22', '08–16'][i]}
                </span>
                <Pill tone={i < 3 ? 'good' : 'neutral'} size="sm" dot>{i < 3 ? 'In' : 'Soon'}</Pill>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="0">
          <div style={{
            padding: '14px var(--s-5)', borderBottom: '1px solid var(--line)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Recent activity</div>
            <Button size="sm" variant="ghost">View all</Button>
          </div>
          <div style={{ padding: 'var(--s-3) var(--s-5)' }}>
            {[
              { icon: 'wallet', text: 'Lily L payroll confirmed', hint: '2 hours ago', tone: 'good' },
              { icon: 'star', text: 'New 5★ review — Samui', hint: '4 hours ago', tone: 'good' },
              { icon: 'paw', text: 'Daifuku marked for vet follow-up', hint: 'Yesterday', tone: 'warn' },
              { icon: 'file', text: 'Pattaya facade permit uploaded', hint: 'Yesterday', tone: 'info' },
              { icon: 'users', text: 'Khun Sirin contact updated', hint: '2 days ago', tone: 'neutral' },
            ].map((a, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '8px 0',
                borderBottom: i < 4 ? '1px solid var(--line-2)' : 'none',
              }}>
                <Pill tone={a.tone} size="sm" icon={a.icon}>{null}</Pill>
                <span style={{ flex: 1, fontSize: 13 }}>{a.text}</span>
                <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>{a.hint}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Todo({ icon, tone, title, hint, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 12px', borderRadius: 8,
        background: hover ? 'var(--row-hover)' : 'transparent',
        textAlign: 'left', width: '100%', cursor: 'pointer',
        transition: 'background var(--dur) var(--ease)',
      }}
    >
      <Pill tone={tone} size="sm" icon={icon} style={{ padding: 6 }}>{null}</Pill>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--fg-4)' }}>{hint}</div>
      </div>
      <Icon name="chevRight" size={14} color="var(--fg-4)" />
    </button>
  );
}

window.OverviewModule = OverviewModule;
