/* global React, Icon, Card, Pill, Button, Avatar, Segmented, Stat, PageHeader, DATA, shopName */

const { useState } = React;

function AnimalsModule() {
  const D = window.DATA;
  const [view, setView] = useState('grid');
  const [filter, setFilter] = useState('all');

  const species = [...new Set(D.ANIMALS.map(a => a.species))];
  const filtered = filter === 'all' ? D.ANIMALS : D.ANIMALS.filter(a => a.species === filter);

  const watching = D.ANIMALS.filter(a => a.status === 'watch').length;

  return (
    <div className="module-pad">
      <PageHeader
        eyebrow={`${D.ANIMALS.length} animals · ${species.length} species`}
        title="Animals"
        subtitle="Health, location and care log for every animal in the family."
        actions={
          <>
            <Segmented value={view} onChange={setView} options={[
              { value: 'grid', label: 'Grid', icon: 'grid' },
              { value: 'list', label: 'List', icon: 'list' },
            ]} />
            <Button variant="primary" icon="plus">Add animal</Button>
          </>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 'var(--s-5)' }}>
        <Stat label="In our care" value={D.ANIMALS.length} hint={`${species.length} species`} />
        <Stat label="Vet visits · last 30d" value="6" delta="all routine" deltaTone="good" />
        <Stat label="On watch" value={watching} delta={watching > 0 ? 'follow-up due' : 'all clear'} deltaTone={watching > 0 ? 'warn' : 'good'} />
        <Stat label="Avg. dwell w/ guests" suffix="min" value="28" hint="target: 30" />
      </div>

      <div style={{ marginBottom: 'var(--s-3)' }}>
        <Segmented value={filter} onChange={setFilter} size="sm" options={[
          { value: 'all', label: `All · ${D.ANIMALS.length}` },
          ...species.map(s => ({ value: s, label: `${s} · ${D.ANIMALS.filter(a => a.species === s).length}` })),
        ]} />
      </div>

      {view === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {filtered.map(a => <AnimalCard key={a.id} a={a} />)}
        </div>
      ) : (
        <AnimalList animals={filtered} />
      )}
    </div>
  );
}

function AnimalCard({ a }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: 'var(--r-lg)', overflow: 'hidden', cursor: 'pointer',
        transition: 'border-color var(--dur) var(--ease), transform var(--dur) var(--ease)',
        borderColor: hover ? 'var(--line-strong)' : 'var(--line)',
      }}
    >
      {/* Photo placeholder — espresso block per brand */}
      <div style={{
        background: 'var(--ink)', height: 120,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        padding: 12,
      }}>
        <div style={{
          fontSize: 10, color: 'var(--bronze)', letterSpacing: '0.08em',
          textTransform: 'uppercase', fontWeight: 500,
        }}>Photo</div>
        <Icon name="paw" size={20} color="rgba(212, 169, 115, 0.4)" />
      </div>
      <div style={{ padding: 'var(--s-4)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 500, fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>{a.name}</div>
            <div style={{ fontSize: 11, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>
              {a.species} · {a.age}
            </div>
          </div>
          <Pill tone={a.status === 'good' ? 'good' : 'warn'} size="sm" dot>{a.status}</Pill>
        </div>
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line-2)', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--fg-3)' }}>
          <span>{shopName(a.shopId)}</span>
          <span>vet · {a.lastVet}</span>
        </div>
      </div>
    </div>
  );
}

function AnimalList({ animals }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--line)',
      borderRadius: 'var(--r-lg)', overflow: 'hidden',
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '180px 1fr 1fr 100px 120px 90px',
        padding: '10px var(--s-4)', background: 'var(--bg-2)',
        borderBottom: '1px solid var(--line)',
        fontSize: 11, color: 'var(--fg-4)', textTransform: 'uppercase',
        letterSpacing: '0.06em', fontWeight: 500, gap: 12,
      }}>
        <div>Name</div><div>Species</div><div>Location</div><div>Age</div><div>Last vet</div><div>Status</div>
      </div>
      {animals.map((a, i) => (
        <div key={a.id} style={{
          display: 'grid', gridTemplateColumns: '180px 1fr 1fr 100px 120px 90px',
          padding: '12px var(--s-4)', gap: 12, alignItems: 'center', fontSize: 13,
          borderBottom: i < animals.length - 1 ? '1px solid var(--line-2)' : 'none',
        }}>
          <span className="display" style={{ fontWeight: 500 }}>{a.name}</span>
          <span style={{ color: 'var(--fg-2)' }}>{a.species}</span>
          <span style={{ color: 'var(--fg-3)' }}>{shopName(a.shopId)}</span>
          <span className="mono" style={{ fontSize: 12 }}>{a.age}</span>
          <span className="mono" style={{ fontSize: 12, color: 'var(--fg-3)' }}>{a.lastVet}</span>
          <Pill tone={a.status === 'good' ? 'good' : 'warn'} size="sm" dot>{a.status}</Pill>
        </div>
      ))}
    </div>
  );
}

window.AnimalsModule = AnimalsModule;
