import SectionShell from './SectionShell';

const LABELS = {
  articles: 'Articles',
  videos: 'Videos',
  multimedia: 'Multimedia',
};

export default function RecommendationsPanel({ session }) {
  if (!session) {
    return (
      <SectionShell
        badge="Expand"
        title="Recommended resources"
        subtitle="The assistant will surface extra articles, videos, and multimedia content to deepen understanding."
      >
        <div className="empty-state">
          Once a session is created, this panel will recommend related material from around the web.
        </div>
      </SectionShell>
    );
  }

  return (
    <SectionShell
      badge="Expand"
      title="Keep learning beyond the source"
      subtitle="Recommended follow-up resources chosen from the generated topic map."
    >
      <div className="resource-columns">
        {Object.entries(session.recommendations).map(([group, items]) => (
          <div key={group} className="stack-card">
            <h3>{LABELS[group]}</h3>
            <div className="resource-list">
              {items.length ? (
                items.map((item) => (
                  <a
                    key={`${group}-${item.url}`}
                    className="resource-card"
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                    <span>{item.kind}</span>
                  </a>
                ))
              ) : (
                <div className="empty-state compact">
                  No suggestions were returned for this category yet. Rebuild the session or try a more specific source.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
