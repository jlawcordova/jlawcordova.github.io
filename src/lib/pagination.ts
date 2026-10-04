// The pages' entry point for pagination. The logic is in paginate.mjs, plain
// JavaScript so the Node tests can import it.
export { paginate, pagePath } from './paginate.mjs';
export type { Page } from './paginate.mjs';
