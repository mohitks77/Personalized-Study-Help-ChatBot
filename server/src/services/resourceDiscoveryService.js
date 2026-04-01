import * as cheerio from 'cheerio';

export async function discoverLearningResources(summary) {
  const queries = buildResourceQueries(summary);
  const fallbackResources = buildFallbackResourceCollections(queries);

  if (process.env.ENABLE_WEB_DISCOVERY === 'false') {
    return fallbackResources;
  }

  try {
    const [articleResults, videoResults, multimediaResults] = await Promise.all([
      searchDuckDuckGo(`${queries[0]} explained tutorial`, 'article'),
      searchDuckDuckGo(`${queries[0]} explained youtube`, 'video'),
      searchDuckDuckGo(`${queries[1] || queries[0]} visual interactive tutorial`, 'multimedia'),
    ]);

    return fillMissingCollections(
      {
      articles: dedupeResources(articleResults).slice(0, 4),
      videos: dedupeResources(videoResults).slice(0, 4),
      multimedia: dedupeResources(multimediaResults).slice(0, 4),
      },
      fallbackResources,
    );
  } catch (error) {
    console.warn('Resource discovery failed, using fallback links.', error.message);
    return fallbackResources;
  }
}

async function searchDuckDuckGo(query, kind) {
  const response = await fetch(`https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
    headers: {
      'user-agent': 'StudySageBot/1.0',
    },
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    throw new Error(`Search request failed with status ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  return $('.result')
    .slice(0, 6)
    .map((_index, element) => {
      const anchor = $(element).find('.result__a').first();
      const title = anchor.text().trim() || $(element).find('.result__title').text().trim();
      const href = anchor.attr('href') || $(element).find('.result__url').attr('href');
      const snippet = $(element).find('.result__snippet').text().trim();

      return {
        kind,
        title,
        url: resolveDuckDuckGoUrl(href),
        description: snippet,
      };
    })
    .get()
    .filter((item) => item.title && item.url);
}

function buildResourceQueries(summary) {
  return [
    ...(summary.recommendedSearchTerms || []),
    summary.title,
    ...(summary.coreTopics || []).map((topic) => topic.name),
  ]
    .filter(Boolean)
    .filter((item, index, items) => items.indexOf(item) === index)
    .slice(0, 4);
}

function resolveDuckDuckGoUrl(href) {
  if (!href) {
    return '';
  }

  if (href.startsWith('http')) {
    return href;
  }

  try {
    const duckUrl = new URL(href, 'https://duckduckgo.com');
    const redirected = duckUrl.searchParams.get('uddg');
    return redirected ? decodeURIComponent(redirected) : duckUrl.toString();
  } catch {
    return href;
  }
}

function dedupeResources(resources) {
  const seen = new Set();

  return resources.filter((item) => {
    if (seen.has(item.url)) {
      return false;
    }

    seen.add(item.url);
    return true;
  });
}

function fillMissingCollections(discovered, fallback) {
  return {
    articles: mergeResources(discovered.articles, fallback.articles),
    videos: mergeResources(discovered.videos, fallback.videos),
    multimedia: mergeResources(discovered.multimedia, fallback.multimedia),
  };
}

function mergeResources(primary = [], fallback = []) {
  return dedupeResources([...(primary || []), ...(fallback || [])]).slice(0, 4);
}

function buildFallbackResourceCollections(queries) {
  return {
    articles: queries.slice(0, 3).map((query) => ({
      kind: 'article',
      title: `Read more about ${query}`,
      url: `https://duckduckgo.com/?q=${encodeURIComponent(`${query} explained tutorial article`)}`,
      description: 'Search results tuned for explainers, written tutorials, and quick revision articles.',
    })),
    videos: queries.slice(0, 3).map((query) => ({
      kind: 'video',
      title: `Watch videos on ${query}`,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${query} explained`)}`,
      description: 'A ready-to-use YouTube search for walkthroughs, explainers, and lesson videos.',
    })),
    multimedia: queries.slice(0, 3).map((query) => ({
      kind: 'multimedia',
      title: `Find interactive resources for ${query}`,
      url: `https://duckduckgo.com/?q=${encodeURIComponent(`${query} interactive tutorial`)}`,
      description: 'A quick route to simulations, interactive guides, visual explainers, and study aids.',
    })),
  };
}
