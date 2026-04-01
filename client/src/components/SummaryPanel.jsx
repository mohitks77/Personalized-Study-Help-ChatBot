import SectionShell from './SectionShell';

export default function SummaryPanel({ session }) {
  if (!session) {
    return (
      <SectionShell
        badge="Summary"
        title="Structured learning brief"
        subtitle="Your synthesized notes, goals, topics, and study plan will appear here."
      >
        <div className="empty-state">
          Start with a source link to generate a concise summary and a guided learning path.
        </div>
      </SectionShell>
    );
  }

  const { summary, source, ingestion } = session;

  return (
    <SectionShell
      badge="Summary"
      title={summary.title}
      subtitle={`Built from a ${source.type} source with ${ingestion.extractedCharacters.toLocaleString()} extracted characters.`}
    >
      <div className="summary-overview">
        <p>{summary.overview}</p>
      </div>

      <div className="summary-grid">
        <div className="stack-card">
          <h3>Core topics</h3>
          {summary.coreTopics.map((topic) => (
            <article key={topic.name} className="topic-card">
              <strong>{topic.name}</strong>
              <p>{topic.summary}</p>
              <span>{topic.whyItMatters}</span>
            </article>
          ))}
        </div>

        <div className="stack-card">
          <h3>Learning objectives</h3>
          <ul className="plain-list">
            {summary.learningObjectives.map((objective, index) => (
              <li key={`${objective}-${index}`}>{objective}</li>
            ))}
          </ul>
        </div>

        <div className="stack-card">
          <h3>Key takeaways</h3>
          <ul className="plain-list">
            {summary.keyTakeaways.map((takeaway, index) => (
              <li key={`${takeaway}-${index}`}>{takeaway}</li>
            ))}
          </ul>
        </div>

        <div className="stack-card">
          <h3>Study plan</h3>
          <ul className="plain-list">
            {summary.studyPlan.map((item, index) => (
              <li key={`${item.step}-${index}`}>
                <strong>{item.step}</strong>
                <span>{item.purpose}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SectionShell>
  );
}
