export async function downloadRemoteAsset(sourceUrl) {
  const response = await fetch(sourceUrl, {
    headers: {
      'user-agent': 'StudySageBot/1.0',
      accept: '*/*',
    },
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    const error = new Error(`Unable to fetch the source. Received ${response.status}.`);
    error.status = 400;
    throw error;
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return {
    buffer,
    contentType: response.headers.get('content-type') || '',
    text: buffer.toString('utf8'),
  };
}
