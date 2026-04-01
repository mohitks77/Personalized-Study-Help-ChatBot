import crypto from 'node:crypto';
import { answerFollowUpQuestion, evaluateQuizAnswer, generateStudyPack } from './aiService.js';
import { ingestContentFromUrl, ingestUploadedFile } from './content/ingestService.js';
import { discoverLearningResources } from './resourceDiscoveryService.js';
import { studySessionStore } from './studySessionStore.js';

export async function createStudySession({ sourceType, sourceUrl }) {
  const ingestedContent = await ingestContentFromUrl({ sourceType, sourceUrl });
  return buildStudySession({ sourceType, sourceUrl, ingestedContent });
}

export async function createStudySessionFromUpload({ sourceType, file }) {
  const ingestedContent = await ingestUploadedFile({ sourceType, file });
  return buildStudySession({
    sourceType,
    sourceUrl: file.originalname,
    ingestedContent,
  });
}

async function buildStudySession({ sourceType, sourceUrl, ingestedContent }) {
  const studyPack = await generateStudyPack(ingestedContent);
  const resources = await discoverLearningResources(studyPack.summary);

  const session = studySessionStore.create({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    source: {
      type: sourceType,
      url: sourceUrl,
      title: ingestedContent.title,
      metadata: ingestedContent.metadata,
    },
    ingestion: {
      preview: ingestedContent.contentPreview,
      extractedCharacters: ingestedContent.extractedText.length,
      mode: studyPack.mode,
    },
    summary: studyPack.summary,
    quiz: {
      questions: studyPack.quiz.questions,
      attempts: {},
    },
    recommendations: resources,
    chatHistory: [],
    contentContext: {
      title: ingestedContent.title,
      sourceType,
      extractedText: ingestedContent.extractedText,
      metadata: ingestedContent.metadata,
      imageDataUrl: ingestedContent.imageDataUrl || null,
    },
  });

  return sanitizeSession(session);
}

export function getStudySession(sessionId) {
  const session = studySessionStore.get(sessionId);

  if (!session) {
    const error = new Error('Study session not found.');
    error.status = 404;
    throw error;
  }

  return sanitizeSession(session);
}

export async function evaluateQuizResponse({ sessionId, questionId, answer }) {
  const session = studySessionStore.get(sessionId);

  if (!session) {
    const error = new Error('Study session not found.');
    error.status = 404;
    throw error;
  }

  const question = session.quiz.questions.find((item) => item.id === questionId);

  if (!question) {
    const error = new Error('Quiz question not found.');
    error.status = 404;
    throw error;
  }

  const evaluation = await evaluateQuizAnswer({
    question,
    answer,
    summary: session.summary,
    contextText: session.contentContext.extractedText,
  });

  studySessionStore.update(sessionId, (current) => ({
    ...current,
    quiz: {
      ...current.quiz,
      attempts: {
        ...current.quiz.attempts,
        [questionId]: {
          answer,
          evaluatedAt: new Date().toISOString(),
          ...evaluation,
        },
      },
    },
  }));

  return evaluation;
}

export async function replyToStudyChat({ sessionId, question }) {
  const session = studySessionStore.get(sessionId);

  if (!session) {
    const error = new Error('Study session not found.');
    error.status = 404;
    throw error;
  }

  const reply = await answerFollowUpQuestion({
    question,
    summary: session.summary,
    contextText: session.contentContext.extractedText,
    chatHistory: session.chatHistory,
  });

  studySessionStore.update(sessionId, (current) => ({
    ...current,
    chatHistory: [
      ...current.chatHistory,
      {
        role: 'user',
        message: question,
      },
      {
        role: 'assistant',
        message: reply.answer,
      },
    ],
  }));

  return reply;
}

function sanitizeSession(session) {
  return {
    id: session.id,
    createdAt: session.createdAt,
    source: session.source,
    ingestion: session.ingestion,
    summary: session.summary,
    quiz: session.quiz,
    recommendations: session.recommendations,
    chatHistory: session.chatHistory,
  };
}
