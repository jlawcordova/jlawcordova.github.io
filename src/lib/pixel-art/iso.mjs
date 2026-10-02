// @ts-check
// The isometric grid (pixel-art engine spec D4): 2:1 dimetric, 32×16 tiles,
// 16-pixel levels. Grid positions only; block faces come with the block kind.

export const TILE_W = 32;
export const TILE_H = 16;
export const LEVEL_H = 16;

/**
 * The top-face center of the tile at [col, row, level], in scene pixels.
 * `origin` is where tile [0, 0, 0] sits.
 * @param {number[]} tile
 * @param {number[]} origin
 * @returns {[number, number]}
 */
export function tileToPx([col, row, level], [ox, oy]) {
  return [(col - row) * (TILE_W / 2) + ox, (col + row) * (TILE_H / 2) - level * LEVEL_H + oy];
}
