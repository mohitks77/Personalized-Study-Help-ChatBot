import * as cheerio from 'cheerio';
import { cleanWhitespace, truncateText } from '../../../utils/text.js';

export async function parseHtmlContent(html, sourceUrl) {
  const $ = cheerio.load(html);

  $('script, style, noscript, iframe, svg, form, nav, footer, aside').remove();

  const title =
    $('meta[property="og:title"]').attr('content')?.trim() ||
    $('title').first().text().trim() ||
    $('h1').first().text().trim();
  const description =
    $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[property="og:description"]').attr('content')?.trim() ||
    '';
  const headings = $('h1, h2, h3')
    .slice(0, 12)
    .map((_index, element) => cleanWhitespace($(element).text()))
    .get()
    .filter(Boolean);
  const paragraphs = $('p')
    .slice(0, 28)
    .map((_index, element) => cleanWhitespace($(element).text()))
    .get()
    .filter((text) => text.length > 45);
  const bulletPoints = $('li')
    .slice(0, 20)
    .map((_index, element) => cleanWhitespace($(element).text()))
    .get()
    .filter((text) => text.length > 25);
  const host = new URL(sourceUrl).hostname;
  const extractedText = truncateText(
    [description, ...headings, ...paragraphs, ...bulletPoints].filter(Boolean).join('\n\n'),
    26000,
  );

  return {
    title,
    description,
    extractedText,
    metadata: {
      host,
      headings: headings.slice(0, 6),
      paragraphsCaptured: paragraphs.length,
    },
  };
}
