import { getCollection, type CollectionEntry } from 'astro:content';

export interface Post {
  entry: CollectionEntry<'posts'>;
  title: string;
  description?: string;
  /** Display label, e.g. "architecture" or "year in review". */
  category: string;
  /** Route path without leading/trailing slashes, e.g. "api/2022/01/08/mocking-apis-with-prism". */
  path: string;
  url: string;
  date: Date;
  featuredImage: string;
  featuredImageAlt: string;
}

const FILENAME = /^(\d{4})-(\d{2})-(\d{2})-(.+)$/;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function toPost(entry: CollectionEntry<'posts'>): Post {
  const match = FILENAME.exec(entry.id);
  if (!match) {
    throw new Error(`Post "${entry.id}" must be named YYYY-MM-DD-title.md`);
  }
  const [, year, month, day, slug] = match;
  // Same scheme as Jekyll's "pretty" permalinks: /:categories/:year/:month/:day/:title/.
  // Jekyll splits the categories string on whitespace, so "year in review"
  // becomes /year/in/review/.
  const categorySegments = [...new Set(entry.data.categories.toLowerCase().split(/\s+/))];
  const path = [...categorySegments, year, month, day, slug].join('/');

  return {
    entry,
    title: entry.data.title,
    description: entry.data.description,
    category: entry.data.categories,
    path,
    url: `/${path}/`,
    date: new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))),
    featuredImage: entry.data['featured-image'],
    featuredImageAlt: entry.data['featured-image-alt'],
  };
}

/** All posts, newest first. */
export async function getPosts(): Promise<Post[]> {
  const entries = await getCollection('posts');
  return entries.map(toPost).sort((a, b) => b.date.getTime() - a.date.getTime());
}

/** "08 Jan 2022", matching Jekyll's date_to_string. */
export function formatDate(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${day} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** "2022-01-08T00:00:00+00:00", matching Jekyll's date_to_xmlschema. */
export function toXmlSchema(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, '+00:00');
}
