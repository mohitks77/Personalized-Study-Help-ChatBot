export async function parseAudioSource(sourceUrl) {
  return {
    title: decodeURIComponent(sourceUrl.split('/').pop() || 'Audio Study Content'),
    extractedText: [
      'Audio study source detected.',
      'For the best learning results, provide a transcript-backed page or extend the pipeline with transcription support.',
      `Source URL: ${sourceUrl}`,
    ].join(' '),
    metadata: {
      transcriptionMode: 'metadata-only',
    },
  };
}
