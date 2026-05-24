/* global React, Icon, Card, Pill, Button, Avatar, Stat, PageHeader, SearchInput, Field, Input, Textarea, DATA, shopName */

const { useState } = React;

function ContactsModule() {
  const D = window.DATA;
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const filtered = D.CONTACTS.filter(c =>
    !q ||
    c.name.toLowerCase().includes(q.toLowerCase()) ||
    c.role.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="module-pad">
      <PageHeader
        eyebrow={`${D.CONTACTS.length} contacts`}
        title="Contacts"
        subtitle="Landlords, suppliers, vets and partners across the network."
        actions={
          <Button variant="primary" icon="plus" onClick={() => setAdding(true)}>Add contact</Button>
        }
      />

      <div style={{ marginBottom: 'var(--s-4)' }}>
        <SearchInput value={q} onChange={setQ} placeholder="Search by name or role…" style={{ maxWidth: 400 }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: adding ? '1fr 360px' : '1fr', gap: 16 }}>
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--line)',
          borderRadius: 'var(--r-lg)', overflow: 'hidden',
        }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1.5fr 1.2fr 1.4fr 1.4fr 90px',
            padding: '10px var(--s-4)', background: 'var(--bg-2)',
            borderBottom: '1px solid var(--line)',
            fontSize: 11, color: 'var(--fg-4)', textTransform: 'uppercase',
            letterSpacing: '0.06em', fontWeight: 500, gap: 12,
          }}>
            <div>Name</div><div>Role</div><div>Phone</div><div>Email</div><div>Shop</div>
          </div>
          {filtered.map((c, i) => (
            <ContactRow key={c.id} c={c} last={i === filtered.length - 1} />
          ))}
        </div>

        {adding && <AddContactPanel onClose={() => setAdding(false)} />}
      </div>
    </div>
  );
}

function ContactRow({ c, last }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid', gridTemplateColumns: '1.5fr 1.2fr 1.4fr 1.4fr 90px',
        padding: '12px var(--s-4)', gap: 12, alignItems: 'center',
        background: hover ? 'var(--row-hover)' : 'transparent',
        borderBottom: last ? 'none' : '1px solid var(--line-2)',
        fontSize: 13, cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar name={c.name} size={28} />
        <span style={{ fontWeight: 500 }}>{c.name}</span>
      </div>
      <span style={{ color: 'var(--fg-2)' }}>{c.role}</span>
      <span className="mono" style={{ fontSize: 12, color: 'var(--fg-3)' }}>{c.phone}</span>
      <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{c.email}</span>
      <Pill tone={c.shopId ? 'bronze' : 'outline'} size="sm">
        {c.shopId ? shopName(c.shopId) : 'All shops'}
      </Pill>
    </div>
  );
}

function AddContactPanel({ onClose }) {
  const [form, setForm] = useState({ name: '', role: '', phone: '', email: '', shop: '', notes: '' });
  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <Card padding="0" style={{ alignSelf: 'flex-start', position: 'sticky', top: 80 }}>
      <div style={{
        padding: '14px var(--s-5)', borderBottom: '1px solid var(--line)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>New contact</div>
        <button onClick={onClose} style={{ color: 'var(--fg-3)' }}>
          <Icon name="close" size={16} />
        </button>
      </div>
      <div style={{ padding: 'var(--s-5)', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Name" required><Input value={form.name} onChange={set('name')} placeholder="Khun…" /></Field>
        <Field label="Role" required><Input value={form.role} onChange={set('role')} placeholder="Landlord · Supplier · Vet…" /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Phone"><Input value={form.phone} onChange={set('phone')} placeholder="+66" icon="phone" /></Field>
          <Field label="Email"><Input value={form.email} onChange={set('email')} placeholder="name@example.com" icon="mail" /></Field>
        </div>
        <Field label="Tied to shop" hint="Optional — leave blank for all-shops">
          <Input value={form.shop} onChange={set('shop')} placeholder="Bangkok Ekkamai…" icon="building" />
        </Field>
        <Field label="Notes">
          <Textarea value={form.notes} onChange={set('notes')} rows={3} placeholder="Anything Léo should remember when calling…" />
        </Field>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <Button variant="primary" icon="check" disabled={!form.name || !form.role}>Save contact</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Card>
  );
}

window.ContactsModule = ContactsModule;
