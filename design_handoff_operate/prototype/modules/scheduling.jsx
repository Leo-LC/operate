/* global React, Icon, Card, Pill, Button, Avatar, Segmented, PageHeader, DATA, shopName, shopShort */

const { useState } = React;

function SchedulingModule() {
  const D = window.DATA;
  const [view, setView] = useState('week');
  return (
    <div className="module-pad">
      <PageHeader
        eyebrow="Week of 25 May → 31 May"
        title="Scheduling"
        subtitle="Shifts across all shops. Drag to move, click to edit."
        actions={
          <>
            <Segmented value={view} onChange={setView} options={[
              { value: 'week', label: 'Week grid', icon: 'grid' },
              { value: 'list', label: 'List',      icon: 'list' },
            ]} />
            <Button icon="chevLeft" size="md"></Button>
            <Button icon="chevRight" size="md"></Button>
            <Button variant="primary" icon="plus">New shift</Button>
          </>
        }
      />
      {view === 'week' ? <WeekGrid /> : <ShiftList />}
    </div>
  );
}

function WeekGrid() {
  const { days, schedule } = window.DATA.SCHEDULE_WEEK;
  const employees = window.DATA.EMPLOYEES;
  const grid = `200px repeat(${days.length}, 1fr)`;
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--line)',
      borderRadius: 'var(--r-lg)', overflow: 'hidden',
    }}>
      {/* header */}
      <div style={{
        display: 'grid', gridTemplateColumns: grid,
        background: 'var(--bg-2)', borderBottom: '1px solid var(--line)',
        padding: '12px var(--s-4)', fontSize: 11,
        textTransform: 'uppercase', letterSpacing: '0.06em',
        color: 'var(--fg-4)', fontWeight: 500,
      }}>
        <div>Employee</div>
        {days.map(d => <div key={d} style={{ textAlign: 'center' }}>{d}</div>)}
      </div>
      {employees.map((e, ei) => (
        <div key={e.id} style={{
          display: 'grid', gridTemplateColumns: grid,
          padding: '14px var(--s-4)', alignItems: 'center', gap: 4,
          borderBottom: ei < employees.length - 1 ? '1px solid var(--line-2)' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar name={e.name} size={28} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{e.name}</div>
              <div style={{ fontSize: 11, color: 'var(--fg-4)' }}>{shopShort(e.shopId)} · {e.role}</div>
            </div>
          </div>
          {schedule[e.id].map((s, di) => <ShiftCell key={di} shift={s} shopId={e.shopId} />)}
        </div>
      ))}
    </div>
  );
}

function ShiftCell({ shift, shopId }) {
  const [hover, setHover] = useState(false);
  if (!shift) {
    return <div style={{ height: 44, color: 'var(--fg-mute)', fontSize: 11, textAlign: 'center', alignSelf: 'stretch', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>—</div>;
  }
  const tone = shift.shift === 'open' ? { bg: 'var(--good-soft)', fg: 'var(--good)' }
                                       : { bg: 'var(--info-soft)', fg: 'var(--info)' };
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: tone.bg, color: tone.fg,
        padding: '6px 8px', borderRadius: 6, cursor: 'grab',
        fontSize: 11, fontWeight: 500,
        display: 'flex', flexDirection: 'column', gap: 2,
        border: hover ? `1px dashed ${tone.fg}` : '1px solid transparent',
        transition: 'border-color var(--dur) var(--ease)',
        margin: '0 2px',
      }}
    >
      <span className="mono tabular">{shift.start}–{shift.end}</span>
      <span style={{ opacity: 0.8, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {shift.shift === 'open' ? 'Open' : 'Close'} · {shopShort(shopId)}
      </span>
    </div>
  );
}

function ShiftList() {
  const D = window.DATA;
  const { days, schedule } = D.SCHEDULE_WEEK;
  const rows = [];
  D.EMPLOYEES.forEach(e => {
    schedule[e.id].forEach((s, di) => {
      if (s) rows.push({ emp: e, day: days[di], shift: s });
    });
  });
  return (
    <Card padding="0">
      <div style={{
        display: 'grid', gridTemplateColumns: '120px 1.5fr 1fr 100px 100px 80px',
        padding: '10px var(--s-4)', background: 'var(--bg-2)',
        borderBottom: '1px solid var(--line)',
        fontSize: 11, color: 'var(--fg-4)', textTransform: 'uppercase',
        letterSpacing: '0.06em', fontWeight: 500, gap: 12,
      }}>
        <div>Day</div><div>Employee</div><div>Shop</div><div>Start</div><div>End</div><div>Type</div>
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: '120px 1.5fr 1fr 100px 100px 80px',
          padding: '10px var(--s-4)', gap: 12, alignItems: 'center',
          borderBottom: i < rows.length - 1 ? '1px solid var(--line-2)' : 'none',
          fontSize: 13,
        }}>
          <span style={{ fontWeight: 500 }}>{r.day}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar name={r.emp.name} size={22} />
            <span>{r.emp.name}</span>
          </div>
          <span style={{ color: 'var(--fg-3)' }}>{shopName(r.emp.shopId)}</span>
          <span className="mono tabular">{r.shift.start}</span>
          <span className="mono tabular">{r.shift.end}</span>
          <Pill tone={r.shift.shift === 'open' ? 'good' : 'info'} size="sm" dot>{r.shift.shift}</Pill>
        </div>
      ))}
    </Card>
  );
}

window.SchedulingModule = SchedulingModule;
