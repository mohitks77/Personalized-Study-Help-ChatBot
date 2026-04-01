import { fetchTranscript } from 'youtube-transcript/dist/youtube-transcript.esm.js';
import { downloadRemoteAsset } from '../remoteFetchService.js';
import { parseHtmlContent } from './htmlParser.js';
import { sanitizeTranscriptText } from '../../../utils/text.js';
import { extractYouTubeVideoId, isYouTubeUrl } from '../../../utils/url.js';

export async function parseVideoSource(sourceUrl) {
  if (isYouTubeUrl(sourceUrl) && typeof fetchTranscript === 'function') {
    const videoId = extractYouTubeVideoId(sourceUrl);

    if (videoId) {
      try {
        const [transcript, metadata] = await Promise.all([
          fetchTranscript(videoId),
          fetchYouTubePageMetadata(sourceUrl),
        ]);
        const transcriptText = buildTranscriptText(transcript);

        return {
          title: metadata.title || `YouTube video ${videoId}`,
          description: metadata.description || '',
          extractedText: [metadata.description, transcriptText].filter(Boolean).join('\n\n'),
          metadata: {
            videoId,
            transcriptAvailable: true,
            host: metadata.host,
            headings: metadata.headings || [],
          },
        };
      } catch (error) {
        console.warn('YouTube transcript unavailable, falling back to page parsing.', error.message);
      }
    }
  }

  const page = await downloadRemoteAsset(sourceUrl);
  const parsedPage = await parseHtmlContent(page.text, sourceUrl);

  return {
    ...parsedPage,
    metadata: {
      ...parsedPage.metadata,
      transcriptAvailable: false,
    },
  };
}

async function fetchYouTubePageMetadata(sourceUrl) {
  try {
    const page = await downloadRemoteAsset(sourceUrl);
    const parsedPage = await parseHtmlContent(page.text, sourceUrl);

    return {
      ...parsedPage,
      title: cleanYouTubeTitle(parsedPage.title),
    };
  } catch {
    return {
      title: '',
      description: '',
      host: 'youtube.com',
      headings: [],
    };
  }
}

function buildTranscriptText(transcript) {
  const cleanedChunks = transcript
    .map((item) => sanitizeTranscriptText(item.text))
    .filter((text) => isUsefulTranscriptChunk(text));
  const dedupedChunks = [];

  cleanedChunks.forEach((chunk) => {
    if (!dedupedChunks.length || dedupedChunks[dedupedChunks.length - 1].toLowerCase() !== chunk.toLowerCase()) {
      dedupedChunks.push(chunk);
    }
  });

  const groupedParagraphs = [];
  let currentParagraph = [];

  dedupedChunks.forEach((chunk, index) => {
    currentParagraph.push(chunk);
    const joined = currentParagraph.join(' ');
    const shouldFlush =
      /[.!?]$/.test(chunk) ||
      joined.length > 260 ||
      index === dedupedChunks.length - 1;

    if (shouldFlush) {
      groupedParagraphs.push(joined);
      currentParagraph = [];
    }
  });

  return groupedParagraphs.join('\n\n');
}

function isUsefulTranscriptChunk(text) {
  const normalized = String(text || '').trim().toLowerCase();

  if (!normalized || normalized.length < 4) {
    return false;
  }

  return !/^(hey|hi|hello|bye|thanks|thank you|okay|yeah|um|uh|hmm)$/.test(normalized);
}

function cleanYouTubeTitle(title) {
  return String(title || '').replace(/\s*-\s*YouTube$/i, '').trim();
}
