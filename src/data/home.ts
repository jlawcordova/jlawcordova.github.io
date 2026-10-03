/**
 * Range carousel classes, in order. Entry i matches the sprite variant
 * <g data-class="i"> in src/assets/pixel-art/range-sprite.svg. `shadow` is
 * the nameplate's hard shadow: the outfit's main color in the mock.
 */
export const rangeClasses = [
  { name: 'Front-end', shadow: '#8A6AA6' },
  { name: 'Back-end', shadow: '#474E5B' },
  { name: 'UX Design', shadow: '#8FB0C9' },
  { name: 'Cloud & DevOps', shadow: '#D8B66A' },
  { name: 'Data Engineering', shadow: '#5F8C7E' },
  { name: 'Security & Governance', shadow: '#858F99' },
  { name: 'Project Management', shadow: '#5B6F8E' },
] as const;
