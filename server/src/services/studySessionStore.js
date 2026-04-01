const sessions = new Map();

export const studySessionStore = {
  create(session) {
    sessions.set(session.id, session);
    return session;
  },
  get(sessionId) {
    return sessions.get(sessionId);
  },
  update(sessionId, updater) {
    const current = sessions.get(sessionId);

    if (!current) {
      return null;
    }

    const next = updater(current);
    sessions.set(sessionId, next);
    return next;
  },
};
