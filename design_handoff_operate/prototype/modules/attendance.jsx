/* global React, Icon, Card, Pill, Button, Avatar, Segmented, Stat, PageHeader, DATA, shopName, empName, emp */

const { useState } = React;

function AttendanceModule() {
  const D = window.DATA;
  const [hovered, setHovered] = useState(null); // {emp, dayIdx, status}

  const counts = D.ATTENDANCE.reduce((acc, row) => {
    row.days.forEach(d => { acc[d] = (acc[d] || 0) + 1; });
    return acc;
  }, {});

  const statusColor = {
    present: 'var(--good)',
    late:    'var(--warn)',
    absent:  'var(--bad)',
    off:     'var(--bg-2)',
  };

  return (
    <div className="module-pad">
      <PageHeader
        eyebrow="Last 30 days"
        title="Attendance"
        subtitle="Daily presence heatmap. Click a cell to see the punch detail."
        actions={
          <>
            <Button icon="filter">All shops</Button>
            <Button icon="download">Export</Button>
          </>
        }
      />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 'var(--s-5)' }}>
        <Stat label="Present" value={counts.present || 0} hint="across 7 people" />
        <Stat label="Late check-ins" value={counts.late || 0} delta="-2 vs prior month" deltaTone="good" />
        <Stat label="Absences" value={counts.absent || 0} delta="0 unplanned" deltaTone="good" />
        <Stat label="Off-duty" value={counts.off || 0} hint="weekends + leave" />
      </div>

      <Card padding="0">
        <div style={{
          padding: '14px var(--s-5)', borderBottom: '1px solid var(--line)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Daily check-ins</div>
            <div style={{ fontSize: 12, color: 'var(--fg-4)', marginTop: 2 }}>Apr 25 → May 24</div>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
            {Object.entries(statusColor).map(([k, v]) => (
              <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--fg-3)' }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: v, border: '1px solid var(--line-2)' }}></span>
                {k}
              </span>
            ))}
          </div>
        </div>

        <div style={{ padding: 'var(--s-5)', overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '160px repeat(30, 1fr)', gap: 4, minWidth: 720 }}>
            <div></div>
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} style={{ textAlign: 'center', fontSize: 10, color: 'var(--fg-4)' }}>
                {(i + 1) % 7 === 1 ? `M${i + 1}` : ''}
              </div>
            ))}
            {D.ATTENDANCE.map(row => {
              const e = emp(row.employeeId);
              return (
                <React.Fragment key={row.employeeId}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                    <Avatar name={e.name} size={24} />
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{e.name}</span>
                  </div>
                  {row.days.map((d, di) => (
                    <button
                      key={di}
                      onMouseEnter={() => setHovered({ emp: e, dayIdx: di, status: d })}
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        height: 28, borderRadius: 4,
                        background: statusColor[d],
                        border: hovered && hovered.emp.id === e.id && hovered.dayIdx === di
                          ? '2px solid var(--bronze)' : '1px solid var(--line-2)',
                        cursor: 'pointer',
                        transition: 'transform var(--dur) var(--ease)',
                      }}
                    ></button>
                  ))}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </Card>

      {hovered && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24,
          background: 'var(--surface)', border: '1px solid var(--line-strong)',
          borderRadius: 'var(--r-lg)', padding: 'var(--s-4)',
          boxShadow: 'var(--shadow-2)', minWidth: 220,
          animation: 'opFade 240ms var(--ease)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Avatar name={hovered.emp.name} size={32} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{hovered.emp.name}</div>
              <div style={{ fontSize: 11, color: 'var(--fg-4)' }}>{shopName(hovered.emp.shopId)}</div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 8 }}>
            <span style={{ color: 'var(--fg-3)' }}>Day {hovered.dayIdx + 1}</span>
            <Pill tone={
              hovered.status === 'present' ? 'good' :
              hovered.status === 'late' ? 'warn' :
              hovered.status === 'absent' ? 'bad' : 'neutral'
            } size="sm" dot>{hovered.status}</Pill>
          </div>
          {hovered.status === 'late' && (
            <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 6 }}>
              Punched in at <span className="mono">09:22</span> · expected <span className="mono">09:00</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

window.AttendanceModule = AttendanceModule;
