// Pixel-art scene. How to edit it: .claude/skills/pixel-art/SKILL.md
export default {
  output: 'range-sprite.svg',
  viewBox: [-51, -9, 103, 72],
  origin: [0, 7],
  items: [
    { object: 'island-shadow', at: { px: [32, 55] } },
    { object: 'island-shadow', at: { px: [-32, 55] } },
    { object: 'island-shadow', at: { px: [16, 63] } },
    { object: 'island-shadow', at: { px: [-16, 63] } },
    { object: 'tile', at: { tile: [0, 0, 0] } },
    { object: 'tile', at: { tile: [1, 0, 0] } },
    { object: 'tile', at: { tile: [0, 1, 0] } },
    { object: 'block-right', at: { tile: [2, 0, 0] } },
    { object: 'tile', at: { tile: [1, 1, 0] } },
    { object: 'block-left', at: { tile: [0, 2, 0] } },
    { object: 'block-right', at: { tile: [2, 1, 0] } },
    { object: 'block-left', at: { tile: [1, 2, 0] } },
    { object: 'block', at: { tile: [2, 2, 0] } },
    { object: 'tree', at: { tile: [2, 0, 0] } },
    { object: 'flower-pink', at: { px: [13, 12] } },
    { object: 'flower', at: { px: [-21, 13] } },
    { object: 'flower', at: { px: [-33, 26] } },
    { object: 'flower-gold', at: { px: [19, 35] } },
    { object: 'flower-pink', at: { px: [5, 40] } },
    { object: 'flower-gold', at: { px: [-17, 37] } },
    {
      group: { 'data-class': '0' },
      items: [
        { object: 'outfit-front-end', at: { px: [-24, -6] } },
      ],
    },
    {
      group: { 'data-class': '1' },
      items: [
        { object: 'outfit-back-end', at: { px: [-24, -6] } },
      ],
    },
    {
      group: { 'data-class': '2' },
      items: [
        { object: 'outfit-ux-design', at: { px: [-24, -6] } },
      ],
    },
    {
      group: { 'data-class': '3' },
      items: [
        { object: 'outfit-cloud-devops', at: { px: [-24, -6] } },
      ],
    },
    {
      group: { 'data-class': '4' },
      items: [
        { object: 'outfit-data-engineering', at: { px: [-24, -6] } },
      ],
    },
    {
      group: { 'data-class': '5' },
      items: [
        { object: 'outfit-security-governance', at: { px: [-24, -6] } },
      ],
    },
    {
      group: { 'data-class': '6' },
      items: [
        { object: 'outfit-project-management', at: { px: [-24, -6] } },
      ],
    },
  ],
};
