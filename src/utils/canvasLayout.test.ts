import { describe, expect, it } from 'vitest';
import { computeCanvasLayout, getEffectiveDimensions } from './canvasLayout';
import { createMockImageItem } from '../test/fixtures';
import type { LayoutOptions } from '../types';

const baseOptions: LayoutOptions = {
  orientation: 'portrait',
  sizeMode: 'largest',
  alignment: 'center',
  customWidth: '',
  columns: 2,
  gap: 0,
  padding: 0,
};

describe('computeCanvasLayout', () => {
  it('returns zeroed dimensions and empty drawQueue when images is empty', () => {
    expect(computeCanvasLayout([], baseOptions)).toEqual({
      width: 0,
      height: 0,
      drawQueue: [],
      exceedsLimits: false,
    });
  });

  it('computes portrait layout scaled to largest or smallest width with gap and padding', () => {
    const img1 = createMockImageItem({ width: 100, height: 50 });
    const img2 = createMockImageItem({ width: 400, height: 300 });

    const largest = computeCanvasLayout([img1, img2], {
      ...baseOptions,
      orientation: 'portrait',
      sizeMode: 'largest',
      gap: 20,
      padding: 10,
    });
    expect(largest.width).toBe(420);
    expect(largest.height).toBe(540);
    expect(largest.drawQueue[0]).toMatchObject({ x: 10, y: 10, w: 400, h: 200 });
    expect(largest.drawQueue[1]).toMatchObject({ x: 10, y: 230, w: 400, h: 300 });

    const smallest = computeCanvasLayout([img1, img2], {
      ...baseOptions,
      orientation: 'portrait',
      sizeMode: 'smallest',
    });
    expect(smallest.width).toBe(100);
    expect(smallest.height).toBe(125);
  });

  it('supports original sizeMode with start, center, and end alignment', () => {
    const img1 = createMockImageItem({ width: 100, height: 50 });
    const img2 = createMockImageItem({ width: 300, height: 100 });

    const centered = computeCanvasLayout([img1, img2], {
      ...baseOptions,
      orientation: 'portrait',
      sizeMode: 'original',
      alignment: 'center',
    });
    expect(centered.width).toBe(300);
    expect(centered.height).toBe(150);
    expect(centered.drawQueue[0]).toMatchObject({ x: 100, y: 0, w: 100, h: 50 });

    const endAligned = computeCanvasLayout([img1, img2], {
      ...baseOptions,
      orientation: 'portrait',
      sizeMode: 'original',
      alignment: 'end',
    });
    expect(endAligned.drawQueue[0]).toMatchObject({ x: 200, y: 0, w: 100, h: 50 });
  });

  it('computes landscape layout with customWidth, gap, and padding via aspect-ratio summation', () => {
    const img1 = createMockImageItem({ width: 200, height: 100 });
    const img2 = createMockImageItem({ width: 100, height: 100 });

    // totalWidth = 1240, padding = 10 -> 1220, gap = 20 -> 1200 content width / aspectSum 3 = 400 height
    const layout = computeCanvasLayout([img1, img2], {
      ...baseOptions,
      orientation: 'landscape',
      customWidth: '1240',
      gap: 20,
      padding: 10,
    });

    expect(layout.width).toBe(1240);
    expect(layout.height).toBe(420);
    expect(layout.drawQueue[0]).toMatchObject({ x: 10, y: 10, w: 800, h: 400 });
    expect(layout.drawQueue[1]).toMatchObject({ x: 830, y: 10, w: 400, h: 400 });
  });

  it('computes multi-column grid layout with row alignment, gap, and padding', () => {
    const img1 = createMockImageItem({ width: 200, height: 100 });
    const img2 = createMockImageItem({ width: 200, height: 200 });
    const img3 = createMockImageItem({ width: 200, height: 100 });

    const grid = computeCanvasLayout([img1, img2, img3], {
      ...baseOptions,
      orientation: 'grid',
      columns: 2,
      gap: 10,
      padding: 5,
      alignment: 'center',
    });

    // colsUsed=2, cellWidth=200 -> width = 2*200 + 10 + 10 = 420
    // row1 height=200 (img1 h=100 centered -> y=5 + 50=55; img2 h=200 -> y=5)
    // row2 height=100 (y=5 + 200 + 10 = 215) -> total height = 215 + 100 + 5 = 320
    expect(grid.width).toBe(420);
    expect(grid.height).toBe(320);
    expect(grid.drawQueue[0]).toMatchObject({ x: 5, y: 55, w: 200, h: 100 });
    expect(grid.drawQueue[1]).toMatchObject({ x: 215, y: 5, w: 200, h: 200 });
    expect(grid.drawQueue[2]).toMatchObject({ x: 5, y: 215, w: 200, h: 100 });
  });

  it('accounts for 90 and 270 degree rotation when computing effective dimensions and drawSizes', () => {
    const rotated = createMockImageItem({ width: 400, height: 200, rotation: 90, flipH: true });
    expect(getEffectiveDimensions(rotated)).toEqual({ width: 200, height: 400 });

    const layout = computeCanvasLayout([rotated], {
      ...baseOptions,
      orientation: 'portrait',
    });
    expect(layout.width).toBe(200);
    expect(layout.height).toBe(400);
    expect(layout.drawQueue[0]).toMatchObject({
      w: 200,
      h: 400,
      drawW: 400,
      drawH: 200,
      rotation: 90,
      flipH: true,
    });
  });

  it('flags exceedsLimits when dimensions surpass 16,384 px or 268 MP', () => {
    const huge = createMockImageItem({ width: 1000, height: 1000 });
    const overLimit = computeCanvasLayout([huge], {
      ...baseOptions,
      customWidth: '17000',
    });
    expect(overLimit.exceedsLimits).toBe(true);

    const safe = computeCanvasLayout([huge], {
      ...baseOptions,
      customWidth: '2000',
    });
    expect(safe.exceedsLimits).toBe(false);
  });
});
