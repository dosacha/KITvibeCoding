export default function SectionCard({ title, subtitle, children, actions }) {
  return (
    <section className="section-card">
      <div className="section-header">
        <div>
          <h3>{title}</h3>
          {subtitle ? <p className="muted small">{subtitle}</p> : null}
        </div>
        {actions ? <div className="section-actions">{actions}</div> : null}
      </div>
      <div>{children}</div>
    </section>
  );
}
