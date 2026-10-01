import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const posts = defineCollection({
  loader: glob({
    pattern: '*.md',
    base: './src/content/posts',
    // Keep the filename as-is (the default lowercases it); post URLs are
    // derived from it and must match the old Jekyll URLs exactly.
    generateId: ({ entry }) => entry.replace(/\.md$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    tags: z.string().optional(),
    categories: z.string(),
    'featured-image': z.string(),
    'featured-image-alt': z.string(),
    description: z.string().optional(),
  }),
});

export const collections = { posts };
