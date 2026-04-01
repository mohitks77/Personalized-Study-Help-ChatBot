import { Router } from 'express';
import multer from 'multer';
import {
  createStudySession,
  createStudySessionFromUpload,
  evaluateQuizResponse,
  getStudySession,
  replyToStudyChat,
} from '../services/studyService.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});

router.post('/study-sessions', async (req, res, next) => {
  try {
    const { sourceType, sourceUrl } = req.body;

    if (!sourceType || !sourceUrl) {
      const error = new Error('Both sourceType and sourceUrl are required.');
      error.status = 400;
      throw error;
    }

    const session = await createStudySession({ sourceType, sourceUrl });
    res.status(201).json(session);
  } catch (error) {
    next(error);
  }
});

router.post('/study-sessions/upload', upload.single('file'), async (req, res, next) => {
  try {
    const { sourceType } = req.body;

    if (!sourceType || !req.file) {
      const error = new Error('Both sourceType and a file upload are required.');
      error.status = 400;
      throw error;
    }

    const session = await createStudySessionFromUpload({
      sourceType,
      file: req.file,
    });

    res.status(201).json(session);
  } catch (error) {
    next(error);
  }
});

router.get('/study-sessions/:sessionId', (req, res, next) => {
  try {
    const session = getStudySession(req.params.sessionId);
    res.json(session);
  } catch (error) {
    next(error);
  }
});

router.post('/study-sessions/:sessionId/quiz/answer', async (req, res, next) => {
  try {
    const { questionId, answer } = req.body;

    if (!questionId || !answer) {
      const error = new Error('questionId and answer are required.');
      error.status = 400;
      throw error;
    }

    const result = await evaluateQuizResponse({
      sessionId: req.params.sessionId,
      questionId,
      answer,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/study-sessions/:sessionId/chat', async (req, res, next) => {
  try {
    const { question } = req.body;

    if (!question) {
      const error = new Error('question is required.');
      error.status = 400;
      throw error;
    }

    const result = await replyToStudyChat({
      sessionId: req.params.sessionId,
      question,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
