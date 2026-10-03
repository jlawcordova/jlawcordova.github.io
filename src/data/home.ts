/**
 * Range carousel classes, in order. Entry i matches the sprite variant
 * <g data-class="i"> in src/assets/pixel-art/range-sprite.svg. `shadow` is
 * the nameplate's hard shadow: the outfit's main color in the mock.
 */
export const rangeClasses = [
  { name: 'Front-end', shadow: '#6F8F55' },
  { name: 'Cloud & DevOps', shadow: '#D8B66A' },
  { name: 'UX Design', shadow: '#9E3B4B' },
  { name: 'Data Engineering', shadow: '#5F8C7E' },
  { name: 'Security & Governance', shadow: '#858F99' },
  { name: 'Project Management', shadow: '#3E4A2A' },
] as const;
