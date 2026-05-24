/* global React, Icon, Card, Pill, Button, PageHeader */

function BrandModule() {
  return (
    <div className="module-pad">
      <PageHeader
        eyebrow="Brand assets · v2 · May 2026"
        title="Brand"
        subtitle="Logo, palette, type and voice — the system every shop draws from."
        actions={
          <>
            <Button icon="external">Open guidelines</Button>
            <Button variant="primary" icon="download">Download kit</Button>
          </>
        }
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}>
        {/* Mark */}
        <Card padding="0">
          <div style={{ padding: '14px var(--s-5)', borderBottom: '1px solid var(--line)' }}>
            <div className="eyebrow">01 — Mark</div>
            <div style={{ fontSize: 14, fontWeight: 500, marginTop: 4 }}>The capybara-in-cup badge</div>
          </div>
          <div style={{
            padding: 'var(--s-6)', display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr', gap: 12,
          }}>
            <MarkSwatch label="On cream" bg="#F7F2E9" fg="#2F2823" />
            <MarkSwatch label="On espresso" bg="#2F2823" fg="#F7F2E9" />
            <MarkSwatch label="On amber" bg="#B9854E" fg="#F7F2E9" />
          </div>
        </Card>

        {/* Colors */}
        <Card padding="0">
          <div style={{ padding: '14px var(--s-5)', borderBottom: '1px solid var(--line)' }}>
            <div className="eyebrow">02 — Colour system</div>
            <div style={{ fontSize: 14, fontWeight: 500, marginTop: 4 }}>Four colours · fixed · no tints, no gradients</div>
          </div>
          <div style={{
            padding: 'var(--s-5)', display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
          }}>
            <Swatch name="Cream"    hex="#F7F2E9" role="background · 60%"          fg="#2F2823" />
            <Swatch name="Espresso" hex="#2F2823" role="text + dark sections · 25%" fg="#F7F2E9" />
            <Swatch name="Amber"    hex="#B9854E" role="headings · accents · 12%"  fg="#F7F2E9" />
            <Swatch name="Sage"     hex="#7C9A4D" role="accent only · 3%"          fg="#F7F2E9" />
          </div>
        </Card>

        {/* Type */}
        <Card padding="0">
          <div style={{ padding: '14px var(--s-5)', borderBottom: '1px solid var(--line)' }}>
            <div className="eyebrow">03 — Typography</div>
            <div style={{ fontSize: 14, fontWeight: 500, marginTop: 4 }}>Three faces · three roles</div>
          </div>
          <div style={{
            padding: 'var(--s-5)', display: 'flex',
            flexDirection: 'column', gap: 'var(--s-4)',
          }}>
            <TypeRow family="Cabinet Grotesk" weight="800 · uppercase" role="Display · Hero · Logo">
              <span style={{
                fontFamily: '"Cabinet Grotesk", system-ui', fontSize: 44,
                fontWeight: 800, letterSpacing: '-0.02em', textTransform: 'uppercase',
                lineHeight: 1, color: 'var(--fg)',
              }}>
                Where happiness begins
              </span>
            </TypeRow>
            <TypeRow family="Next Southerland Serif" weight="500 · mixed case" role="Section title (H2)">
              <span style={{
                fontFamily: 'var(--font-display)', fontSize: 38,
                fontWeight: 500, lineHeight: 1.1, color: 'var(--fg)',
              }}>
                A slow afternoon, by design.
              </span>
            </TypeRow>
            <TypeRow family="Next Southerland Script" weight="400 · single line" role="Script accent">
              <span className="script" style={{ fontSize: 38, color: 'var(--bronze)', lineHeight: 1 }}>
                Where happiness begins
              </span>
            </TypeRow>
            <TypeRow family="Satoshi" weight="300 · 400 · 700" role="Body · UI · captions">
              <span style={{ fontSize: 17, lineHeight: 1.6, color: 'var(--fg-2)', maxWidth: 600 }}>
                Come and spend 30 minutes with our capybaras. Feed them, sit beside them, and let the day slow down.
                Our animals are cared for daily by trained staff — their wellbeing comes first, always.
              </span>
            </TypeRow>
          </div>
        </Card>

        {/* Voice */}
        <Card padding="0">
          <div style={{ padding: '14px var(--s-5)', borderBottom: '1px solid var(--line)' }}>
            <div className="eyebrow">04 — Voice</div>
            <div style={{ fontSize: 14, fontWeight: 500, marginTop: 4 }}>Four rules · enforced in copy reviews</div>
          </div>
          <div style={{
            padding: 'var(--s-5)', display: 'grid',
            gridTemplateColumns: '1fr 1fr', gap: 16,
          }}>
            {[
              { t: 'Specific, not vague',     d: '“30 minutes with our capybaras” — not “an unforgettable experience”.' },
              { t: 'Warm, not gushing',       d: 'One honest sentence beats three excited ones.' },
              { t: 'Knowledgeable, not academic', d: 'Plain interesting sentences — not Wikipedia prose.' },
              { t: 'Inviting, not pushy',     d: 'No countdown timers. No “limited spots”. We invite, we don\'t chase.' },
            ].map(v => (
              <div key={v.t} style={{
                padding: 'var(--s-4)', background: 'var(--surface-2)',
                border: '1px solid var(--line)', borderRadius: 'var(--r-md)',
              }}>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{v.t}</div>
                <div style={{ fontSize: 13, color: 'var(--fg-3)' }}>{v.d}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function MarkSwatch({ label, bg, fg }) {
  return (
    <div style={{
      background: bg, color: fg,
      borderRadius: 'var(--r-md)', height: 160,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 12, border: '1px solid var(--line)',
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 999,
        border: `2px solid ${fg}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-display)', fontStyle: 'italic',
        fontWeight: 500, fontSize: 26, color: fg,
      }}>C</div>
      <span style={{
        fontSize: 10, letterSpacing: '0.1em',
        textTransform: 'uppercase', opacity: 0.7,
      }}>{label}</span>
    </div>
  );
}

function Swatch({ name, hex, role, fg }) {
  return (
    <div style={{ borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1px solid var(--line)' }}>
      <div style={{
        background: hex, color: fg, padding: 'var(--s-4)',
        height: 110, display: 'flex', alignItems: 'flex-end',
      }}>
        <span className="mono" style={{ fontSize: 11, opacity: 0.85 }}>{hex}</span>
      </div>
      <div style={{ padding: '10px 12px', background: 'var(--surface)' }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{name}</div>
        <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 2 }}>{role}</div>
      </div>
    </div>
  );
}

function TypeRow({ family, weight, role, children }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '200px 1fr',
      gap: 'var(--s-4)', padding: 'var(--s-3) 0',
      borderBottom: '1px solid var(--line-2)',
      alignItems: 'center',
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{family}</div>
        <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 2 }}>{weight}</div>
        <div style={{ fontSize: 11, color: 'var(--bronze)', marginTop: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{role}</div>
      </div>
      <div>{children}</div>
    </div>
  );
}

window.BrandModule = BrandModule;
