// Pixel-art scene. How to edit it: .claude/skills/pixel-art/SKILL.md
export default {
  output: 'hero-island.svg',
  viewBox: [-100, -84, 225, 212],
  origin: [0, 8],
  items: [
    { group: { class: 'enter', 'data-enter': 'shadow' }, items: [
      { object: 'island-shadow', at: { px: [80, 80] } },
      { object: 'island-shadow', at: { px: [-80, 80] } },
      { object: 'island-shadow', at: { px: [64, 88] } },
      { object: 'island-shadow', at: { px: [-64, 88] } },
      { object: 'island-shadow', at: { px: [48, 96] } },
      { object: 'island-shadow', at: { px: [-48, 96] } },
      { object: 'island-shadow', at: { px: [32, 104] } },
      { object: 'island-shadow', at: { px: [-32, 104] } },
      { object: 'island-shadow', at: { px: [16, 112] } },
      { object: 'island-shadow', at: { px: [-16, 112] } },
      { object: 'island-shadow', at: { px: [0, 120] } },
    ] },
    { group: { class: 'enter', 'data-enter': 'ground', 'data-row': '0' }, items: [
      { object: 'block', at: { tile: [0, 0, 0] } },
      { object: 'block', at: { tile: [1, 0, 0] } },
      { object: 'block-road', at: { tile: [2, 0, 0] } },
      { object: 'path', at: { tile: [2, 0, 0] } },
      { object: 'block', at: { tile: [3, 0, 0] } },
      { object: 'block', at: { tile: [4, 0, 0] } },
      { object: 'block-right', at: { tile: [5, 0, 0] } },
    ] },
    { group: { class: 'enter', 'data-enter': 'ground', 'data-row': '1' }, items: [
      { object: 'block', at: { tile: [0, 1, 0] } },
      { object: 'block', at: { tile: [1, 1, 0] } },
      { object: 'block-road', at: { tile: [2, 1, 0] } },
      { object: 'path', at: { tile: [2, 1, 0] } },
      { object: 'block', at: { tile: [3, 1, 0] } },
      { object: 'block', at: { tile: [4, 1, 0] } },
      { object: 'block-right', at: { tile: [5, 1, 0] } },
    ] },
    { group: { class: 'enter', 'data-enter': 'ground', 'data-row': '2' }, items: [
      { object: 'block', at: { tile: [0, 2, 0] } },
      { object: 'block', at: { tile: [1, 2, 0] } },
      { object: 'block-road', at: { tile: [2, 2, 0] } },
      { object: 'path', at: { tile: [2, 2, 0] } },
      { object: 'block', at: { tile: [3, 2, 0] } },
      { object: 'block', at: { tile: [4, 2, 0] } },
      { object: 'block-right', at: { tile: [5, 2, 0] } },
    ] },
    { group: { class: 'enter', 'data-enter': 'ground', 'data-row': '3' }, items: [
      { object: 'block', at: { tile: [0, 3, 0] } },
      { object: 'block-river', at: { tile: [1, 3, 0] } },
      { object: 'river', at: { tile: [1, 3, 0] } },
      { object: 'block-river', at: { tile: [2, 3, 0] } },
      { object: 'river', at: { tile: [2, 3, 0] } },
      { object: 'block-river', at: { tile: [3, 3, 0] } },
      { object: 'river', at: { tile: [3, 3, 0] } },
      { object: 'block-river', at: { tile: [4, 3, 0] } },
      { object: 'river', at: { tile: [4, 3, 0] } },
      { object: 'block-river', at: { tile: [5, 3, 0] } },
      { object: 'river', at: { tile: [5, 3, 0] } },
      { object: 'waterfall-face', at: { tile: [5, 3, 0] } },
    ] },
    { group: { class: 'enter', 'data-enter': 'ground', 'data-row': '4' }, items: [
      { object: 'block', at: { tile: [0, 4, 0] } },
      { object: 'block', at: { tile: [1, 4, 0] } },
      { object: 'block-road', at: { tile: [2, 4, 0] } },
      { object: 'path', at: { tile: [2, 4, 0] } },
      { object: 'block', at: { tile: [3, 4, 0] } },
      { object: 'block', at: { tile: [4, 4, 0] } },
      { object: 'block-right', at: { tile: [5, 4, 0] } },
    ] },
    { group: { class: 'enter', 'data-enter': 'ground', 'data-row': '5' }, items: [
      { object: 'block-left', at: { tile: [0, 5, 0] } },
      { object: 'block-left', at: { tile: [1, 5, 0] } },
      { object: 'block-road', at: { tile: [2, 5, 0] } },
      { object: 'path', at: { tile: [2, 5, 0] } },
      { object: 'block-left', at: { tile: [3, 5, 0] } },
      { object: 'block-left', at: { tile: [4, 5, 0] } },
      { object: 'block', at: { tile: [5, 5, 0] } },
    ] },
    { group: { class: 'enter', 'data-enter': 'object', 'data-x': '-16' }, items: [
      { object: 'bridge', at: { tile: [2, 3, 0] } },
    ] },
    { group: { class: 'enter', 'data-enter': 'object', 'data-x': '-57' }, items: [
      { object: 'house', at: { px: [-59, 59] } },
    ] },
    { group: { class: 'enter', 'data-enter': 'object', 'data-x': '0' }, items: [
      { object: 'tree-shade', at: { px: [-1, 19] } },
    ] },
    { group: { class: 'enter', 'data-enter': 'object', 'data-x': '-24' }, items: [
      { object: 'tree-shade', at: { px: [-25, 29] } },
    ] },
    { group: { class: 'enter', 'data-enter': 'object', 'data-x': '57' }, items: [
      { object: 'tree-shade', at: { px: [55, 38] } },
    ] },
    { group: { class: 'enter', 'data-enter': 'object', 'data-x': '0' }, items: [
      { object: 'tree-small', at: { px: [-1, 19] } },
    ] },
    { group: { class: 'enter', 'data-enter': 'object', 'data-x': '-23' }, items: [
      { object: 'pine', at: { px: [-25, 20] } },
    ] },
    { group: { class: 'enter', 'data-enter': 'object', 'data-x': '-24' }, items: [
      { object: 'tree-small', at: { px: [-25, 29] } },
    ] },
    { group: { class: 'enter', 'data-enter': 'object', 'data-x': '57' }, items: [
      { object: 'pine', at: { px: [55, 38] } },
    ] },
    { group: { class: 'enter', 'data-enter': 'object', 'data-x': '42' }, items: [
      { object: 'flag', at: { px: [37, 73] } },
      { object: 'truck', class: 'itruck it1', at: { px: [31, 6] } },
      { object: 'truck-green', class: 'itruck it2', at: { px: [31, 6] } },
    ] },
    { group: { class: 'enter', 'data-enter': 'object', 'data-x': '-16' }, items: [
      { object: 'bridge-rail', at: { tile: [2, 3, 0] } },
    ] },
    { group: { class: 'enter', 'data-enter': 'object', 'data-x': '27' }, items: [
      { object: 'boxes', at: { px: [32, 62] } },
    ] },
    { group: { class: 'enter', 'data-enter': 'object', 'data-x': '60' }, items: [
      { object: 'crane-mast', at: { px: [59, 59] } },
      { object: 'crane-jib', at: { px: [56, 19] } },
    ] },
    { group: { class: 'enter', 'data-enter': 'object', 'data-x': '-12' }, items: [
      { object: 'tree-small', at: { px: [-13, 73] } },
    ] },
    { group: { class: 'enter', 'data-enter': 'object', 'data-x': '-28' }, items: [
      { object: 'pine', at: { px: [-30, 78] } },
    ] },
    { group: { class: 'enter', 'data-enter': 'object', 'data-x': '1' }, items: [
      { object: 'pine', at: { px: [-1, 80] } },
    ] },
    { group: { class: 'enter', 'data-enter': 'object', 'data-x': '0' }, items: [
      { object: 'tree-small', at: { px: [-1, 90] } },
    ] },
    { group: { class: 'enter', 'data-enter': 'object', 'data-x': '60' }, items: [
      { object: 'crane-box', at: { px: [24, 17] } },
    ] },
    { group: { class: 'enter', 'data-enter': 'sky' }, items: [
      { object: 'cloud-a', class: 'pcloud pc0', at: { px: [-85, -60] } },
      { object: 'cloud-b', class: 'pcloud pc1', at: { px: [38, -80] } },
      { object: 'cloud-c', class: 'pcloud pc2', at: { px: [85, -38] } },
    ] },
  ],
};
