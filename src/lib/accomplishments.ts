import data from '../data/accomplishments.json';

export interface Accomplishment {
  rkey: string;
  title: string;
  description: string;
  /** YYYY-MM */
  startDate: string;
  /** YYYY-MM */
  endDate?: string;
  tags: string[];
  /** http(s) URLs only. */
  links: string[];
}

export interface Accomplishments {
  /** "unavailable" when the build couldn't reach the AT Protocol repo. */
  status: 'ok' | 'unavailable';
  items: Accomplishment[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Written by scripts/fetch-accomplishments.mjs, which already sorts newest first. */
export function getAccomplishments(): Accomplishments {
  const raw = data as { status?: string; items?: unknown };
  if (raw.status !== 'ok' || !Array.isArray(raw.items)) return { status: 'unavailable', items: [] };
  const items = (raw.items as Accomplishment[]).map((item) => ({
    ...item,
    tags: item.tags ?? [],
    // The fetch script filters links too; this guards against a hand-edited file.
    links: (item.links ?? []).filter(isHttpUrl),
  }));
  return { status: 'ok', items };
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** "2026-09" → "Sep 2026". */
function formatMonth(month: string): string {
  const [year, m] = month.split('-');
  return `${MONTHS[Number(m) - 1]} ${year}`;
}

/** "Sep 2026", or "Mar 2025 – Sep 2026" when the end month differs. */
export function formatDateRange({ startDate, endDate }: Pick<Accomplishment, 'startDate' | 'endDate'>): string {
  const start = formatMonth(startDate);
  return endDate && endDate !== startDate ? `${start} – ${formatMonth(endDate)}` : start;
}

/** Short link text: the host, without "www.". */
export function linkLabel(url: string): string {
  return new URL(url).hostname.replace(/^www\./, '');
}
