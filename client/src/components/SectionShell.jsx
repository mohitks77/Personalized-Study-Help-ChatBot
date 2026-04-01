export default function SectionShell({ badge, title, subtitle, action, children, className = '' }) {
  return (
    <section className={`panel ${className}`.trim()}>
      <div className="panel-header">
        <div>
          {badge ? <span className="panel-badge">{badge}</span> : null}
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
