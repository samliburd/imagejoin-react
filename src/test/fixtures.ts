import { vi } from 'vitest';
import type { ImageItem, Rotation } from '../types';

export interface MockImageItemOptions {
  id?: string;
  src?: string;
  thumbnailSrc?: string;
  originalName?: string;
  width?: number;
  height?: number;
  rotation?: Rotation;
  flipH?: boolean;
}

let idCounter = 0;

/**
 * Creates a deterministic ImageItem with an HTMLImageElement whose width/height
 * match the requested natural dimensions.
 */
export function createMockImageItem(options: MockImageItemOptions = {}): ImageItem {
  idCounter += 1;
  const id = options.id ?? `img-${idCounter}`;
  const width = options.width ?? 200;
  const height = options.height ?? 100;
  const originalName = options.originalName ?? `${id}.png`;
  const src = options.src ?? `blob:mock-${id}`;
  const thumbnailSrc = options.thumbnailSrc ?? `data:image/jpeg;base64,thumb-${id}`;

  const imgElement = new Image();
  Object.defineProperty(imgElement, 'width', { value: width, configurable: true });
  Object.defineProperty(imgElement, 'height', { value: height, configurable: true });
  imgElement.src = src;

  return {
    id,
    src,
    thumbnailSrc,
    originalName,
    width,
    height,
    imgElement,
    rotation: options.rotation ?? 0,
    flipH: options.flipH ?? false,
  };
}

export interface MockCanvasContext {
  clearRect: ReturnType<typeof vi.fn>;
  fillRect: ReturnType<typeof vi.fn>;
  drawImage: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  restore: ReturnType<typeof vi.fn>;
  translate: ReturnType<typeof vi.fn>;
  rotate: ReturnType<typeof vi.fn>;
  scale: ReturnType<typeof vi.fn>;
  fillStyle: string;
  imageSmoothingEnabled: boolean;
  imageSmoothingQuality: ImageSmoothingQuality;
}

/**
 * Installs spies on HTMLCanvasElement.prototype.getContext, toDataURL, and toBlob
 * so canvas rendering and export can be asserted deterministically in jsdom.
 */
export function createMockCanvasContext(dataUrl = 'data:image/jpeg;base64,mockJoinedImage') {
  const ctx: MockCanvasContext = {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    fillStyle: '',
    imageSmoothingEnabled: false,
    imageSmoothingQuality: 'low',
  };

  const getContextSpy = vi
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue(ctx as unknown as CanvasRenderingContext2D);

  const toDataURLSpy = vi
    .spyOn(HTMLCanvasElement.prototype, 'toDataURL')
    .mockReturnValue(dataUrl);

  const toBlobSpy = vi
    .spyOn(HTMLCanvasElement.prototype, 'toBlob')
    .mockImplementation((callback: BlobCallback, type?: string) => {
      callback(new Blob(['mock-image'], { type: type ?? 'image/jpeg' }));
    });

  return { ctx, getContextSpy, toDataURLSpy, toBlobSpy };
}

/**
 * Mocks window.matchMedia with mutable state and supports triggering change listeners.
 */
export function mockMatchMedia(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  const mql = {
    get matches() {
      return matches;
    },
    media: '(max-width: 600px)',
    onchange: null,
    addEventListener: vi.fn((event: string, listener: EventListenerOrEventListenerObject) => {
      if (event === 'change' && typeof listener === 'function') {
        listeners.add(listener as (event: MediaQueryListEvent) => void);
      }
    }),
    removeEventListener: vi.fn((event: string, listener: EventListenerOrEventListenerObject) => {
      if (event === 'change' && typeof listener === 'function') {
        listeners.delete(listener as (event: MediaQueryListEvent) => void);
      }
    }),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue(mql),
  });

  return {
    mql,
    setMatches(next: boolean) {
      matches = next;
      const event = { matches: next, media: mql.media } as MediaQueryListEvent;
      listeners.forEach((listener) => listener(event));
    },
  };
}
