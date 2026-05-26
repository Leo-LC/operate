export default function BrandPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-5)" }}>
      <div style={{
        border: "1px solid var(--line)",
        borderRadius: "var(--r-lg)",
        overflow: "hidden",
        background: "var(--surface)",
        height: "calc(100vh - var(--topbar-h) - var(--s-5) - var(--s-7))",
      }}>
        <iframe
          src="/brand-guidelines"
          style={{ width: "100%", height: "100%", border: "none" }}
          title="Brand Guidelines"
        />
      </div>
    </div>
  );
}
