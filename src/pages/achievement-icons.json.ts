import type { APIRoute } from 'astro';
import { iconCatalog } from '../lib/achievement-icons.mjs';

// Read by the accomplishments skill to pick an icon by meaning, so the skill
// never hard-codes the list.
export const GET: APIRoute = () =>
  new Response(`${JSON.stringify(iconCatalog(), null, 2)}\n`, {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
