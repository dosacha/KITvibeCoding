export default function SectionCard({ title, subtitle, children, actions, compact = false }) {
  return (
    <section className={`section-card${compact ? ' section-card--compact' : ''}`}>
      <div className="section-header">
        <div>
          <h3>{title}</h3>
          {subtitle ? <p className="muted small section-subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div className="section-actions">{actions}</div> : null}
      </div>
      <div>{children}</div>
    </section>
  );
}
