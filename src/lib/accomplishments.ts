// The pages' entry point for accomplishments. The logic is in
// accomplishment-list.mjs, plain JavaScript so the Node tests can import it.
import data from '../data/accomplishments.json';
import { readAccomplishments, type Accomplishments } from './accomplishment-list.mjs';

export {
  HOME_DONE_COUNT,
  formatDateRange,
  homeSelection,
  isHttpUrl,
  linkLabel,
  rowFor,
} from './accomplishment-list.mjs';
export type {
  Accomplishment,
  Accomplishments,
  DoneAccomplishment,
  HomeSelection,
  LockedAccomplishment,
  Row,
} from './accomplishment-list.mjs';

/**
 * Written by scripts/fetch-accomplishments.mjs, which already sorts newest
 * first: done (newest month first) and locked (newest createdAt first).
 */
export function getAccomplishments(): Accomplishments {
  return readAccomplishments(data);
}
