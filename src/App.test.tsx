import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { createMockCanvasContext } from './test/fixtures';

vi.mock('@vercel/analytics/react', () => ({
  Analytics: () => null,
}));

describe('App', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockImplementation(async () => ({ close: vi.fn() }) as unknown as ImageBitmap),
    );
  });

  it('renders title, controls, and hidden empty canvas by default', () => {
    createMockCanvasContext();
    const { container } = render(<App />);

    expect(screen.getByRole('heading', { name: 'Image Join' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download image' })).toBeDisabled();
    expect(container.querySelector('#canvasContainer')).toHaveClass('hidden');
  });

  it('gates debug controls via ?debug query parameter', () => {
    createMockCanvasContext();

    window.history.replaceState({}, '', '/?debug=false');
    const first = render(<App />);
    expect(first.container.querySelector('#debugContainer')).not.toBeInTheDocument();
    first.unmount();

    window.history.replaceState({}, '', '/?debug=true');
    const second = render(<App />);
    expect(second.container.querySelector('#debugContainer')).toBeInTheDocument();
  });

  it('completes upload, revokes stale Object URLs on replace, and exports via toBlob with toDataURL fallback', async () => {
    const user = userEvent.setup();
    const { toDataURLSpy, toBlobSpy } = createMockCanvasContext(
      'data:image/jpeg;base64,fallbackComposite',
    );

    let urlCounter = 0;
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:obj-${++urlCounter}`);
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    class MockImage {
      width = 400;
      height = 300;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      private _src = '';

      get src() {
        return this._src;
      }

      set src(val: string) {
        this._src = val;
        queueMicrotask(() => {
          this.onload?.();
        });
      }
    }

    vi.stubGlobal('Image', MockImage);

    const downloads: Array<{ name: string; href: string }> = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloads.push({ name: this.download, href: this.href });
    });

    const { container } = render(<App />);
    const fileInput = container.querySelector('#upload') as HTMLInputElement;
    const firstBatch = [
      new File(['1'], 'top.png', { type: 'image/png' }),
      new File(['2'], 'bottom.png', { type: 'image/png' }),
    ];

    await user.upload(fileInput, firstBatch);

    await waitFor(() => {
      expect(screen.getByText('2 images selected')).toBeInTheDocument();
    });

    expect(container.querySelector('#canvasContainer')).not.toHaveClass('hidden');
    expect(container.querySelector('#customWidth')).toHaveAttribute('placeholder', '400');

    const downloadBtn = screen.getByRole('button', { name: 'Download image' });
    expect(downloadBtn).toBeEnabled();

    // Primary export uses canvas.toBlob + Object URL
    await user.click(downloadBtn);
    expect(toBlobSpy).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.92);
    expect(downloads[0]).toEqual({ name: 'joinedimage.jpg', href: 'blob:obj-3' });

    // Custom filename trims whitespace
    await user.type(screen.getByLabelText('Filename:'), '  vacation-collage  ');
    await user.click(downloadBtn);
    expect(downloads[1]).toEqual({ name: 'vacation-collage.jpg', href: 'blob:obj-4' });

    // Fallback to toDataURL when toBlob returns null
    toBlobSpy.mockImplementationOnce((cb: BlobCallback) => cb(null));
    await user.click(downloadBtn);
    expect(toDataURLSpy).toHaveBeenCalledWith('image/jpeg', 0.92);
    expect(downloads[2]).toEqual({
      name: 'vacation-collage.jpg',
      href: 'data:image/jpeg;base64,fallbackComposite',
    });

    // Uploading a replacement batch revokes the previous batch's blob URLs
    await user.upload(fileInput, [new File(['3'], 'single.png', { type: 'image/png' })]);
    await waitFor(() => {
      expect(screen.getByText('1 image selected')).toBeInTheDocument();
    });
    expect(revokeSpy).toHaveBeenCalledWith('blob:obj-1');
    expect(revokeSpy).toHaveBeenCalledWith('blob:obj-2');
  });
});
