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
    {
      group: { 'data-setting': 'grass' },
      items: [
        {
          group: { class: 'enter', 'data-enter': 'ground', 'data-row': '0' },
          items: [
            { object: 'block', at: { tile: [0, 0, 0] } },
            { object: 'block', at: { tile: [1, 0, 0] } },
            { object: 'block-right', at: { tile: [2, 0, 0] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'ground', 'data-row': '1' },
          items: [
            { object: 'block', at: { tile: [0, 1, 0] } },
            { object: 'block', at: { tile: [1, 1, 0] } },
            { object: 'block-right', at: { tile: [2, 1, 0] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'ground', 'data-row': '2' },
          items: [
            { object: 'block-left', at: { tile: [0, 2, 0] } },
            { object: 'block-left', at: { tile: [1, 2, 0] } },
            { object: 'block', at: { tile: [2, 2, 0] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'object', 'data-x': '32' },
          items: [
            { object: 'tree', at: { tile: [2, 0, 0] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'object', 'data-x': '14' },
          items: [
            { object: 'flower-pink', at: { px: [13, 12] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'object', 'data-x': '-20' },
          items: [
            { object: 'flower', at: { px: [-21, 13] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'object', 'data-x': '-32' },
          items: [
            { object: 'flower', at: { px: [-33, 26] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'object', 'data-x': '20' },
          items: [
            { object: 'flower-gold', at: { px: [19, 35] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'object', 'data-x': '6' },
          items: [
            { object: 'flower-pink', at: { px: [5, 40] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'object', 'data-x': '-16' },
          items: [
            { object: 'flower-gold', at: { px: [-17, 37] } },
          ],
        },
      ],
    },
    {
      group: { 'data-class': '0' },
      items: [
        {
          group: { class: 'enter', 'data-enter': 'object', 'data-x': '0' },
          items: [
            { object: 'outfit-front-end', at: { tile: [1, 1, 0] } },
          ],
        },
      ],
    },
    {
      group: { 'data-class': '1' },
      items: [
        {
          group: { class: 'enter', 'data-enter': 'object', 'data-x': '0' },
          items: [
            { object: 'outfit-back-end', at: { tile: [1, 1, 0] } },
          ],
        },
      ],
    },
    {
      group: { 'data-class': '2' },
      items: [
        {
          group: { class: 'enter', 'data-enter': 'object', 'data-x': '0' },
          items: [
            { object: 'outfit-ux-design', at: { tile: [1, 1, 0] } },
          ],
        },
      ],
    },
    {
      group: { 'data-class': '3' },
      items: [
        {
          group: { class: 'enter', 'data-enter': 'object', 'data-x': '0' },
          items: [
            { object: 'outfit-cloud-devops', at: { tile: [1, 1, 0] } },
          ],
        },
      ],
    },
    {
      group: { 'data-class': '4' },
      items: [
        {
          group: { class: 'enter', 'data-enter': 'object', 'data-x': '0' },
          items: [
            { object: 'outfit-data-engineering', at: { tile: [1, 1, 0] } },
          ],
        },
      ],
    },
    {
      group: { 'data-class': '5' },
      items: [
        {
          group: { class: 'enter', 'data-enter': 'object', 'data-x': '0' },
          items: [
            { object: 'outfit-security-governance', at: { tile: [1, 1, 0] } },
          ],
        },
      ],
    },
    {
      group: { 'data-class': '6' },
      items: [
        {
          group: { class: 'enter', 'data-enter': 'object', 'data-x': '0' },
          items: [
            { object: 'outfit-project-management', at: { tile: [1, 1, 0] } },
          ],
        },
      ],
    },
  ],
};
