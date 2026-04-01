export async function parseImageSource(sourceUrl) {
  const response = await fetch(sourceUrl, {
    headers: {
      'user-agent': 'StudySageBot/1.0',
    },
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    const error = new Error(`Unable to fetch image source. Received ${response.status}.`);
    error.status = 400;
    throw error;
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const imageDataUrl = `data:${contentType};base64,${buffer.toString('base64')}`;

  return {
    title: decodeURIComponent(sourceUrl.split('/').pop() || 'Image Study Material'),
    extractedText: 'Image-based study content. The vision-capable AI layer will inspect this image and describe its educational content.',
    imageDataUrl,
    metadata: {
      contentType,
    },
  };
}

export async function parseImageBuffer(buffer, mimeType = 'image/jpeg', originalName = 'Image Study Material') {
  const imageDataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;

  return {
    title: originalName,
    extractedText:
      'Image-based study content. The vision-capable AI layer will inspect this uploaded image and describe its educational content.',
    imageDataUrl,
    metadata: {
      contentType: mimeType,
      uploadType: 'local-file',
    },
  };
}
