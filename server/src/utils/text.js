const STOP_WORDS = new Set([
  'about',
  'after',
  'again',
  'also',
  'always',
  'anyway',
  'because',
  'being',
  'between',
  'cant',
  'could',
  'didnt',
  'doesnt',
  'every',
  'first',
  'from',
  'gonna',
  'gotta',
  'have',
  'here',
  'im',
  'into',
  'just',
  'know',
  'like',
  'many',
  'maybe',
  'more',
  'most',
  'other',
  'okay',
  'over',
  'really',
  'right',
  'said',
  'says',
  'should',
  'some',
  'than',
  'that',
  'thats',
  'their',
  'there',
  'these',
  'they',
  'this',
  'think',
  'uh',
  'um',
  'want',
  'what',
  'when',
  'where',
  'which',
  'while',
  'with',
  'would',
  'yeah',
  'your',
  'youtube',
]);

export function truncateText(value, maxLength = 4000) {
  if (!value) {
    return '';
  }

  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`;
}

export function cleanWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function splitIntoSentences(text) {
  return cleanWhitespace(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 35)
    .slice(0, 10);
}

export function normalizeText(value) {
  return cleanWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractKeywords(text, count = 5) {
  const frequency = new Map();

  normalizeText(text)
    .split(' ')
    .filter((token) => token.length > 3 && !STOP_WORDS.has(token))
    .forEach((token) => {
      frequency.set(token, (frequency.get(token) || 0) + 1);
    });

  return [...frequency.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, count)
    .map(([token]) => token);
}

export function extractKeyPhrases(text, count = 5) {
  const tokens = normalizeText(text)
    .split(' ')
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
  const frequency = new Map();

  for (let index = 0; index < tokens.length - 1; index += 1) {
    const first = tokens[index];
    const second = tokens[index + 1];

    if (!first || !second || first === second) {
      continue;
    }

    const bigram = `${first} ${second}`;
    frequency.set(bigram, (frequency.get(bigram) || 0) + 1);
  }

  return [...frequency.entries()]
    .filter(([, frequencyCount]) => frequencyCount > 1)
    .sort((left, right) => right[1] - left[1])
    .slice(0, count)
    .map(([phrase]) => phrase);
}

export function findBestMatchingExcerpt(text, query) {
  const queryTokens = new Set(extractKeywords(query, 6));
  const paragraphs = String(text || '')
    .split(/\n{2,}/)
    .map((paragraph) => cleanWhitespace(paragraph))
    .filter((paragraph) => paragraph.length > 50)
    .slice(0, 30);

  let bestMatch = '';
  let bestScore = 0;

  paragraphs.forEach((paragraph) => {
    const tokens = new Set(extractKeywords(paragraph, 10));
    let score = 0;

    queryTokens.forEach((token) => {
      if (tokens.has(token)) {
        score += 1;
      }
    });

    if (score > bestScore) {
      bestScore = score;
      bestMatch = paragraph;
    }
  });

  return bestMatch;
}

export function sanitizeTranscriptText(text) {
  return cleanWhitespace(
    String(text || '')
      .replace(/\[[^\]]+\]/g, ' ')
      .replace(/\((music|applause|laughter|cheering)\)/gi, ' ')
      .replace(/\b(uh|um|hmm|mm-hmm|uh-huh)\b/gi, ' ')
      .replace(/\s+/g, ' '),
  );
}
