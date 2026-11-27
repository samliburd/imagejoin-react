import { render, waitFor } from '@testing-library/react';
import type { RefObject } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ImageCanvas from './ImageCanvas';
import { createMockCanvasContext, createMockImageItem } from '../../test/fixtures';

const createCanvasRef = (): RefObject<HTMLCanvasElement | null> =>
  ({ current: null }) as RefObject<HTMLCanvasElement | null>;

const createMockBitmap = (label = 'bmp') =>
  ({ label, close: vi.fn() }) as unknown as ImageBitmap & { close: ReturnType<typeof vi.fn> };

describe('ImageCanvas', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockImplementation(async () => createMockBitmap()),
    );
  });

  it('clears the canvas, hides container, and resets canvasWidth when images is empty', () => {
    const { ctx } = createMockCanvasContext();
    const setCanvasWidth = vi.fn();
    const canvasRef = createCanvasRef();

    const { container } = render(
      <ImageCanvas
        canvasRef={canvasRef}
        images={[]}
        orientation="portrait"
        scaleToLargest={true}
        customWidth=""
        setCanvasWidth={setCanvasWidth}
      />,
    );

    expect(container.querySelector('#canvasContainer')).toHaveClass('hidden');
    expect(ctx.clearRect).toHaveBeenCalledTimes(1);
    expect(setCanvasWidth).toHaveBeenCalledWith(0);
  });

  it('resamples images in parallel, draws them in order, and closes each ImageBitmap', async () => {
    const { ctx } = createMockCanvasContext();
    const bmp1 = createMockBitmap('bmp1');
    const bmp2 = createMockBitmap('bmp2');
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValueOnce(bmp1).mockResolvedValueOnce(bmp2),
    );

    const setCanvasWidth = vi.fn();
    const canvasRef = createCanvasRef();
    const img1 = createMockImageItem({ width: 100, height: 50 });
    const img2 = createMockImageItem({ width: 400, height: 300 });

    const { container } = render(
      <ImageCanvas
        canvasRef={canvasRef}
        images={[img1, img2]}
        orientation="portrait"
        scaleToLargest={true}
        customWidth=""
        setCanvasWidth={setCanvasWidth}
      />,
    );

    expect(container.querySelector('#canvasContainer')).not.toHaveClass('hidden');
    expect(canvasRef.current!.width).toBe(400);
    expect(canvasRef.current!.height).toBe(500);
    expect(setCanvasWidth).toHaveBeenCalledWith(400);

    await waitFor(() => {
      expect(ctx.drawImage).toHaveBeenCalledTimes(2);
    });
    expect(createImageBitmap).toHaveBeenNthCalledWith(1, img1.imgElement, {
      resizeWidth: 400,
      resizeHeight: 200,
      resizeQuality: 'high',
    });
    expect(createImageBitmap).toHaveBeenNthCalledWith(2, img2.imgElement, {
      resizeWidth: 400,
      resizeHeight: 300,
      resizeQuality: 'high',
    });
    expect(ctx.drawImage).toHaveBeenNthCalledWith(1, bmp1, 0, 0);
    expect(ctx.drawImage).toHaveBeenNthCalledWith(2, bmp2, 0, 200);
    expect(bmp1.close).toHaveBeenCalledTimes(1);
    expect(bmp2.close).toHaveBeenCalledTimes(1);
  });

  it('rounds fractional resize dimensions before calling createImageBitmap', async () => {
    const { ctx } = createMockCanvasContext();
    const canvasRef = createCanvasRef();
    const img1 = createMockImageItem({ width: 300, height: 200 });

    render(
      <ImageCanvas
        canvasRef={canvasRef}
        images={[img1]}
        orientation="portrait"
        scaleToLargest={true}
        customWidth="500"
        setCanvasWidth={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(ctx.drawImage).toHaveBeenCalledTimes(1);
    });
    expect(createImageBitmap).toHaveBeenCalledWith(img1.imgElement, {
      resizeWidth: 500,
      resizeHeight: 333,
      resizeQuality: 'high',
    });
  });

  it('falls back to high-smoothing ctx.drawImage when createImageBitmap rejects', async () => {
    const { ctx } = createMockCanvasContext();
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new DOMException('Unsupported')));
    const canvasRef = createCanvasRef();
    const img1 = createMockImageItem({ width: 200, height: 100 });

    render(
      <ImageCanvas
        canvasRef={canvasRef}
        images={[img1]}
        orientation="portrait"
        scaleToLargest={true}
        customWidth=""
        setCanvasWidth={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(ctx.drawImage).toHaveBeenCalledWith(img1.imgElement, 0, 0, 200, 100);
    });
    expect(ctx.imageSmoothingEnabled).toBe(true);
    expect(ctx.imageSmoothingQuality).toBe('high');
  });

  it('closes stale bitmaps and skips drawing when isActive cancels mid-render', async () => {
    const { ctx } = createMockCanvasContext();
    const staleBitmap = createMockBitmap('stale');
    const freshBitmap = createMockBitmap('fresh');

    let resolveStale!: (value: ImageBitmap) => void;
    const stalePromise = new Promise<ImageBitmap>((resolve) => {
      resolveStale = resolve;
    });

    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockReturnValueOnce(stalePromise).mockResolvedValueOnce(freshBitmap),
    );

    const canvasRef = createCanvasRef();
    const img1 = createMockImageItem({ width: 200, height: 100 });
    const img2 = createMockImageItem({ width: 300, height: 150 });

    const { rerender } = render(
      <ImageCanvas
        canvasRef={canvasRef}
        images={[img1]}
        orientation="portrait"
        scaleToLargest={true}
        customWidth=""
        setCanvasWidth={vi.fn()}
      />,
    );

    rerender(
      <ImageCanvas
        canvasRef={canvasRef}
        images={[img2]}
        orientation="portrait"
        scaleToLargest={true}
        customWidth=""
        setCanvasWidth={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(ctx.drawImage).toHaveBeenCalledWith(freshBitmap, 0, 0);
    });

    resolveStale(staleBitmap);
    await waitFor(() => {
      expect(staleBitmap.close).toHaveBeenCalledTimes(1);
    });

    expect(ctx.drawImage).not.toHaveBeenCalledWith(staleBitmap, expect.anything(), expect.anything());
    expect(freshBitmap.close).toHaveBeenCalledTimes(1);
  });
});
