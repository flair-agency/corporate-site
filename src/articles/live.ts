type NoteArticle = {
  title: string;
  url: string;
  publishedAt: string;
  description: string;
  thumbnail: string;
};

export function validateArticles(value: unknown): NoteArticle[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error('Empty article data');
  const seen = new Set<string>();
  return value.map((item: unknown) => {
    if (typeof item !== 'object' || item === null) throw new Error('Invalid article');
    const a = item as Record<string, unknown>;
    for (const key of ['title', 'url', 'publishedAt', 'description', 'thumbnail']) {
      if (typeof a[key] !== 'string') throw new Error('Invalid article field');
    }
    const article = a as NoteArticle;
    const url = new URL(article.url);
    if (!article.title.trim() || url.protocol !== 'https:' || url.hostname !== 'note.com' ||
        url.username || url.password || !Number.isFinite(Date.parse(article.publishedAt))) {
      throw new Error('Invalid article metadata');
    }
    if (article.thumbnail && new URL(article.thumbnail).protocol !== 'https:') {
      throw new Error('Invalid thumbnail URL');
    }
    if (seen.has(article.url)) throw new Error('Duplicate article URL');
    seen.add(article.url);
    return article;
  });
}

function articleElement(article: NoteArticle): HTMLElement {
  const card = document.createElement('article');
  const link = () => {
    const a = document.createElement('a');
    a.href = article.url;
    a.target = '_blank';
    a.rel = 'noopener';
    return a;
  };
  const heading = document.createElement('h3');
  const title = link();
  title.textContent = article.title;
  heading.append(title);
  card.append(heading);
  if (article.thumbnail) {
    const imageLink = link();
    const image = document.createElement('img');
    image.src = article.thumbnail;
    image.alt = article.title;
    image.loading = 'lazy';
    imageLink.append(image);
    card.append(imageLink);
  }
  const description = document.createElement('p');
  description.className = 'description';
  const parsed = document.createElement('template');
  parsed.innerHTML = article.description;
  description.textContent = (parsed.content.textContent ?? '').replace('続きをみる', '');
  const time = document.createElement('time');
  const date = new Date(article.publishedAt);
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const part = (name: string) => parts.find(p => p.type === name)?.value ?? '';
  time.dateTime = `${part('year')}-${part('month')}-${part('day')}`;
  time.textContent = `${part('year')}年${part('month')}月${part('day')}日`;
  card.append(description, time);
  return card;
}

export async function refreshArticles(section: HTMLElement): Promise<void> {
  const source = section.dataset.articleSource;
  if (!source) return;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(source, { signal: controller.signal, credentials: 'omit' });
    if (!response.ok) throw new Error(`Article fetch failed: ${response.status}`);
    const articles = validateArticles(await response.json());
    const cards = document.createDocumentFragment();
    for (const article of articles) cards.append(articleElement(article));
    // Keep the static list intact until the full replacement is ready.
    section.querySelectorAll(':scope > article').forEach(card => card.remove());
    section.append(cards);
  } catch {
    // Network or data failures leave the server-rendered fallback visible.
  } finally {
    clearTimeout(timeout);
  }
}

if (typeof document !== 'undefined') {
  const section = document.querySelector<HTMLElement>('[data-article-source]');
  if (section) void refreshArticles(section);
}
