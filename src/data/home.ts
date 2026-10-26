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

/**
 * The hero's and the Range's copy. The components render it, and the Ask
 * bot's knowledge file (src/lib/ask-knowledge.mjs) reads the same strings.
 * `accent` is the part of the title set in the accent color.
 */
export const heroCopy = {
  title: 'I take software from estimate',
  accent: 'to production.',
  lede: 'Senior developer and tech lead in Davao City. I lead full-stack teams, design data platforms on Microsoft Fabric, and run releases with sign-offs and rollback.',
};

export const rangeCopy = {
  title: 'Many hats.',
  accent: 'One craftsman.',
  lede: 'These are the disciplines I work in, from Figma designs to production releases. I set up AI workflows that plan, build and check each change before it ships.',
};
