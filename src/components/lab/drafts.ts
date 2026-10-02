// Drafts (spec D9.9, R20): unsaved work lives in localStorage under
// `pixel-lab:<kind>:<name>`, with the site version it started from. Every
// access is wrapped in try/catch: storage can be missing, blocked or full,
// and the editor then works without drafts.

export interface Draft {
  /** The site version (a hash of its canonical source) the draft started from, or 'new' for a document the site doesn't have. */
  version: string;
  /** When it was last saved, in ms since the epoch. */
  saved: number;
  doc: unknown;
}

const PREFIX = 'pixel-lab:';

/** Whether this browser saves drafts. */
export function storageWorks(): boolean {
  try {
    const probe = `${PREFIX}probe`;
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function readDraft(key: string): Draft | null {
  try {
    const text = localStorage.getItem(PREFIX + key);
    if (!text) return null;
    const draft = JSON.parse(text);
    const ok = draft && typeof draft.version === 'string' && typeof draft.saved === 'number' && typeof draft.doc === 'object' && draft.doc !== null;
    return ok ? draft : null;
  } catch {
    return null;
  }
}

/** Saves a draft, and says whether it was saved. */
export function writeDraft(key: string, draft: Draft): boolean {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function removeDraft(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // Nothing was saved, so there's nothing to remove.
  }
}

/** "just now", "1 min ago", "2 hr ago": how long ago a draft was saved. */
export function ago(saved: number, now: number): string {
  const minutes = Math.floor((now - saved) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours} hr ago` : `${Math.floor(hours / 24)} d ago`;
}

/** Every stored draft's key, such as `scene:hero-island` or `object:rock`, in code-point order. */
export function draftKeys(): string[] {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && /^pixel-lab:(?:scene|object):/.test(key)) keys.push(key.slice(PREFIX.length));
    }
    return keys.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  } catch {
    return [];
  }
}
