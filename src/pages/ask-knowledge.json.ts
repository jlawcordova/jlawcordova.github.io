import type { APIRoute } from 'astro';
import profile from '../../docs/references/profile.md?raw';
import accomplishments from '../data/accomplishments.json';
import { heroCopy, rangeClasses, rangeCopy } from '../data/home';
import { buildKnowledge, problems } from '../lib/ask-knowledge.mjs';
import { getPosts } from '../lib/posts';
import { site } from '../site';

// The Ask bot's knowledge (ask bot spec, "The knowledge file"): only the
// sources ask-knowledge.mjs allowlists. The Worker fetches it from the live
// site and caches it.
export const GET: APIRoute = async () => {
  const posts = (await getPosts()).map((post) => ({
    title: post.title,
    date: post.date.toISOString().slice(0, 10),
    description: post.description,
    path: post.url,
    body: post.entry.body ?? '',
  }));
  const knowledge = buildKnowledge({
    home: { hero: heroCopy, range: rangeCopy, classes: rangeClasses, contact: site.author.linkedin },
    profile,
    posts,
    accomplishments,
    perPage: site.accomplishmentsPerPage,
    generatedAt: new Date().toISOString(),
  });
  const json = `${JSON.stringify(knowledge, null, 2)}\n`;
  // Checked here too, so the deploy build fails on the real accomplishments,
  // which CI fetches after npm test has run on the placeholder.
  const found = problems(json);
  if (found.length) throw new Error(`ask-knowledge.json: ${found.join('; ')}`);
  return new Response(json, {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
};
