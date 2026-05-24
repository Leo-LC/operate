/* global React, Icon, Card, Pill, Button, Avatar, Segmented, Stat, PageHeader, Tabs, Textarea, DATA, shopName */

const { useState } = React;

function ReviewsModule() {
  const D = window.DATA;
  const [filter, setFilter] = useState('all');
  const [active, setActive] = useState(D.REVIEWS[0].id);

  const filtered = D.REVIEWS.filter(r =>
    filter === 'all' ? true :
    filter === 'unreplied' ? !r.replied :
    filter === 'low' ? r.stars <= 3 : true
  );

  const r = D.REVIEWS.find(x => x.id === active) || D.REVIEWS[0];

  return (
    <div className="module-pad">
      <PageHeader
        eyebrow={`${D.REVIEWS.length} reviews · last 30 days`}
        title="Reviews"
        subtitle="Google, TripAdvisor and direct feedback across all shops."
        actions={
          <>
            <Button icon="refresh">Sync</Button>
            <Button icon="external">Open Google</Button>
          </>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 'var(--s-5)' }}>
        <Stat label="Avg rating" suffix="/ 5" value="4.7" delta="+0.1" deltaTone="good" />
        <Stat label="5★" value={D.REVIEWS.filter(r => r.stars === 5).length} hint="this period" />
        <Stat label="≤3★" value={D.REVIEWS.filter(r => r.stars <= 3).length} delta="needs reply" deltaTone="warn" />
        <Stat label="Unanswered" value={D.REVIEWS.filter(r => !r.replied).length} hint="across all shops" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 16, height: 'calc(100vh - 360px)' }}>
        <Card padding="0" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px var(--s-4)', borderBottom: '1px solid var(--line)' }}>
            <Segmented value={filter} onChange={setFilter} size="sm" options={[
              { value: 'all',       label: `All · ${D.REVIEWS.length}` },
              { value: 'unreplied', label: 'Unreplied' },
              { value: 'low',       label: '≤3★' },
            ]} />
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.map(rv => (
              <ReviewListItem key={rv.id} r={rv} active={rv.id === active} onClick={() => setActive(rv.id)} />
            ))}
          </div>
        </Card>

        <ReviewDetail r={r} />
      </div>
    </div>
  );
}

function Stars({ n, size = 14 }) {
  return (
    <span style={{ display: 'inline-flex', gap: 1 }}>
      {[1,2,3,4,5].map(i => (
        <Icon key={i} name="star" size={size}
              color={i <= n ? 'var(--bronze)' : 'var(--ink-5)'}
              stroke={i <= n ? 1.5 : 1}
              style={{ fill: i <= n ? 'var(--bronze)' : 'none' }} />
      ))}
    </span>
  );
}

function ReviewListItem({ r, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', gap: 6,
        padding: '12px var(--s-4)',
        background: active ? 'var(--row-active)' : 'transparent',
        borderBottom: '1px solid var(--line-2)',
        borderLeft: `2px solid ${active ? 'var(--bronze)' : 'transparent'}`,
        cursor: 'pointer', textAlign: 'left', width: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Stars n={r.stars} size={13} />
        <span style={{ flex: 1, fontSize: 12, color: 'var(--fg-3)' }}>{r.author}</span>
        {!r.replied && <Pill tone="warn" size="sm" dot>new</Pill>}
      </div>
      <div style={{ fontSize: 12, color: 'var(--fg-2)', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}>
        {r.text}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--fg-4)' }}>
        <span>{shopName(r.shopId)}</span>
        <span>{r.source} · {r.date}</span>
      </div>
    </button>
  );
}

function ReviewDetail({ r }) {
  const [reply, setReply] = useState('');
  const [drafting, setDrafting] = useState(false);
  return (
    <Card padding="0" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: 'var(--s-5)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar name={r.author} size={40} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 500 }}>{r.author}</div>
            <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>{r.source} · {r.date} · {shopName(r.shopId)}</div>
          </div>
          <Stars n={r.stars} size={18} />
        </div>
        <p className="display" style={{
          marginTop: 16, fontSize: 22, lineHeight: 1.45, color: 'var(--fg)',
          fontStyle: 'italic', fontWeight: 500,
        }}>
          “{r.text}”
        </p>
      </div>

      <div style={{ padding: 'var(--s-5)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="eyebrow">Your reply</div>
        {r.replied ? (
          <div style={{
            padding: 'var(--s-4)', background: 'var(--good-soft)',
            borderRadius: 8, fontSize: 13, color: 'var(--fg)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontWeight: 500 }}>Léo replied · {r.date}</span>
              <Pill tone="good" size="sm" dot>posted</Pill>
            </div>
            Thank you for spending time with us — moments like these are exactly why we built Capybara Coffee. Come back any time.
          </div>
        ) : (
          <>
            <Textarea
              value={reply}
              onChange={setReply}
              rows={5}
              placeholder="Reply with the brand voice — warm, specific, never gushing…"
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="primary" icon="send" disabled={!reply}>Post reply</Button>
              <Button icon="sparkle" onClick={() => setDrafting(true)}>Draft for me</Button>
              <div style={{ flex: 1 }}></div>
              <Button variant="ghost" icon="flag">Flag</Button>
            </div>
            {drafting && (
              <div style={{
                padding: 12, background: 'var(--bronze-soft)', borderRadius: 8,
                fontSize: 12, color: 'var(--ink)', animation: 'opFade 240ms var(--ease)',
              }}>
                <div className="eyebrow" style={{ color: 'var(--bronze-2)', marginBottom: 6 }}>Suggested draft</div>
                Thank you, {r.author.split(' ')[0]} — we're glad the {r.stars >= 4 ? 'visit landed well' : 'time still felt worthwhile'}.
                {r.stars <= 3 ? ' We hear you on the points raised and the team has noted it.' : ''} Come back when you can.
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

window.ReviewsModule = ReviewsModule;
