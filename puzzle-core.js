(function (root) {
  'use strict';
  const GRID = 40, ROWS = 52, WIDTH = 600, HEIGHT = 780;
  function tileRect(index, width = WIDTH, height = HEIGHT) {
    if (!Number.isInteger(index) || index < 0 || index >= GRID * ROWS) throw new RangeError('Invalid tile');
    const col = index % GRID, row = Math.floor(index / GRID);
    return {x: col * width / GRID, y: row * height / ROWS, width: width / GRID, height: height / ROWS};
  }
  function alignment(points, width, height, adjust = {}) {
    const [left, right, chin] = points.map(([x,y]) => [x * width, y * height]);
    const cx = (left[0] + right[0]) / 2, cy = (left[1] + right[1]) / 2;
    const angle = -Math.atan2(right[1] - left[1], right[0] - left[0]);
    const distance = (chin[0] - cx) * Math.sin(angle) + (chin[1] - cy) * Math.cos(angle);
    if (right[0] <= left[0] || Math.hypot(right[0]-left[0],right[1]-left[1]) < width*.04 || distance < height*.06) throw new Error('Mark again: image-left pupil, image-right pupil, then the bottom of the chin.');
    return {cx, cy, angle: angle + (adjust.angle || 0) * Math.PI / 180, scale: 260 / distance * (adjust.zoom || 1), x: 300 + (adjust.x || 0), y: 340 + (adjust.y || 0)};
  }
  const api = {GRID, ROWS, COUNT: GRID * ROWS, WIDTH, HEIGHT, tileRect, alignment};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PuzzleCore = api;
})(typeof window === 'undefined' ? globalThis : window);
