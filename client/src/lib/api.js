const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

async function request(path, options = {}) {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const response = await fetch(`${API_BASE}${path}`, {
    headers: isFormData
      ? options.headers
      : {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Something went wrong while talking to the server.');
  }

  return payload;
}

export function fetchHealth() {
  return request('/api/health');
}

export function createStudySession(data) {
  return request('/api/study-sessions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function createStudySessionFromUpload({ sourceType, file }) {
  const formData = new FormData();
  formData.append('sourceType', sourceType);
  formData.append('file', file);

  return request('/api/study-sessions/upload', {
    method: 'POST',
    body: formData,
  });
}

export function evaluateQuizAnswer(sessionId, data) {
  return request(`/api/study-sessions/${sessionId}/quiz/answer`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function askStudyQuestion(sessionId, data) {
  return request(`/api/study-sessions/${sessionId}/chat`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
