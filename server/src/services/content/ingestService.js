import path from 'node:path';
import { downloadRemoteAsset } from './remoteFetchService.js';
import { parseAudioSource } from './parsers/audioParser.js';
import { parseHtmlContent } from './parsers/htmlParser.js';
import { parseImageBuffer, parseImageSource } from './parsers/imageParser.js';
import { parsePdfBuffer } from './parsers/pdfParser.js';
import { parseVideoSource } from './parsers/videoParser.js';
import { parseZipBuffer } from './parsers/zipParser.js';
import { truncateText } from '../../utils/text.js';
import { ensureHttpUrl } from '../../utils/url.js';

export async function ingestContentFromUrl({ sourceType, sourceUrl }) {
  const normalizedType = String(sourceType || '').toLowerCase();
  const normalizedUrl = ensureHttpUrl(sourceUrl);

  switch (normalizedType) {
    case 'pdf': {
      const file = await downloadRemoteAsset(normalizedUrl);
      return finalizeIngestedContent({
        sourceType: normalizedType,
        sourceUrl: normalizedUrl,
        ...(await parsePdfBuffer(file.buffer, normalizedUrl)),
      });
    }
    case 'image':
      return finalizeIngestedContent({
        sourceType: normalizedType,
        sourceUrl: normalizedUrl,
        ...(await parseImageSource(normalizedUrl)),
      });
    case 'zip':
    case 'compressed': {
      const file = await downloadRemoteAsset(normalizedUrl);
      return finalizeIngestedContent({
        sourceType: normalizedType,
        sourceUrl: normalizedUrl,
        ...(await parseZipBuffer(file.buffer, normalizedUrl)),
      });
    }
    case 'video':
      return finalizeIngestedContent({
        sourceType: normalizedType,
        sourceUrl: normalizedUrl,
        ...(await parseVideoSource(normalizedUrl)),
      });
    case 'audio':
      return finalizeIngestedContent({
        sourceType: normalizedType,
        sourceUrl: normalizedUrl,
        ...(await parseAudioSource(normalizedUrl)),
      });
    case 'webpage':
    case 'link':
    default: {
      const page = await downloadRemoteAsset(normalizedUrl);
      return finalizeIngestedContent({
        sourceType: 'webpage',
        sourceUrl: normalizedUrl,
        ...(await parseHtmlContent(page.text, normalizedUrl)),
      });
    }
  }
}

export async function ingestUploadedFile({ sourceType, file }) {
  const normalizedType = String(sourceType || '').toLowerCase();
  const originalName = file.originalname || 'Uploaded study source';

  switch (normalizedType) {
    case 'pdf':
      return finalizeIngestedContent(
        mergeUploadMetadata(
          {
            sourceType: normalizedType,
            sourceUrl: originalName,
            ...(await parsePdfBuffer(file.buffer, originalName)),
          },
          {
            fileName: originalName,
            mimeType: file.mimetype,
            uploadType: 'local-file',
          },
        ),
      );
    case 'image':
      return finalizeIngestedContent({
        sourceType: normalizedType,
        sourceUrl: originalName,
        ...(await parseImageBuffer(file.buffer, file.mimetype, originalName)),
      });
    case 'zip':
    case 'compressed':
      return finalizeIngestedContent(
        mergeUploadMetadata(
          {
            sourceType: normalizedType,
            sourceUrl: originalName,
            ...(await parseZipBuffer(file.buffer, originalName)),
          },
          {
            fileName: originalName,
            mimeType: file.mimetype,
            uploadType: 'local-file',
          },
        ),
      );
    default: {
      const error = new Error('Local upload currently supports PDF, image, and zip files.');
      error.status = 400;
      throw error;
    }
  }
}

function finalizeIngestedContent(content) {
  const fallbackTitle = content.title || getFallbackTitle(content.sourceUrl);

  return {
    ...content,
    title: fallbackTitle,
    extractedText: truncateText(content.extractedText || '', 30000),
    contentPreview: truncateText(content.extractedText || content.description || '', 420),
    metadata: content.metadata || {},
  };
}

function getFallbackTitle(sourceUrl) {
  try {
    return path.basename(new URL(sourceUrl).pathname || '') || 'Untitled study source';
  } catch {
    return path.basename(String(sourceUrl || '')) || 'Untitled study source';
  }
}

function mergeUploadMetadata(content, metadata) {
  return {
    ...content,
    metadata: {
      ...(content.metadata || {}),
      ...metadata,
    },
  };
}
