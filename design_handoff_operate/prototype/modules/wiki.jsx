/* global React, Icon, Card, Pill, Button, Avatar, PageHeader, SearchInput, DATA */

const { useState, useMemo } = React;

function WikiModule() {
  const D = window.DATA;
  const [q, setQ] = useState('');
  const [active, setActive] = useState(D.WIKI[0].id);

  const sections = useMemo(() => {
    const out = {};
    D.WIKI.forEach(p => {
      if (q && !p.title.toLowerCase().includes(q.toLowerCase()) && !p.excerpt.toLowerCase().includes(q.toLowerCase())) return;
      if (!out[p.section]) out[p.section] = [];
      out[p.section].push(p);
    });
    return out;
  }, [q, D]);

  const page = D.WIKI.find(p => p.id === active) || D.WIKI[0];

  return (
    <div className="module-pad">
      <PageHeader
        eyebrow={`${D.WIKI.length} pages`}
        title="Wiki"
        subtitle="Internal handbook — how we work, day to day."
        actions={
          <>
            <Button icon="search">Search</Button>
            <Button variant="primary" icon="plus">New page</Button>
          </>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, height: 'calc(100vh - 240px)' }}>
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--line)',
          borderRadius: 'var(--r-lg)', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: 'var(--s-3)', borderBottom: '1px solid var(--line)' }}>
            <SearchInput value={q} onChange={setQ} placeholder="Search pages…" size="sm" />
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--s-2)' }}>
            {Object.entries(sections).map(([section, pages]) => (
              <div key={section} style={{ marginBottom: 12 }}>
                <div className="eyebrow" style={{ padding: '8px 10px 4px' }}>{section}</div>
                {pages.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setActive(p.id)}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '8px 10px', borderRadius: 6,
                      background: active === p.id ? 'var(--row-active)' : 'transparent',
                      color: active === p.id ? 'var(--fg)' : 'var(--fg-2)',
                      fontSize: 13, cursor: 'pointer',
                      fontWeight: active === p.id ? 500 : 400,
                    }}
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        <WikiArticle page={page} />
      </div>
    </div>
  );
}

function WikiArticle({ page }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--line)',
      borderRadius: 'var(--r-lg)', padding: 'var(--s-7) var(--s-7) var(--s-6)',
      overflowY: 'auto',
    }}>
      <div className="eyebrow">{page.section}</div>
      <h1 style={{
        margin: '12px 0 4px', fontSize: 34, fontWeight: 500,
        fontFamily: 'var(--font-display)', letterSpacing: '-0.005em',
      }}>{page.title}</h1>
      <div style={{ fontSize: 12, color: 'var(--fg-4)' }}>
        Updated {page.updated} by {page.author} · <span style={{ color: 'var(--bronze)' }}>Edit</span>
      </div>
      <div style={{ height: 2, width: 56, background: 'var(--bronze)', margin: '20px 0 28px' }}></div>

      <div style={{ maxWidth: 680, fontSize: 15, lineHeight: 1.7, color: 'var(--fg-2)' }}>
        <p style={{ margin: '0 0 18px' }}>{page.excerpt}</p>
        <p style={{ margin: '0 0 18px' }}>
          The full procedure is broken into discrete, single-action steps. Each step is something one person, on shift,
          can do in under three minutes — no judgment calls, no “depending on the situation”.
        </p>
        <h3 style={{ fontSize: 18, fontWeight: 500, margin: '28px 0 12px', color: 'var(--fg)' }}>Before you start</h3>
        <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--fg-2)' }}>
          <li style={{ marginBottom: 8 }}>Open the shop's daily log entry — every step gets a timestamp.</li>
          <li style={{ marginBottom: 8 }}>Confirm the manager on duty is reachable for the next 30 minutes.</li>
          <li style={{ marginBottom: 8 }}>Have the printed checklist within arm's reach — paper, not phone.</li>
        </ul>

        <h3 style={{ fontSize: 18, fontWeight: 500, margin: '28px 0 12px', color: 'var(--fg)' }}>The procedure</h3>
        <ol style={{ margin: 0, paddingLeft: 20, color: 'var(--fg-2)' }}>
          <li style={{ marginBottom: 10 }}>Walk the perimeter once, slowly. Note anything out of place in the log.</li>
          <li style={{ marginBottom: 10 }}>Check the temperature in each animal enclosure against the chart. Tolerance is ±2°C.</li>
          <li style={{ marginBottom: 10 }}>Confirm water bowls are fresh — not refilled, replaced.</li>
          <li style={{ marginBottom: 10 }}>Unlock the front door no earlier than 09:55 — never before.</li>
        </ol>

        <div style={{
          marginTop: 32, padding: 'var(--s-5)',
          background: 'var(--surface-2)', border: '1px solid var(--line)',
          borderRadius: 'var(--r-lg)',
        }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>One line to remember</div>
          <p className="display" style={{
            margin: 0, fontSize: 22, lineHeight: 1.4, color: 'var(--ink)',
            fontStyle: 'italic',
          }}>
            We sell the 30 minutes — not the cup. Open like that's the only product.
          </p>
        </div>
      </div>
    </div>
  );
}

window.WikiModule = WikiModule;
