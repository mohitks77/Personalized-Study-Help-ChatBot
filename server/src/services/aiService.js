import OpenAI from 'openai';
import {
  extractKeyPhrases,
  extractKeywords,
  findBestMatchingExcerpt,
  normalizeText,
  splitIntoSentences,
  truncateText,
} from '../utils/text.js';

const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const client = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

export async function generateStudyPack(content) {
  if (client) {
    try {
      return await generateStudyPackWithAi(content);
    } catch (error) {
      console.warn('AI generation failed, using fallback mode.', error.message);
    }
  }

  return generateFallbackStudyPack(content);
}

export async function evaluateQuizAnswer({ question, answer, summary, contextText }) {
  if (client) {
    try {
      return await evaluateWithAi({ question, answer, summary, contextText });
    } catch (error) {
      console.warn('AI quiz evaluation failed, using fallback mode.', error.message);
    }
  }

  return evaluateFallbackAnswer({ question, answer });
}

export async function answerFollowUpQuestion({ question, summary, contextText, chatHistory }) {
  const retrieval = buildChatRetrieval({ question, summary, contextText });

  if (client) {
    try {
      return await answerWithAi({ question, summary, chatHistory, retrieval });
    } catch (error) {
      console.warn('AI chat failed, using fallback mode.', error.message);
    }
  }

  return answerWithFallback({ question, summary, retrieval });
}

async function generateStudyPackWithAi(content) {
  const fallbackStudyPack = generateFallbackStudyPack(content);
  const prompt = [
    'You are a personalized study coach.',
    'Analyze the ingested material and return strict JSON only.',
    'Create a concise but useful study packet for a student.',
    'Use the following schema:',
    JSON.stringify(
      {
        mode: 'text_or_multimodal',
        summary: {
          title: 'string',
          overview: 'string',
          coreTopics: [
            {
              name: 'string',
              summary: 'string',
              whyItMatters: 'string',
            },
          ],
          learningObjectives: ['string'],
          keyTakeaways: ['string'],
          studyPlan: [
            {
              step: 'string',
              purpose: 'string',
            },
          ],
          recommendedSearchTerms: ['string'],
        },
        quiz: {
          questions: [
            {
              question: 'string',
              acceptableAnswers: ['string'],
              expectedAnswer: 'string',
              explanation: 'string',
              difficulty: 'easy_medium_or_hard',
            },
          ],
        },
      },
      null,
      2,
    ),
  ].join('\n');

  const userContent = [
    {
      type: 'input_text',
      text: buildContentDigest(content),
    },
  ];

  if (content.imageDataUrl) {
    userContent.push({
      type: 'input_image',
      image_url: content.imageDataUrl,
    });
  }

  const response = await client.responses.create({
    model,
    input: [
      {
        role: 'system',
        content: [
          {
            type: 'input_text',
            text: prompt,
          },
        ],
      },
      {
        role: 'user',
        content: userContent,
      },
    ],
  });

  const parsed = parseJsonResponse(response.output_text);
  const questions = (parsed.quiz?.questions || []).slice(0, 5).map((item, index) => ({
    id: `q-${index + 1}`,
    type: 'short-answer',
    difficulty: item.difficulty || 'medium',
    question: item.question,
    expectedAnswer: item.expectedAnswer,
    acceptableAnswers: item.acceptableAnswers || [item.expectedAnswer],
    explanation: item.explanation,
  }));

  return {
    mode: parsed.mode || (content.imageDataUrl ? 'multimodal' : 'text'),
    summary: {
      title: parsed.summary?.title || fallbackStudyPack.summary.title,
      overview: parsed.summary?.overview || fallbackStudyPack.summary.overview,
      coreTopics: (parsed.summary?.coreTopics || fallbackStudyPack.summary.coreTopics).slice(0, 5),
      learningObjectives: (
        parsed.summary?.learningObjectives || fallbackStudyPack.summary.learningObjectives
      ).slice(0, 5),
      keyTakeaways: (parsed.summary?.keyTakeaways || fallbackStudyPack.summary.keyTakeaways).slice(
        0,
        5,
      ),
      studyPlan: (parsed.summary?.studyPlan || fallbackStudyPack.summary.studyPlan).slice(0, 5),
      recommendedSearchTerms: (
        parsed.summary?.recommendedSearchTerms || fallbackStudyPack.summary.recommendedSearchTerms
      ).slice(0, 4),
    },
    quiz: {
      questions: questions.length ? questions : fallbackStudyPack.quiz.questions,
    },
  };
}

async function evaluateWithAi({ question, answer, summary, contextText }) {
  const response = await client.responses.create({
    model,
    input: [
      {
        role: 'system',
        content: [
          {
            type: 'input_text',
            text: [
              'You are evaluating a study quiz answer.',
              'Do not mark an answer correct if it mostly repeats or paraphrases the question without adding explanation.',
              'Return JSON only with: correct, score, explanation, expectedAnswer, encouragement.',
              'Score must be a number between 0 and 100.',
            ].join('\n'),
          },
        ],
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: JSON.stringify(
              {
                question,
                studentAnswer: answer,
                studySummary: summary,
                contextExcerpt: truncateText(contextText, 7000),
              },
              null,
              2,
            ),
          },
        ],
      },
    ],
  });

  const parsed = parseJsonResponse(response.output_text);

  return {
    questionId: question.id,
    correct: Boolean(parsed.correct),
    score: Number(parsed.score || 0),
    expectedAnswer: parsed.expectedAnswer || question.expectedAnswer,
    explanation: parsed.explanation || question.explanation,
    encouragement: parsed.encouragement || (parsed.correct ? 'Nicely done.' : 'Keep going, you are close.'),
  };
}

async function answerWithAi({ question, summary, chatHistory, retrieval }) {
  const response = await client.responses.create({
    model,
    input: [
      {
        role: 'system',
        content: [
          {
            type: 'input_text',
            text: [
              'You are a patient study chatbot.',
              'Answer only using the study session context.',
              'Answer the exact user question directly and specifically.',
              'Do not default to a generic overall summary unless the user explicitly asked for a summary.',
              'Use the retrieved topics and excerpts first, and adapt the shape of the answer to the question.',
              'If the context is insufficient, say that clearly and mention the closest covered topic.',
              'Return JSON only with keys: answer, citedFocus, followUpPrompt.',
            ].join('\n'),
          },
        ],
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: JSON.stringify(
              {
                question,
                summary,
                recentChat: chatHistory.slice(-6),
                relevantTopics: retrieval.relevantTopics,
                relevantExcerpts: retrieval.excerpts,
              },
              null,
              2,
            ),
          },
        ],
      },
    ],
  });

  const parsed = parseJsonResponse(response.output_text);

  return {
    answer: parsed.answer,
    citedFocus: parsed.citedFocus || 'Source summary',
    followUpPrompt: parsed.followUpPrompt || 'Ask me to explain any part in simpler language.',
  };
}

function generateFallbackStudyPack(content) {
  const fallbackSourceText = buildFallbackSourceText(content);
  const sentences = splitIntoSentences(fallbackSourceText);
  const keyPhrases = extractKeyPhrases(fallbackSourceText, 6);
  const keywords = extractKeywords(fallbackSourceText, 8);
  const conceptSeeds = [...keyPhrases, ...keywords].filter(
    (item, index, items) => item && items.indexOf(item) === index,
  );
  const overview = buildFallbackOverview({ content, sentences, fallbackSourceText });
  const coreTopics = conceptSeeds.slice(0, 4).map((topic) => ({
    name: toTitleCase(topic),
    summary: `This topic appears repeatedly in the source and is likely central to understanding ${content.title}.`,
    whyItMatters: `Understanding ${topic} helps the learner connect the main ideas in the material.`,
  }));

  const learningObjectives = [
    `Explain the main idea behind ${content.title}.`,
    ...conceptSeeds.slice(0, 3).map((topic) => `Describe how ${topic} fits into the overall material.`),
  ].slice(0, 4);

  const keyTakeaways = [
    ...sentences.slice(0, 2),
    ...coreTopics.slice(0, 2).map((topic) => `${topic.name}: ${topic.summary}`),
  ]
    .filter(Boolean)
    .slice(0, 5);

  const studyPlan = [
    {
      step: 'Read the short overview first',
      purpose: 'Build a fast mental model of the source before memorizing details.',
    },
    ...coreTopics.slice(0, 3).map((topic) => ({
      step: `Review ${topic.name}`,
      purpose: topic.whyItMatters,
    })),
  ].slice(0, 4);

  const quizQuestions = buildFallbackQuiz({
    title: content.title,
    overview,
    coreTopics,
    concepts: conceptSeeds,
    sourceType: content.sourceType,
  });

  return {
    mode: content.imageDataUrl ? 'multimodal' : 'text',
    summary: {
      title: content.title,
      overview,
      coreTopics,
      learningObjectives,
      keyTakeaways,
      studyPlan,
      recommendedSearchTerms: [
        content.title,
        ...coreTopics.slice(0, 2).map((topic) => `${topic.name} explained`),
      ].slice(0, 4),
    },
    quiz: {
      questions: quizQuestions,
    },
  };
}

function buildFallbackQuiz({ title, overview, coreTopics, concepts, sourceType }) {
  const primaryTopics = coreTopics.length ? coreTopics : concepts.map((topic) => ({ name: toTitleCase(topic) }));
  const technicalSource = isTechnicalSource(title, concepts, sourceType);
  const sourceLabel = simplifySourceLabel(title);
  const centralIdea = buildCentralIdeaAnswer({ title, overview, coreTopics, keywords: concepts });
  const centralIdeaKeywords = extractKeywords(centralIdea, 6);

  return [
    {
      id: 'q-1',
      type: 'short-answer',
      difficulty: 'easy',
      question: technicalSource
        ? `What core idea or contribution does "${sourceLabel}" present?`
        : 'What is the main idea discussed in this source?',
      expectedAnswer: centralIdea,
      acceptableAnswers: [
        ...centralIdeaKeywords,
        ...primaryTopics.slice(0, 2).flatMap((topic) => extractKeywords(topic.name, 2)),
      ],
      explanation:
        technicalSource
          ? 'A strong answer should explain the main contribution, method, or claim presented by the source.'
          : 'A strong answer should describe the core claim, event, or concept discussed in the source instead of repeating the headline.',
    },
    ...primaryTopics.slice(0, 4).map((topic, index) => {
      const topicQuestion = buildTopicQuestion({
        topicName: topic.name,
        sourceLabel,
        index,
        technicalSource,
      });

      return {
        id: `q-${index + 2}`,
        type: 'short-answer',
        difficulty: index < 1 ? 'easy' : 'medium',
        question: topicQuestion,
        expectedAnswer: buildTopicAnswer(topic),
        acceptableAnswers: [topic.name, ...extractKeywords(buildTopicAnswer(topic), 5)],
        explanation: technicalSource
          ? `A strong answer should explain the role or importance of ${topic.name} in ${sourceLabel}.`
          : `A strong answer should explain what ${topic.name} refers to here and why it matters in the source.`,
      };
    }),
  ];
}

function evaluateFallbackAnswer({ question, answer }) {
  const normalizedAnswer = normalizeText(answer);
  const normalizedQuestion = normalizeText(question.question);
  const acceptable = (question.acceptableAnswers || []).map((item) => normalizeText(item)).filter(Boolean);
  const expectedAnswer = normalizeText(question.expectedAnswer);
  const wordCount = countWords(normalizedAnswer);
  const overlap = tokenOverlap(normalizedAnswer, expectedAnswer);
  const isMainFocusQuestion = /main focus|main idea|summar/i.test(question.question);
  const questionEcho = detectQuestionEcho({
    questionText: normalizedQuestion,
    answerText: normalizedAnswer,
  });

  let score;
  let correct;
  let explanation;

  if (questionEcho.isEcho) {
    return {
      questionId: question.id,
      correct: false,
      score: clampScore(Math.round(Math.min(20, overlap * 35))),
      expectedAnswer: question.expectedAnswer,
      explanation:
        'Not quite yet. Repeating the question is not enough. Your answer needs to explain the idea in your own words and add meaningful detail from the source.',
      encouragement: 'Try answering in a full sentence that explains the concept instead of restating the prompt.',
    };
  }

  if (isMainFocusQuestion) {
    const quotedTopic = extractQuotedText(question.question);
    const topicOverlap = quotedTopic ? tokenOverlap(normalizedAnswer, normalizeText(quotedTopic)) : 0;
    const detailScore = Math.min(wordCount / 6, 1);

    score = Math.round(topicOverlap * 60 + overlap * 25 + detailScore * 15);
    correct = wordCount >= 5 && (topicOverlap >= 0.35 || overlap >= 0.3);

    explanation = correct
      ? `Correct. ${question.explanation}`
      : wordCount < 5
        ? `Not quite yet. This answer is too short to explain the main focus. ${question.explanation}`
        : `Not quite yet. This answer names part of the topic, but it does not clearly describe the full main focus. ${question.explanation}`;
  } else {
    const phraseMatches = acceptable.filter((item) => phraseCoverage(normalizedAnswer, item) >= 0.8).length;
    const conceptMatches = acceptable.filter((item) => phraseCoverage(normalizedAnswer, item) >= 0.5).length;
    const detailScore = Math.min(wordCount / 4, 1);

    score = Math.round(
      Math.min(
        100,
        phraseMatches > 0
          ? 85 + detailScore * 15
          : conceptMatches * 18 + overlap * 50 + detailScore * 20,
      ),
    );
    correct = phraseMatches > 0 || (conceptMatches > 0 && overlap >= 0.28 && wordCount >= 3) || overlap >= 0.5;

    explanation = correct
      ? `Correct. ${question.explanation}`
      : `Not quite yet. ${question.explanation} A stronger answer would mention: ${question.expectedAnswer}`;
  }

  return {
    questionId: question.id,
    correct,
    score: clampScore(score),
    expectedAnswer: question.expectedAnswer,
    explanation,
    encouragement: correct ? 'Well done. You captured the key idea.' : 'Good attempt. Focus on the core concept and try again.',
  };
}

function answerWithFallback({ question, summary, retrieval }) {
  const normalizedQuestion = normalizeText(question);
  const primaryTopic = retrieval.relevantTopics[0];
  const secondaryTopic = retrieval.relevantTopics[1];
  const primaryExcerpt = retrieval.excerpts[0];
  const secondaryExcerpt = retrieval.excerpts[1];
  const availableTopics = (summary.coreTopics || []).map((topic) => topic.name).filter(Boolean);

  let answer;
  let citedFocus;
  let followUpPrompt;

  if (/compare|difference|different|versus|\bvs\b/.test(normalizedQuestion) && primaryTopic && secondaryTopic) {
    answer = [
      `${primaryTopic.name} focuses on ${primaryTopic.summary.toLowerCase()}`,
      `${secondaryTopic.name} focuses on ${secondaryTopic.summary.toLowerCase()}`,
      primaryExcerpt ? `A relevant source detail is: ${primaryExcerpt}` : '',
      secondaryExcerpt ? `Another related detail is: ${secondaryExcerpt}` : '',
    ]
      .filter(Boolean)
      .join('. ');
    citedFocus = `${primaryTopic.name} and ${secondaryTopic.name}`;
    followUpPrompt = `Ask if you want ${primaryTopic.name} or ${secondaryTopic.name} explained in simpler terms.`;
  } else if (/example|real world|real-world/.test(normalizedQuestion)) {
    answer = primaryExcerpt
      ? `A useful source-based example or detail is: ${primaryExcerpt}`
      : primaryTopic
        ? `${primaryTopic.name} is highlighted in the material as follows: ${primaryTopic.summary}`
        : `I do not see a concrete example in the extracted source, but the closest topic covered is ${availableTopics[0] || summary.title}.`;
    citedFocus = primaryTopic?.name || 'Source detail';
    followUpPrompt = 'Ask me to turn that into a simpler example or a short revision note.';
  } else if (/why\b|reason/.test(normalizedQuestion)) {
    answer = primaryTopic
      ? `${primaryTopic.name} matters because ${primaryTopic.whyItMatters.toLowerCase()}${primaryExcerpt ? ` The source also points to this detail: ${primaryExcerpt}` : ''}`
      : primaryExcerpt || `The source does not give a direct reason, but it mainly covers ${availableTopics.join(', ') || summary.title}.`;
    citedFocus = primaryTopic?.name || 'Source explanation';
    followUpPrompt = 'Ask me to connect that reason to the bigger topic or exam-style answer.';
  } else if (/how\b|process|work/.test(normalizedQuestion)) {
    answer = primaryExcerpt
      ? `Here is the most relevant process detail I found: ${primaryExcerpt}`
      : primaryTopic
        ? `${primaryTopic.name} is handled in the source like this: ${primaryTopic.summary} ${primaryTopic.whyItMatters}`
        : `I could not find a precise process explanation in the extracted source. The closest topics covered are ${availableTopics.join(', ') || summary.title}.`;
    citedFocus = primaryTopic?.name || 'Process detail';
    followUpPrompt = 'Ask me for a step-by-step explanation if you want this broken down further.';
  } else if (/simple|simpler|easy|understand|explain/.test(normalizedQuestion) && primaryTopic) {
    answer = `In simple terms, ${primaryTopic.name} means: ${primaryTopic.summary} ${primaryTopic.whyItMatters}`;
    citedFocus = primaryTopic.name;
    followUpPrompt = `Ask me for an analogy or quick memory trick for ${primaryTopic.name}.`;
  } else if (primaryTopic) {
    answer = [
      `${primaryTopic.name}: ${primaryTopic.summary}`,
      primaryTopic.whyItMatters,
      primaryExcerpt ? `Most relevant source detail: ${primaryExcerpt}` : '',
    ]
      .filter(Boolean)
      .join(' ');
    citedFocus = primaryTopic.name;
    followUpPrompt = `Ask me to compare ${primaryTopic.name} with another topic or turn it into a short note.`;
  } else if (primaryExcerpt) {
    answer = `The most relevant part of the source says: ${primaryExcerpt}`;
    citedFocus = 'Source excerpt';
    followUpPrompt = 'Ask me to simplify that or pull out the key point.';
  } else {
    answer = `I could not find a precise answer in the extracted source. The material mainly covers ${availableTopics.join(', ') || summary.title}.`;
    citedFocus = 'Session overview';
    followUpPrompt = `Try asking about one of these topics: ${availableTopics.slice(0, 3).join(', ') || summary.title}.`;
  }

  return {
    answer,
    citedFocus,
    followUpPrompt,
  };
}

function buildContentDigest(content) {
  return JSON.stringify(
    {
      title: content.title,
      sourceType: content.sourceType,
      sourceUrl: content.sourceUrl,
      metadata: content.metadata,
      extractedText: truncateText(content.extractedText, 15000),
      preview: content.contentPreview,
    },
    null,
    2,
  );
}

function parseJsonResponse(rawText) {
  const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
  return JSON.parse(cleaned);
}

function tokenOverlap(left, right) {
  const leftSet = new Set(left.split(' ').filter(Boolean));
  const rightSet = new Set(right.split(' ').filter(Boolean));

  if (!leftSet.size || !rightSet.size) {
    return 0;
  }

  let matches = 0;
  leftSet.forEach((token) => {
    if (rightSet.has(token)) {
      matches += 1;
    }
  });

  return matches / rightSet.size;
}

function phraseCoverage(answer, phrase) {
  const answerTokens = new Set(answer.split(' ').filter(Boolean));
  const phraseTokens = phrase.split(' ').filter(Boolean);

  if (!phraseTokens.length) {
    return 0;
  }

  let matches = 0;
  phraseTokens.forEach((token) => {
    if (answerTokens.has(token)) {
      matches += 1;
    }
  });

  return matches / phraseTokens.length;
}

function extractQuotedText(questionText) {
  const match = questionText.match(/"([^"]+)"/);
  return match?.[1] || '';
}

function countWords(value) {
  return value.split(' ').filter(Boolean).length;
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}

function detectQuestionEcho({ questionText, answerText }) {
  const answerTokens = answerText.split(' ').filter(Boolean);
  const questionTokens = questionText
    .split(' ')
    .filter((token) => token.length > 2);

  if (!answerTokens.length || !questionTokens.length) {
    return {
      isEcho: false,
    };
  }

  const answerSet = new Set(answerTokens);
  const questionSet = new Set(questionTokens);
  let overlapCount = 0;
  let noveltyCount = 0;

  answerSet.forEach((token) => {
    if (questionSet.has(token)) {
      overlapCount += 1;
    } else {
      noveltyCount += 1;
    }
  });

  const overlapRatio = overlapCount / questionSet.size;
  const noveltyRatio = noveltyCount / answerSet.size;
  const startsLikeQuestion = /^(what|why|how|when|where|who)\b/.test(answerText);
  const endsLikeQuestion = /\?$/.test(answerText.trim());

  return {
    isEcho:
      (overlapRatio >= 0.7 && noveltyRatio <= 0.35) ||
      ((startsLikeQuestion || endsLikeQuestion) && noveltyRatio <= 0.45 && overlapRatio >= 0.55),
  };
}

function buildCentralIdeaAnswer({ title, overview, coreTopics, keywords }) {
  const overviewSentence = splitIntoSentences(overview)[0] || truncateText(overview, 220);

  if (overviewSentence && !looksLikeHeadlineEcho(overviewSentence, title)) {
    return truncateText(overviewSentence, 220);
  }

  if (coreTopics.length >= 2) {
    return `The source mainly discusses ${coreTopics[0].name} and ${coreTopics[1].name}, focusing on how they shape the overall topic.`;
  }

  if (coreTopics.length === 1) {
    return `The source mainly discusses ${coreTopics[0].name} and why it matters in the overall topic.`;
  }

  if (keywords.length) {
    return `The source mainly discusses ${keywords.slice(0, 3).join(', ')}, and the key point they represent in the material.`;
  }

  return 'The source mainly discusses the central topic and the supporting details presented in the material.';
}

function buildFallbackSourceText(content) {
  const description = content.description || content.metadata?.description || '';
  const title = content.title || '';
  const extractedText = content.extractedText || '';

  return [
    title,
    title,
    description,
    description,
    extractedText,
  ]
    .filter(Boolean)
    .join('\n\n');
}

function buildFallbackOverview({ content, sentences, fallbackSourceText }) {
  const description = truncateText(content.description || content.metadata?.description || '', 260);
  const meaningfulSentence = sentences.find((sentence) => !looksLikeHeadlineEcho(sentence, content.title));

  if (description && !looksLikeHeadlineEcho(description, content.title)) {
    return description;
  }

  if (meaningfulSentence) {
    return truncateText(meaningfulSentence, 260);
  }

  return truncateText(fallbackSourceText || content.contentPreview, 260);
}

function buildTopicAnswer(topic) {
  const summary = truncateText(topic.summary || `${topic.name} is an important idea in the source.`, 140);
  const whyItMatters = truncateText(topic.whyItMatters || `It matters because it helps explain the overall material.`, 140);
  return `${summary} ${whyItMatters}`.trim();
}

function buildTopicQuestion({ topicName, sourceLabel, index, technicalSource }) {
  if (!technicalSource) {
    return [
      `How is ${topicName} presented in this source?`,
      `Why is ${topicName} important in this source?`,
      `How does ${topicName} connect to the main idea of this source?`,
      `What should a learner understand about ${topicName} here?`,
    ][index % 4];
  }

  return [
    `What role does ${topicName} play in "${sourceLabel}"?`,
    `Why is ${topicName} important to the main idea of "${sourceLabel}"?`,
    `How does the source explain ${topicName} in "${sourceLabel}"?`,
    `How does ${topicName} connect to the overall approach in "${sourceLabel}"?`,
  ][index % 4];
}

function simplifySourceLabel(title) {
  return String(title || 'this source').replace(/\s+/g, ' ').trim();
}

function isTechnicalSource(title, concepts, sourceType) {
  const haystack = normalizeText([title, ...(concepts || [])].join(' '));

  if (sourceType === 'pdf') {
    return true;
  }

  return [
    'transformer',
    'attention',
    'architecture',
    'model',
    'algorithm',
    'dataset',
    'training',
    'classification',
    'embedding',
    'network',
    'framework',
    'approach',
    'method',
  ].some((term) => haystack.includes(term));
}

function looksLikeHeadlineEcho(text, title) {
  const normalizedText = normalizeText(text);
  const normalizedTitle = normalizeText(title);

  if (!normalizedText || !normalizedTitle) {
    return false;
  }

  return normalizedText === normalizedTitle || normalizedText.startsWith(normalizedTitle);
}

function buildChatRetrieval({ question, summary, contextText }) {
  const questionKeywords = extractKeywords(question, 8);
  const relevantTopics = (summary.coreTopics || [])
    .map((topic) => ({
      ...topic,
      score:
        scoreTextAgainstKeywords(`${topic.name} ${topic.summary} ${topic.whyItMatters}`, questionKeywords) +
        (normalizeText(question).includes(normalizeText(topic.name)) ? 3 : 0),
    }))
    .sort((left, right) => right.score - left.score)
    .filter((topic) => topic.score > 0)
    .slice(0, 2)
    .map(({ score, ...topic }) => topic);

  const passages = getContextPassages(contextText);
  const scoredPassages = passages
    .map((passage) => ({
      passage,
      score:
        scoreTextAgainstKeywords(passage, questionKeywords) +
        tokenOverlap(normalizeText(question), normalizeText(passage)),
    }))
    .sort((left, right) => right.score - left.score)
    .filter((item, index, items) => item.score > 0 && items.findIndex((entry) => entry.passage === item.passage) === index)
    .slice(0, 2)
    .map((item) => truncateText(item.passage, 260));

  if (!scoredPassages.length) {
    const bestExcerpt = findBestMatchingExcerpt(contextText, question);

    if (bestExcerpt) {
      scoredPassages.push(truncateText(bestExcerpt, 260));
    }
  }

  return {
    relevantTopics,
    excerpts: scoredPassages,
  };
}

function getContextPassages(text) {
  const paragraphs = String(text || '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter((paragraph) => paragraph.length > 50);

  return paragraphs.length ? paragraphs : splitIntoSentences(text);
}

function scoreTextAgainstKeywords(text, keywords) {
  const haystack = normalizeText(text);

  return keywords.reduce((score, keyword) => {
    if (!keyword || !haystack.includes(keyword)) {
      return score;
    }

    return score + (keyword.length >= 7 ? 2 : 1);
  }, 0);
}

function toTitleCase(value) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}
