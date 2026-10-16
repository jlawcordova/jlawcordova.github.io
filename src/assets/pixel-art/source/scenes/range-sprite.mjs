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
          group: { class: 'enter', 'data-enter': 'ground', 'data-row': '0' },
          items: [
            { object: 'block-tower', at: { tile: [0, 0, 0] } },
            { object: 'block-tower', at: { tile: [1, 0, 0] } },
            { object: 'block-tower-right', at: { tile: [2, 0, 0] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'ground', 'data-row': '1' },
          items: [
            { object: 'block-tower', at: { tile: [0, 1, 0] } },
            { object: 'block-tower', at: { tile: [1, 1, 0] } },
            { object: 'block-tower-right', at: { tile: [2, 1, 0] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'ground', 'data-row': '2' },
          items: [
            { object: 'block-tower-left', at: { tile: [0, 2, 0] } },
            { object: 'block-tower-left', at: { tile: [1, 2, 0] } },
            { object: 'block-tower-corner', at: { tile: [2, 2, 0] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'object', 'data-x': '32' },
          items: [
            { object: 'prop-front-end-telescope', at: { tile: [2, 0, 0] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'object', 'data-x': '-32' },
          items: [
            { object: 'prop-front-end-lectern', at: { tile: [0, 2, 0] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'object', 'data-x': '0' },
          items: [
            { object: 'outfit-front-end', at: { tile: [1, 1, 0] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'object', 'data-x': '16' },
          items: [
            { object: 'prop-front-end-crystal-ball', at: { tile: [2, 1, 0] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'object', 'data-x': '-16' },
          items: [
            { object: 'prop-front-end-candles', at: { tile: [1, 2, 0] } },
          ],
        },
      ],
    },
    {
      group: { 'data-class': '1' },
      items: [
        {
          group: { class: 'enter', 'data-enter': 'ground', 'data-row': '0' },
          items: [
            { object: 'block-server', at: { tile: [0, 0, 0] } },
            { object: 'block-server', at: { tile: [1, 0, 0] } },
            { object: 'block-server-right', at: { tile: [2, 0, 0] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'ground', 'data-row': '1' },
          items: [
            { object: 'block-server', at: { tile: [0, 1, 0] } },
            { object: 'block-server', at: { tile: [1, 1, 0] } },
            { object: 'block-server-right', at: { tile: [2, 1, 0] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'ground', 'data-row': '2' },
          items: [
            { object: 'block-server-left', at: { tile: [0, 2, 0] } },
            { object: 'block-server-left', at: { tile: [1, 2, 0] } },
            { object: 'block-server-corner', at: { tile: [2, 2, 0] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'object', 'data-x': '32' },
          items: [
            { object: 'prop-back-end-rack', at: { tile: [2, 0, 0] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'object', 'data-x': '-32' },
          items: [
            { object: 'prop-back-end-network', at: { tile: [0, 2, 0] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'object', 'data-x': '0' },
          items: [
            { object: 'outfit-back-end', at: { tile: [1, 1, 0] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'object', 'data-x': '16' },
          items: [
            { object: 'prop-back-end-mug', at: { tile: [2, 1, 0] } },
          ],
        },
      ],
    },
    {
      group: { 'data-class': '2' },
      items: [
        {
          group: { class: 'enter', 'data-enter': 'ground', 'data-row': '0' },
          items: [
            { object: 'block-studio', at: { tile: [0, 0, 0] } },
            { object: 'block-studio', at: { tile: [1, 0, 0] } },
            { object: 'block-studio-right', at: { tile: [2, 0, 0] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'ground', 'data-row': '1' },
          items: [
            { object: 'block-studio', at: { tile: [0, 1, 0] } },
            { object: 'block-studio', at: { tile: [1, 1, 0] } },
            { object: 'block-studio-right', at: { tile: [2, 1, 0] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'ground', 'data-row': '2' },
          items: [
            { object: 'block-studio-left', at: { tile: [0, 2, 0] } },
            { object: 'block-studio-left', at: { tile: [1, 2, 0] } },
            { object: 'block-studio-corner', at: { tile: [2, 2, 0] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'object', 'data-x': '32' },
          items: [
            { object: 'prop-ux-design-easel', at: { tile: [2, 0, 0] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'object', 'data-x': '-32' },
          items: [
            { object: 'prop-ux-design-cabinet', at: { tile: [0, 2, 0] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'object', 'data-x': '0' },
          items: [
            { object: 'outfit-ux-design', at: { tile: [1, 1, 0] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'object', 'data-x': '16' },
          items: [
            { object: 'prop-ux-design-stool', at: { tile: [2, 1, 0] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'object', 'data-x': '-16' },
          items: [
            { object: 'prop-ux-design-cans', at: { tile: [1, 2, 0] } },
          ],
        },
      ],
    },
    {
      group: { 'data-class': '3' },
      items: [
        {
          group: { class: 'enter', 'data-enter': 'ground', 'data-row': '0' },
          items: [
            { object: 'block-site', at: { tile: [0, 0, 0] } },
            { object: 'block-site', at: { tile: [1, 0, 0] } },
            { object: 'block-site-right', at: { tile: [2, 0, 0] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'ground', 'data-row': '1' },
          items: [
            { object: 'block-site', at: { tile: [0, 1, 0] } },
            { object: 'block-site', at: { tile: [1, 1, 0] } },
            { object: 'block-site-right', at: { tile: [2, 1, 0] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'ground', 'data-row': '2' },
          items: [
            { object: 'block-site-left', at: { tile: [0, 2, 0] } },
            { object: 'block-site-left', at: { tile: [1, 2, 0] } },
            { object: 'block-site-corner', at: { tile: [2, 2, 0] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'object', 'data-x': '25' },
          items: [
            { object: 'cloud-c', class: 'pcloud pc0', at: { px: [14, -9] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'object', 'data-x': '32' },
          items: [
            { object: 'prop-cloud-devops-pipes', at: { tile: [2, 0, 0] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'object', 'data-x': '-32' },
          items: [
            { object: 'prop-cloud-devops-scaffold', at: { tile: [0, 2, 0] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'object', 'data-x': '0' },
          items: [
            { object: 'outfit-cloud-devops', at: { tile: [1, 1, 0] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'object', 'data-x': '-16' },
          items: [
            { object: 'prop-cloud-devops-cone', at: { tile: [1, 2, 0] } },
          ],
        },
      ],
    },
    {
      group: { 'data-class': '4' },
      items: [
        {
          group: { class: 'enter', 'data-enter': 'ground', 'data-row': '0' },
          items: [
            { object: 'block-lab', at: { tile: [0, 0, 0] } },
            { object: 'block-lab', at: { tile: [1, 0, 0] } },
            { object: 'block-lab-right', at: { tile: [2, 0, 0] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'ground', 'data-row': '1' },
          items: [
            { object: 'block-lab', at: { tile: [0, 1, 0] } },
            { object: 'block-lab', at: { tile: [1, 1, 0] } },
            { object: 'block-lab-right', at: { tile: [2, 1, 0] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'ground', 'data-row': '2' },
          items: [
            { object: 'block-lab-left', at: { tile: [0, 2, 0] } },
            { object: 'block-lab-left', at: { tile: [1, 2, 0] } },
            { object: 'block-lab', at: { tile: [2, 2, 0] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'object', 'data-x': '16' },
          items: [
            { object: 'prop-data-engineering-shelf', at: { tile: [1, 0, 0] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'object', 'data-x': '-16' },
          items: [
            { object: 'prop-data-engineering-bench', at: { tile: [0, 1, 0] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'object', 'data-x': '0' },
          items: [
            { object: 'outfit-data-engineering', at: { tile: [1, 1, 0] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'object', 'data-x': '16' },
          items: [
            { object: 'prop-data-engineering-book', at: { tile: [2, 1, 0] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'object', 'data-x': '-16' },
          items: [
            { object: 'prop-data-engineering-cauldron', at: { tile: [1, 2, 0] } },
          ],
        },
      ],
    },
    {
      group: { 'data-class': '5' },
      items: [
        {
          group: { class: 'enter', 'data-enter': 'ground', 'data-row': '0' },
          items: [
            { object: 'block-rampart', at: { tile: [0, 0, 0] } },
            { object: 'block-rampart', at: { tile: [1, 0, 0] } },
            { object: 'block-rampart-right', at: { tile: [2, 0, 0] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'ground', 'data-row': '1' },
          items: [
            { object: 'block-rampart', at: { tile: [0, 1, 0] } },
            { object: 'block-rampart', at: { tile: [1, 1, 0] } },
            { object: 'block-rampart-right', at: { tile: [2, 1, 0] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'ground', 'data-row': '2' },
          items: [
            { object: 'block-rampart-left', at: { tile: [0, 2, 0] } },
            { object: 'block-rampart-left', at: { tile: [1, 2, 0] } },
            { object: 'block-rampart-corner', at: { tile: [2, 2, 0] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'object', 'data-x': '-16' },
          items: [
            { object: 'prop-security-governance-parapet-left', at: { tile: [0, 1, 0] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'object', 'data-x': '16' },
          items: [
            { object: 'prop-security-governance-parapet-right', at: { tile: [1, 0, 0] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'object', 'data-x': '32' },
          items: [
            { object: 'prop-security-governance-banner', at: { tile: [2, 0, 0] } },
          ],
        },
        {
          group: { class: 'enter', 'data-enter': 'object', 'data-x': '-32' },
          items: [
            { object: 'prop-security-governance-brazier', at: { tile: [0, 2, 0] } },
          ],
        },
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
