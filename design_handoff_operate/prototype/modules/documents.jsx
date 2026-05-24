/* global React, Icon, Card, Pill, Button, Avatar, Segmented, Stat, PageHeader, SearchInput, DATA, shopName, empName */

const { useState, useMemo } = React;

function DocumentsModule() {
  const D = window.DATA;
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');

  const types = [...new Set(D.DOCUMENTS.map(d => d.type))];
  const filtered = D.DOCUMENTS.filter(d => {
    if (type !== 'all' && d.type !== type) return false;
    if (q && !d.title.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="module-pad">
      <PageHeader
        eyebrow={`${D.DOCUMENTS.length} files · ${types.length} categories`}
        title="Documents"
        subtitle="Leases, permits, SOPs and policies — searchable."
        actions={
          <>
            <Button icon="upload">Upload</Button>
            <Button variant="primary" icon="plus">New folder</Button>
          </>
        }
      />

      <div style={{ display: 'flex', gap: 12, marginBottom: 'var(--s-4)', alignItems: 'center' }}>
        <SearchInput value={q} onChange={setQ} placeholder="Search documents…" style={{ flex: 1, maxWidth: 400 }} />
        <Segmented value={type} onChange={setType} size="sm" options={[
          { value: 'all', label: 'All' },
          ...types.map(t => ({ value: t, label: t })),
        ]} />
      </div>

      <div style={{
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: 'var(--r-lg)', overflow: 'hidden',
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1.6fr 100px 1fr 120px 100px 80px 40px',
          padding: '10px var(--s-4)', background: 'var(--bg-2)',
          borderBottom: '1px solid var(--line)',
          fontSize: 11, color: 'var(--fg-4)', textTransform: 'uppercase',
          letterSpacing: '0.06em', fontWeight: 500, gap: 12,
        }}>
          <div>Title</div><div>Type</div><div>Shop</div><div>Owner</div><div>Updated</div><div style={{ textAlign: 'right' }}>Size</div><div></div>
        </div>
        {filtered.map((d, i) => <DocRow key={d.id} doc={d} last={i === filtered.length - 1} />)}
        {filtered.length === 0 && (
          <div style={{ padding: 'var(--s-7)', textAlign: 'center', color: 'var(--fg-4)', fontSize: 13 }}>
            Nothing matches your filter.
          </div>
        )}
      </div>
    </div>
  );
}

function DocRow({ doc, last }) {
  const [hover, setHover] = useState(false);
  const typeIcon = {
    SOP: 'book', Lease: 'building', Vet: 'paw', Legal: 'shield',
    HR: 'users', Permit: 'tag', Pricing: 'cash',
  }[doc.type] || 'file';

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid', gridTemplateColumns: '1.6fr 100px 1fr 120px 100px 80px 40px',
        padding: '12px var(--s-4)', gap: 12, alignItems: 'center',
        background: hover ? 'var(--row-hover)' : 'transparent',
        borderBottom: last ? 'none' : '1px solid var(--line-2)',
        fontSize: 13, cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon name={typeIcon} size={16} color="var(--bronze)" />
        <span style={{ fontWeight: 500 }}>{doc.title}</span>
      </div>
      <Pill tone="outline" size="sm">{doc.type}</Pill>
      <span style={{ color: 'var(--fg-3)' }}>{doc.shopId ? shopName(doc.shopId) : 'All shops'}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Avatar name={empName(doc.owner)} size={20} />
        <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{empName(doc.owner)}</span>
      </div>
      <span className="mono" style={{ fontSize: 12, color: 'var(--fg-3)' }}>{doc.updated}</span>
      <span className="mono" style={{ fontSize: 12, textAlign: 'right', color: 'var(--fg-3)' }}>{doc.size}</span>
      <button style={{
        width: 28, height: 28, color: hover ? 'var(--fg-2)' : 'transparent',
        borderRadius: 6,
        transition: 'color var(--dur) var(--ease)',
      }}>
        <Icon name="more" size={14} />
      </button>
    </div>
  );
}

window.DocumentsModule = DocumentsModule;
