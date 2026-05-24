/* global React, Icon, Card, Pill, Button, Avatar, Toggle, Segmented, Field, Input, PageHeader, Tabs, DATA, shopName */

const { useState } = React;

function AdminModule() {
  const [tab, setTab] = useState('general');
  return (
    <div className="module-pad">
      <PageHeader
        eyebrow="Settings"
        title="Admin"
        subtitle="Workspace, members, integrations and audit log."
      />

      <div style={{ marginBottom: 'var(--s-5)' }}>
        <Tabs value={tab} onChange={setTab} options={[
          { value: 'general',      label: 'General' },
          { value: 'members',      label: 'Members', count: window.DATA.EMPLOYEES.length + 1 },
          { value: 'integrations', label: 'Integrations' },
          { value: 'audit',        label: 'Audit log' },
        ]} />
      </div>

      {tab === 'general'      && <GeneralTab />}
      {tab === 'members'      && <MembersTab />}
      {tab === 'integrations' && <IntegrationsTab />}
      {tab === 'audit'        && <AuditTab />}
    </div>
  );
}

function GeneralTab() {
  const [form, setForm] = useState({
    org: 'Capybara Coffee Thailand',
    currency: 'THB · ฿',
    week: 'Monday',
    notify: true,
    weekly: true,
    digest: false,
  });
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 720px)', gap: 'var(--s-5)' }}>
      <Card padding="var(--s-5)">
        <div className="eyebrow" style={{ marginBottom: 'var(--s-4)' }}>Workspace</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Organisation name"><Input value={form.org} onChange={v => setForm(f => ({ ...f, org: v }))} /></Field>
          <Field label="Default currency"><Input value={form.currency} onChange={v => setForm(f => ({ ...f, currency: v }))} /></Field>
          <Field label="Week starts on"><Input value={form.week} onChange={v => setForm(f => ({ ...f, week: v }))} /></Field>
          <Field label="Timezone"><Input value="Asia / Bangkok (UTC+7)" /></Field>
        </div>
      </Card>

      <Card padding="var(--s-5)">
        <div className="eyebrow" style={{ marginBottom: 'var(--s-4)' }}>Notifications</div>
        <ToggleRow
          title="Daily summary in app"
          hint="Drafts to confirm, new reviews, anything on watch."
          checked={form.notify}
          onChange={v => setForm(f => ({ ...f, notify: v }))}
        />
        <ToggleRow
          title="Weekly email digest"
          hint="Every Monday morning · Léo only."
          checked={form.weekly}
          onChange={v => setForm(f => ({ ...f, weekly: v }))}
        />
        <ToggleRow
          title="Slack: low-rating reviews"
          hint="Send any ≤3★ review to the management channel."
          checked={form.digest}
          onChange={v => setForm(f => ({ ...f, digest: v }))}
        />
      </Card>

      <Card padding="var(--s-5)">
        <div className="eyebrow" style={{ marginBottom: 'var(--s-4)' }}>Data</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon="download">Export all data (CSV)</Button>
          <Button icon="archive">Archive workspace</Button>
          <Button variant="danger" icon="trash">Delete workspace</Button>
        </div>
      </Card>
    </div>
  );
}

function ToggleRow({ title, hint, checked, onChange }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 0', borderBottom: '1px solid var(--line-2)',
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--fg-4)' }}>{hint}</div>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function MembersTab() {
  const D = window.DATA;
  const members = [
    { id: 'leo', name: 'Léo Lecée', role: 'Director', shopId: null, level: 'Owner' },
    ...D.EMPLOYEES.map(e => ({ ...e, level: e.role === 'Manager' ? 'Manager' : 'Member' })),
  ];
  return (
    <Card padding="0">
      <div style={{
        padding: '12px var(--s-5)', borderBottom: '1px solid var(--line)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{members.length} members</div>
        <Button variant="primary" icon="plus" size="md">Invite member</Button>
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: '1.5fr 1.2fr 1fr 100px 40px',
        padding: '10px var(--s-4)', background: 'var(--bg-2)',
        borderBottom: '1px solid var(--line)',
        fontSize: 11, color: 'var(--fg-4)', textTransform: 'uppercase',
        letterSpacing: '0.06em', fontWeight: 500, gap: 12,
      }}>
        <div>Name</div><div>Role</div><div>Shop</div><div>Access</div><div></div>
      </div>
      {members.map((m, i) => (
        <div key={m.id} style={{
          display: 'grid', gridTemplateColumns: '1.5fr 1.2fr 1fr 100px 40px',
          padding: '12px var(--s-4)', gap: 12, alignItems: 'center', fontSize: 13,
          borderBottom: i < members.length - 1 ? '1px solid var(--line-2)' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar name={m.name} size={28} />
            <div>
              <div style={{ fontWeight: 500 }}>{m.name}</div>
              <div style={{ fontSize: 11, color: 'var(--fg-4)' }}>{m.name.toLowerCase().replace(' ', '.')}@capybara.th</div>
            </div>
          </div>
          <span style={{ color: 'var(--fg-2)' }}>{m.role}</span>
          <span style={{ color: 'var(--fg-3)' }}>{m.shopId ? shopName(m.shopId) : 'All shops'}</span>
          <Pill tone={m.level === 'Owner' ? 'bronze' : m.level === 'Manager' ? 'info' : 'outline'} size="sm">
            {m.level}
          </Pill>
          <button style={{ color: 'var(--fg-3)', width: 28, height: 28 }}>
            <Icon name="more" size={14} />
          </button>
        </div>
      ))}
    </Card>
  );
}

function IntegrationsTab() {
  const integrations = [
    { name: 'Google Reviews',  status: 'connected',  hint: 'Synced 12 minutes ago', icon: 'star' },
    { name: 'PromptPay QR',    status: 'connected',  hint: 'Auto-reconciled daily', icon: 'wallet' },
    { name: 'Slack',           status: 'connected',  hint: 'Channel: #operate',    icon: 'send' },
    { name: 'Stripe POS',      status: 'connected',  hint: '4 terminals live',     icon: 'cash' },
    { name: 'Xero accounting', status: 'connect',    hint: 'Export ledger nightly', icon: 'ledger' },
    { name: 'TripAdvisor',     status: 'connect',    hint: 'Pull reviews + ratings', icon: 'star' },
    { name: 'Google Drive',    status: 'connected',  hint: 'Documents mirror',     icon: 'file' },
    { name: 'Email digest',    status: 'connected',  hint: 'Monday 06:00 · Léo',   icon: 'mail' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
      {integrations.map(it => (
        <Card key={it.name} padding="var(--s-4)">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 8,
              background: 'var(--bg-2)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              color: 'var(--bronze)',
            }}>
              <Icon name={it.icon} size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{it.name}</div>
              <div style={{ fontSize: 11, color: 'var(--fg-4)' }}>{it.hint}</div>
            </div>
            {it.status === 'connected'
              ? <Pill tone="good" size="sm" dot>Connected</Pill>
              : <Button size="sm">Connect</Button>}
          </div>
        </Card>
      ))}
    </div>
  );
}

function AuditTab() {
  const entries = [
    { who: 'Léo Lecée',   what: 'confirmed 3 payment drafts',          when: '14 min ago',  tone: 'good' },
    { who: 'Jordan J',    what: 'replied to a 5★ review (Silom)',      when: '1 hour ago',  tone: 'good' },
    { who: 'Nong Nong',   what: 'updated Daifuku to "watch"',          when: '3 hours ago', tone: 'warn' },
    { who: 'Léo Lecée',   what: 'invited a new member (pending)',      when: 'Yesterday',   tone: 'info' },
    { who: 'Léo Lecée',   what: 'edited the brand voice doc',           when: '2 days ago',  tone: 'neutral' },
    { who: 'Tina Lim',    what: 'reconciled Pattaya cash drawer',      when: '3 days ago',  tone: 'good' },
    { who: 'Samurai S',   what: 'uploaded Phuket maintenance receipt',  when: '5 days ago',  tone: 'neutral' },
  ];
  return (
    <Card padding="0">
      <div style={{
        padding: '12px var(--s-5)', borderBottom: '1px solid var(--line)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>Recent activity</div>
        <Button size="sm" icon="download">Export</Button>
      </div>
      {entries.map((e, i) => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: '120px 1fr 100px',
          padding: '12px var(--s-5)', gap: 14, alignItems: 'center',
          borderBottom: i < entries.length - 1 ? '1px solid var(--line-2)' : 'none',
          fontSize: 13,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar name={e.who} size={22} />
            <span style={{ fontWeight: 500, fontSize: 12 }}>{e.who.split(' ')[0]}</span>
          </div>
          <span style={{ color: 'var(--fg-2)' }}>{e.what}</span>
          <span style={{ fontSize: 11, color: 'var(--fg-4)', textAlign: 'right' }}>{e.when}</span>
        </div>
      ))}
    </Card>
  );
}

window.AdminModule = AdminModule;
