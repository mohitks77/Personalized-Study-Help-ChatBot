import pdf from 'pdf-parse';

export async function parsePdfBuffer(buffer, sourceUrl) {
  const data = await pdf(buffer);

  return {
    title: data.info?.Title || data.metadata?.Title || fileNameFromUrl(sourceUrl),
    extractedText: data.text,
    metadata: {
      pages: data.numpages,
      info: data.info || {},
    },
  };
}

function fileNameFromUrl(sourceUrl) {
  return decodeURIComponent(sourceUrl.split('/').pop() || 'Document PDF');
}
