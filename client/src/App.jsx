import { startTransition, useEffect, useState } from "react";
import ChatPanel from "./components/ChatPanel";
import IntakeForm from "./components/IntakeForm";
import QuizPanel from "./components/QuizPanel";
import RecommendationsPanel from "./components/RecommendationsPanel";
import SectionShell from "./components/SectionShell";
import SummaryPanel from "./components/SummaryPanel";
import {
  askStudyQuestion,
  createStudySession,
  createStudySessionFromUpload,
  evaluateQuizAnswer,
  fetchHealth,
} from "./lib/api";

const INITIAL_FORM = {
  inputMode: "url",
  sourceType: "pdf",
  sourceUrl: "",
  sourceFile: null,
};

export default function App() {
  const [health, setHealth] = useState({ mode: "checking" });
  const [form, setForm] = useState(INITIAL_FORM);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch(() => {
        setHealth({ mode: "unavailable" });
      });
  }, []);

  const metrics = session
    ? [
        {
          label: "Topics mapped",
          value: String(session.summary.coreTopics.length),
        },
        {
          label: "Quiz questions",
          value: String(session.quiz.questions.length),
        },
        {
          label: "Recommended links",
          value: String(
            session.recommendations.articles.length +
              session.recommendations.videos.length +
              session.recommendations.multimedia.length,
          ),
        },
      ]
    : [
        { label: "Source coverage", value: "PDF, video, audio, image, zip" },
        { label: "Outputs", value: "Summary, quiz, recommendations, chat" },
        { label: "Mode", value: health.mode },
      ];

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const createdSession =
        form.inputMode === "upload"
          ? await createStudySessionFromUpload({
              sourceType: form.sourceType,
              file: form.sourceFile,
            })
          : await createStudySession({
              sourceType: form.sourceType,
              sourceUrl: form.sourceUrl,
            });
      startTransition(() => {
        setSession(createdSession);
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleQuizAnswer(questionId, answer) {
    if (!session) {
      return;
    }

    const result = await evaluateQuizAnswer(session.id, { questionId, answer });

    setSession((current) => ({
      ...current,
      quiz: {
        ...current.quiz,
        attempts: {
          ...current.quiz.attempts,
          [questionId]: {
            answer,
            ...result,
          },
        },
      },
    }));
  }

  async function handleChatSubmit(question) {
    if (!session) {
      return;
    }

    setChatLoading(true);

    try {
      const reply = await askStudyQuestion(session.id, { question });
      setSession((current) => ({
        ...current,
        chatHistory: [
          ...current.chatHistory,
          { role: "user", message: question },
          { role: "assistant", message: reply.answer },
        ],
      }));
    } finally {
      setChatLoading(false);
    }
  }

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "inputMode" && value === "url" ? { sourceFile: null } : {}),
      ...(field === "inputMode" && value === "upload" ? { sourceUrl: "" } : {}),
    }));
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <main className="page">
        <section className="hero">
          <div className="hero-copy">
            <span className="hero-kicker">Personalized Study Help ChatBot</span>
            <h1>Turn any learning link into a personal revision workspace.</h1>
            <p>
              Bring in a source URL, let the backend extract the useful
              knowledge, and get a structured summary, topic map, quiz flow,
              related resources, and follow-up Q&A in one place.
            </p>

            <div className="metric-row">
              {metrics.map((metric) => (
                <div key={metric.label} className="metric-card">
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <SectionShell
            badge="Ingest"
            title="Create a study session"
            subtitle="Paste a source link or upload a local file, then choose the content type you want the assistant to process."
            className="hero-panel"
            action={
              <span className={`mode-pill mode-${health.mode}`}>
                {health.mode}
              </span>
            }
          >
            <IntakeForm
              form={form}
              onChange={updateForm}
              onSubmit={handleSubmit}
              loading={loading}
            />
            {error ? <div className="error-banner">{error}</div> : null}
          </SectionShell>
        </section>

        <section className="workspace-grid">
          <SummaryPanel session={session} />
          <RecommendationsPanel session={session} />
        </section>

        <section className="workspace-grid lower-grid">
          <QuizPanel session={session} onSubmitAnswer={handleQuizAnswer} />
          <ChatPanel
            session={session}
            onSubmit={handleChatSubmit}
            loading={chatLoading}
          />
        </section>
      </main>
    </div>
  );
}
