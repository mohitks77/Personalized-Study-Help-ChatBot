import { useState } from 'react';
import SectionShell from './SectionShell';

export default function ChatPanel({ session, onSubmit, loading }) {
  const [question, setQuestion] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();

    if (!question.trim()) {
      return;
    }

    const currentQuestion = question.trim();
    setQuestion('');
    await onSubmit(currentQuestion);
  }

  if (!session) {
    return (
      <SectionShell
        badge="Chat"
        title="Ask follow-up questions"
        subtitle="Use the study chatbot to clear doubts, request examples, or revisit difficult concepts."
      >
        <div className="empty-state">
          The chatbot will become available after the first study session is created.
        </div>
      </SectionShell>
    );
  }

  return (
    <SectionShell
      badge="Chat"
      title="Study conversation"
      subtitle="Ask for simpler explanations, examples, comparisons, or a deeper walk-through."
    >
      <div className="chat-log">
        {session.chatHistory.length ? (
          session.chatHistory.map((message, index) => (
            <article
              key={`${message.role}-${index}`}
              className={`chat-bubble ${message.role === 'assistant' ? 'assistant' : 'user'}`}
            >
              <span>{message.role === 'assistant' ? 'Tutor' : 'You'}</span>
              <p>{message.message}</p>
            </article>
          ))
        ) : (
          <div className="empty-state compact">
            Ask a question like “Explain the second topic in simpler words” or “Give me a real-world example.”
          </div>
        )}
      </div>

      <form className="chat-form" onSubmit={handleSubmit}>
        <textarea
          rows="3"
          placeholder="Ask a follow-up question about this study material"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
        />
        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? 'Thinking...' : 'Ask chatbot'}
        </button>
      </form>
    </SectionShell>
  );
}
