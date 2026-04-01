export function ensureHttpUrl(value) {
  try {
    const url = new URL(value);

    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Only http and https URLs are supported.');
    }

    return url.toString();
  } catch {
    const error = new Error('Please provide a valid http or https URL.');
    error.status = 400;
    throw error;
  }
}

export function isYouTubeUrl(value) {
  try {
    const url = new URL(value);
    return ['www.youtube.com', 'youtube.com', 'youtu.be'].includes(url.hostname);
  } catch {
    return false;
  }
}

export function extractYouTubeVideoId(value) {
  try {
    const url = new URL(value);

    if (url.hostname === 'youtu.be') {
      return url.pathname.replace('/', '');
    }

    return url.searchParams.get('v');
  } catch {
    return null;
  }
}
