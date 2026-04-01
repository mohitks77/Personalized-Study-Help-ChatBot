import { useState } from 'react';
import SectionShell from './SectionShell';

export default function QuizPanel({ session, onSubmitAnswer }) {
  const [drafts, setDrafts] = useState({});
  const [activeQuestionId, setActiveQuestionId] = useState('');
  const [localError, setLocalError] = useState('');

  async function handleSubmit(questionId) {
    const answer = drafts[questionId]?.trim();

    if (!answer) {
      setLocalError('Write an answer before submitting.');
      return;
    }

    setLocalError('');
    setActiveQuestionId(questionId);

    try {
      await onSubmitAnswer(questionId, answer);
    } catch (error) {
      setLocalError(error.message);
    } finally {
      setActiveQuestionId('');
    }
  }

  if (!session) {
    return (
      <SectionShell
        badge="Quiz"
        title="Check understanding"
        subtitle="A Q&A-based quiz will appear here after the study session is generated."
      >
        <div className="empty-state">
          The quiz panel will validate answers, mark them correct or incorrect, and explain why.
        </div>
      </SectionShell>
    );
  }

  return (
    <SectionShell
      badge="Quiz"
      title="Interactive comprehension quiz"
      subtitle="Answer each prompt in your own words and review the detailed feedback."
    >
      <div className="quiz-list">
        {session.quiz.questions.map((question) => {
          const evaluation = session.quiz.attempts[question.id];

          return (
            <article key={question.id} className="question-card">
              <div className="question-header">
                <div>
                  <span className="question-tag">{question.difficulty}</span>
                  <h3>{question.question}</h3>
                </div>
                {evaluation ? (
                  <span className={`result-pill ${evaluation.correct ? 'success' : 'danger'}`}>
                    {evaluation.correct ? 'Correct' : 'Incorrect'}
                  </span>
                ) : null}
              </div>

              <textarea
                rows="4"
                placeholder="Write your answer here"
                value={drafts[question.id] || ''}
                onChange={(event) =>
                  setDrafts((current) => ({
                    ...current,
                    [question.id]: event.target.value,
                  }))
                }
              />

              <div className="question-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => handleSubmit(question.id)}
                  disabled={activeQuestionId === question.id}
                >
                  {activeQuestionId === question.id ? 'Checking...' : 'Evaluate answer'}
                </button>
                {evaluation ? <span className="score-chip">Score: {evaluation.score}/100</span> : null}
              </div>

              {evaluation ? (
                <div className="feedback-card">
                  <p>{evaluation.explanation}</p>
                  <strong>Expected answer:</strong>
                  <p>{evaluation.expectedAnswer}</p>
                  <span>{evaluation.encouragement}</span>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {localError ? <div className="error-banner subtle">{localError}</div> : null}
    </SectionShell>
  );
}
