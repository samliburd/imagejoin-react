import { describe, expect, it, vi } from 'vitest';
import {
  filterImageFiles,
  generateThumbnail,
  loadImage,
  loadImageFiles,
  revokeImageUrls,
} from './imageLoader';
import { createMockCanvasContext, createMockImageItem } from '../test/fixtures';

describe('imageLoader', () => {
  it('filters image files by MIME type or filename extension', () => {
    const files = [
      new File(['1'], 'photo.png', { type: 'image/png' }),
      new File(['2'], 'notes.txt', { type: 'text/plain' }),
      new File(['3'], 'fallback.webp', { type: '' }),
    ];

    expect(filterImageFiles(files).map((f) => f.name)).toEqual(['photo.png', 'fallback.webp']);
  });

  it('downscales thumbnails to maxWidth without upscaling smaller images', () => {
    const { ctx, toDataURLSpy } = createMockCanvasContext('data:image/jpeg;base64,thumb');

    const largeImg = new Image();
    Object.defineProperty(largeImg, 'width', { value: 400, configurable: true });
    Object.defineProperty(largeImg, 'height', { value: 200, configurable: true });

    expect(generateThumbnail(largeImg, 100)).toBe('data:image/jpeg;base64,thumb');
    expect(ctx.drawImage).toHaveBeenCalledWith(largeImg, 0, 0, 100, 50);
    expect(toDataURLSpy).toHaveBeenCalledWith('image/jpeg', 0.5);

    const smallImg = new Image();
    Object.defineProperty(smallImg, 'width', { value: 60, configurable: true });
    Object.defineProperty(smallImg, 'height', { value: 40, configurable: true });

    generateThumbnail(smallImg, 100);
    expect(ctx.drawImage).toHaveBeenLastCalledWith(smallImg, 0, 0, 60, 40);
  });

  it('falls back to img.src when 2d context is unavailable', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const img = new Image();
    img.src = 'blob:fallback-src';

    expect(generateThumbnail(img, 100)).toBe('blob:fallback-src');
  });

  it('returns empty array when loadImageFiles receives no valid images and revokes URLs on failure', async () => {
    expect(await loadImageFiles([new File(['x'], 'doc.pdf', { type: 'application/pdf' })])).toEqual(
      [],
    );

    createMockCanvasContext('data:image/jpeg;base64,thumb');
    let urlIdx = 0;
    const createSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockImplementation(() => `blob:batch-${++urlIdx}`);
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    class FailingSecondImage {
      width = 300;
      height = 150;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      set src(val: string) {
        queueMicrotask(() => {
          if (val === 'blob:batch-2') {
            this.onerror?.();
          } else {
            this.onload?.();
          }
        });
      }
    }

    vi.stubGlobal('Image', FailingSecondImage);

    const files = [
      new File(['a'], 'ok.png', { type: 'image/png' }),
      new File(['b'], 'broken.png', { type: 'image/png' }),
    ];

    await expect(loadImageFiles(files)).rejects.toThrow('Failed to load: broken.png');
    expect(createSpy).toHaveBeenCalledTimes(2);
    expect(revokeSpy).toHaveBeenCalledWith('blob:batch-1');
    expect(revokeSpy).toHaveBeenCalledWith('blob:batch-2');
  });

  it('loads a single image source via loadImage with default rotation and flipH', async () => {
    createMockCanvasContext('data:image/jpeg;base64,single-thumb');

    class OkImage {
      width = 200;
      height = 100;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      set src(_val: string) {
        queueMicrotask(() => this.onload?.());
      }
    }

    vi.stubGlobal('Image', OkImage);
    const item = await loadImage('testimg/1.webp', '1.webp');
    expect(item).toMatchObject({
      src: 'testimg/1.webp',
      thumbnailSrc: 'data:image/jpeg;base64,single-thumb',
      originalName: '1.webp',
      width: 200,
      height: 100,
      rotation: 0,
      flipH: false,
    });
  });

  it('revokes only blob: URLs in revokeImageUrls', () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const blobItem = createMockImageItem({ src: 'blob:user-1' });
    const fixtureItem = createMockImageItem({ src: 'testimg/1.webp' });

    revokeImageUrls([blobItem, fixtureItem]);

    expect(revokeSpy).toHaveBeenCalledTimes(1);
    expect(revokeSpy).toHaveBeenCalledWith('blob:user-1');
  });
});
