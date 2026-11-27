import { describe, expect, it } from 'vitest';
import { computeCanvasLayout } from './canvasLayout';
import { createMockImageItem } from '../test/fixtures';

describe('computeCanvasLayout', () => {
  it('returns zeroed dimensions and an empty drawQueue when images is empty', () => {
    expect(computeCanvasLayout([], 'portrait', true, '')).toEqual({
      width: 0,
      height: 0,
      drawQueue: [],
    });
  });

  it('computes portrait layout scaled to largest or smallest width', () => {
    const img1 = createMockImageItem({ width: 100, height: 50 });
    const img2 = createMockImageItem({ width: 400, height: 300 });

    const largest = computeCanvasLayout([img1, img2], 'portrait', true, '');
    expect(largest.width).toBe(400);
    expect(largest.height).toBe(500);
    expect(largest.drawQueue).toEqual([
      { img: img1.imgElement, x: 0, y: 0, w: 400, h: 200 },
      { img: img2.imgElement, x: 0, y: 200, w: 400, h: 300 },
    ]);

    const smallest = computeCanvasLayout([img1, img2], 'portrait', false, '');
    expect(smallest.width).toBe(100);
    expect(smallest.height).toBe(125);
    expect(smallest.drawQueue).toEqual([
      { img: img1.imgElement, x: 0, y: 0, w: 100, h: 50 },
      { img: img2.imgElement, x: 0, y: 50, w: 100, h: 75 },
    ]);
  });

  it('computes portrait layout with a custom width override', () => {
    const img1 = createMockImageItem({ width: 300, height: 200 });
    const layout = computeCanvasLayout([img1], 'portrait', true, '600');

    expect(layout.width).toBe(600);
    expect(layout.height).toBe(400);
    expect(layout.drawQueue[0]).toMatchObject({ x: 0, y: 0, w: 600, h: 400 });
  });

  it('computes landscape layout in auto mode for largest and smallest heights', () => {
    const img1 = createMockImageItem({ width: 100, height: 100 });
    const img2 = createMockImageItem({ width: 400, height: 200 });

    const largest = computeCanvasLayout([img1, img2], 'landscape', true, '');
    expect(largest.width).toBe(600);
    expect(largest.height).toBe(200);
    expect(largest.drawQueue).toEqual([
      { img: img1.imgElement, x: 0, y: 0, w: 200, h: 200 },
      { img: img2.imgElement, x: 200, y: 0, w: 400, h: 200 },
    ]);

    const smallest = computeCanvasLayout([img1, img2], 'landscape', false, '');
    expect(smallest.width).toBe(300);
    expect(smallest.height).toBe(100);
    expect(smallest.drawQueue).toEqual([
      { img: img1.imgElement, x: 0, y: 0, w: 100, h: 100 },
      { img: img2.imgElement, x: 100, y: 0, w: 200, h: 100 },
    ]);
  });

  it('computes landscape height via aspect-ratio summation when customWidth is active', () => {
    const img1 = createMockImageItem({ width: 200, height: 100 });
    const img2 = createMockImageItem({ width: 100, height: 100 });

    const layout = computeCanvasLayout([img1, img2], 'landscape', true, '1200');
    expect(layout.width).toBe(1200);
    expect(layout.height).toBe(400);
    expect(layout.drawQueue).toEqual([
      { img: img1.imgElement, x: 0, y: 0, w: 800, h: 400 },
      { img: img2.imgElement, x: 800, y: 0, w: 400, h: 400 },
    ]);
  });

  it('ignores non-positive or non-numeric customWidth strings', () => {
    const img1 = createMockImageItem({ width: 250, height: 100 });
    for (const invalid of ['0', '-50', 'abc']) {
      const layout = computeCanvasLayout([img1], 'portrait', true, invalid);
      expect(layout.width).toBe(250);
    }
  });
});
