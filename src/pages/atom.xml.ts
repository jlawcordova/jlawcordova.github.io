import type { APIRoute } from 'astro';
import { getPosts, toXmlSchema } from '../lib/posts';
import { site } from '../site';

const escapeXml = (value: string) =>
  value.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);

export const GET: APIRoute = async () => {
  const posts = await getPosts();

  const entries = posts
    .map(
      (post) => `
 <entry>
   <title>${escapeXml(post.title)}</title>
   <link href="${site.url}${post.url}"/>
   <updated>${toXmlSchema(post.date)}</updated>
   <id>${site.url}${post.url}</id>
   <content type="html">${escapeXml(post.entry.rendered?.html ?? '')}</content>
 </entry>`,
    )
    .join('');

  const body = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">

 <title>${escapeXml(site.title)}</title>
 <link href="${site.url}/atom.xml" rel="self"/>
 <link href="${site.url}/"/>
 <updated>${new Date().toISOString()}</updated>
 <id>${site.url}/</id>
 <author>
   <name>${escapeXml(site.author.name)}</name>
   <email>${site.author.email}</email>
 </author>
${entries}

</feed>
`;

  return new Response(body, { headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' } });
};
