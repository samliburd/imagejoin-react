import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps, RefObject } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ImageCanvas from './ImageCanvas';
import { createMockCanvasContext, createMockImageItem } from '../../test/fixtures';

const createCanvasRef = (): RefObject<HTMLCanvasElement | null> =>
  ({ current: null }) as RefObject<HTMLCanvasElement | null>;

const createMockBitmap = (label = 'bmp') =>
  ({ label, close: vi.fn() }) as unknown as ImageBitmap & { close: ReturnType<typeof vi.fn> };

function renderImageCanvas(overrides: Partial<ComponentProps<typeof ImageCanvas>> = {}) {
  const props: ComponentProps<typeof ImageCanvas> = {
    canvasRef: createCanvasRef(),
    images: [],
    orientation: 'portrait',
    sizeMode: 'largest',
    alignment: 'center',
    customWidth: '',
    columns: 2,
    gap: 0,
    padding: 0,
    backgroundColor: 'transparent',
    exportFormat: 'image/jpeg',
    quality: 0.92,
    canvasSize: { width: 0, height: 0 },
    setCanvasSize: vi.fn(),
    ...overrides,
  };
  return { ...render(<ImageCanvas {...props} />), props };
}

describe('ImageCanvas', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockImplementation(async () => createMockBitmap()),
    );
  });

  it('clears the canvas, hides container, and resets canvasSize when images is empty', () => {
    const { ctx } = createMockCanvasContext();
    const setCanvasSize = vi.fn();

    const { container } = renderImageCanvas({ setCanvasSize });

    expect(container.querySelector('#canvasContainer')).toHaveClass('hidden');
    expect(ctx.clearRect).toHaveBeenCalledTimes(1);
    expect(setCanvasSize).toHaveBeenCalledWith({ width: 0, height: 0 });
  });

  it('resamples images in parallel, paints background color, and closes each ImageBitmap', async () => {
    const { ctx } = createMockCanvasContext();
    const bmp1 = createMockBitmap('bmp1');
    const bmp2 = createMockBitmap('bmp2');
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValueOnce(bmp1).mockResolvedValueOnce(bmp2),
    );

    const setCanvasSize = vi.fn();
    const canvasRef = createCanvasRef();
    const img1 = createMockImageItem({ width: 100, height: 50 });
    const img2 = createMockImageItem({ width: 400, height: 300 });

    const { container } = renderImageCanvas({
      canvasRef,
      images: [img1, img2],
      backgroundColor: '#ffffff',
      setCanvasSize,
      canvasSize: { width: 400, height: 500 },
    });

    expect(container.querySelector('#canvasContainer')).not.toHaveClass('hidden');
    expect(container.querySelector('#canvas')).not.toHaveClass('checkerboard');
    expect(setCanvasSize).toHaveBeenCalledWith({ width: 400, height: 500 });

    await waitFor(() => {
      expect(ctx.drawImage).toHaveBeenCalledTimes(2);
    });
    expect(ctx.fillStyle).toBe('#ffffff');
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 400, 500);
    expect(ctx.drawImage).toHaveBeenNthCalledWith(1, bmp1, 0, 0);
    expect(ctx.drawImage).toHaveBeenNthCalledWith(2, bmp2, 0, 200);
    expect(bmp1.close).toHaveBeenCalledTimes(1);
    expect(bmp2.close).toHaveBeenCalledTimes(1);
  });

  it('applies rotation and horizontal flip canvas transforms and draws checkerboard when transparent', async () => {
    const { ctx } = createMockCanvasContext();
    const bmp = createMockBitmap('rotated');
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bmp));

    const img = createMockImageItem({ width: 400, height: 200, rotation: 90, flipH: true });
    const { container } = renderImageCanvas({
      images: [img],
      backgroundColor: 'transparent',
      canvasSize: { width: 200, height: 400 },
    });

    expect(container.querySelector('#canvas')).toHaveClass('checkerboard');

    await waitFor(() => {
      expect(ctx.drawImage).toHaveBeenCalledTimes(1);
    });
    expect(ctx.save).toHaveBeenCalledTimes(1);
    expect(ctx.translate).toHaveBeenCalledWith(100, 200);
    expect(ctx.rotate).toHaveBeenCalledWith(Math.PI / 2);
    expect(ctx.scale).toHaveBeenCalledWith(-1, 1);
    expect(ctx.drawImage).toHaveBeenCalledWith(bmp, -200, -100);
    expect(ctx.restore).toHaveBeenCalledTimes(1);
    expect(bmp.close).toHaveBeenCalledTimes(1);
  });

  it('displays dimensions, estimated size, browser-limit warning, and toggles preview zoom', async () => {
    const user = userEvent.setup();
    createMockCanvasContext();
    const img = createMockImageItem({ width: 1000, height: 1000 });

    const { container } = renderImageCanvas({
      images: [img],
      customWidth: '17000',
      canvasSize: { width: 17000, height: 17000 },
    });

    expect(screen.getByText(/17000 × 17000 px/)).toBeInTheDocument();
    expect(
      screen.getByText(/Output exceeds typical browser canvas limits/i),
    ).toBeInTheDocument();
    expect(window.dataLayer).toContainEqual({
      event: 'canvas_limit_warning',
      canvas_width: 17000,
      canvas_height: 17000,
      image_count: 1,
      orientation: 'portrait',
      is_debug_mode: true,
    });

    const viewport = container.querySelector('.canvas-viewport');
    expect(viewport).toHaveClass('fit-size');

    const zoomBtn = screen.getByRole('button', { name: '100% Zoom' });
    await user.click(zoomBtn);
    expect(viewport).toHaveClass('actual-size');
    expect(screen.getByRole('button', { name: 'Fit View' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(window.dataLayer).toContainEqual({
      event: 'canvas_zoom_toggle',
      zoom_mode: 'actual',
      canvas_width: 17000,
      canvas_height: 17000,
      is_debug_mode: true,
    });
  });

  it('falls back to high-smoothing ctx.drawImage when createImageBitmap rejects', async () => {
    const { ctx } = createMockCanvasContext();
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new DOMException('Unsupported')));
    const img1 = createMockImageItem({ width: 200, height: 100 });

    renderImageCanvas({ images: [img1] });

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

    const img1 = createMockImageItem({ width: 200, height: 100 });
    const img2 = createMockImageItem({ width: 300, height: 150 });

    const { rerender, props } = renderImageCanvas({ images: [img1] });
    rerender(<ImageCanvas {...props} images={[img2]} />);

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
