import JSZip from 'jszip';
import { truncateText } from '../../../utils/text.js';

const TEXT_EXTENSIONS = new Set([
  '.csv',
  '.html',
  '.java',
  '.js',
  '.json',
  '.md',
  '.py',
  '.rb',
  '.txt',
  '.ts',
  '.tsx',
  '.xml',
  '.yaml',
  '.yml',
]);

export async function parseZipBuffer(buffer, sourceUrl) {
  const archive = await JSZip.loadAsync(buffer);
  const files = Object.values(archive.files).filter((file) => !file.dir);
  const extractedSections = [];

  for (const file of files.slice(0, 12)) {
    if (!isTextLikeFile(file.name)) {
      continue;
    }

    const content = await file.async('string');
    extractedSections.push(`File: ${file.name}\n${truncateText(content, 2200)}`);
  }

  return {
    title: decodeURIComponent(sourceUrl.split('/').pop() || 'Compressed Study Pack'),
    extractedText: extractedSections.join('\n\n'),
    metadata: {
      fileCount: files.length,
      extractedFiles: files.slice(0, 12).map((file) => file.name),
    },
  };
}

function isTextLikeFile(fileName) {
  return TEXT_EXTENSIONS.has(fileName.slice(fileName.lastIndexOf('.')).toLowerCase());
}
