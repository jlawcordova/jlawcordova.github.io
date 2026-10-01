import { site } from '../site';
import type { Post } from './posts';

/** Splits posts into blog pages: /blog/ is page 1, then /blog/page2/, /blog/page3/, ... */
export function paginate(posts: Post[]) {
  const totalPages = Math.max(1, Math.ceil(posts.length / site.postsPerPage));
  return Array.from({ length: totalPages }, (_, i) => ({
    page: i + 1,
    totalPages,
    totalPosts: posts.length,
    posts: posts.slice(i * site.postsPerPage, (i + 1) * site.postsPerPage),
  }));
}
