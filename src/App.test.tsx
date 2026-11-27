import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { createMockCanvasContext } from './test/fixtures';

function installMockImage() {
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
}

describe('App', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockImplementation(async () => ({ close: vi.fn() }) as unknown as ImageBitmap),
    );
  });

  it('renders header with Help modal trigger, controls, and hidden empty canvas', async () => {
    const user = userEvent.setup();
    createMockCanvasContext();
    const { container } = render(<App />);

    expect(screen.getByRole('heading', { name: 'Image Join' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download image' })).toBeDisabled();
    expect(container.querySelector('#canvasContainer')).toHaveClass('hidden');

    await user.click(screen.getByRole('button', { name: 'Open help and keyboard shortcuts' }));
    expect(container.querySelector('#helpDialog')).toHaveAttribute('open');
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(container.querySelector('#helpDialog')).not.toHaveAttribute('open');
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

  it('supports upload, paste, drag-drop, rotate/remove, copy to clipboard, and multi-format download', async () => {
    const user = userEvent.setup();
    const { toBlobSpy } = createMockCanvasContext();

    let urlCounter = 0;
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:obj-${++urlCounter}`);
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    installMockImage();

    const clipboardWrite = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      writable: true,
      configurable: true,
      value: { write: clipboardWrite },
    });
    class MockClipboardItem {
      items: Record<string, Blob>;
      constructor(items: Record<string, Blob>) {
        this.items = items;
      }
    }
    vi.stubGlobal('ClipboardItem', MockClipboardItem);

    const downloads: Array<{ name: string; href: string }> = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloads.push({ name: this.download, href: this.href });
    });

    const { container } = render(<App />);
    const fileInput = container.querySelector('#upload') as HTMLInputElement;

    // 1. Initial upload (2 files)
    await user.upload(fileInput, [
      new File(['1'], 'top.png', { type: 'image/png' }),
      new File(['2'], 'bottom.png', { type: 'image/png' }),
    ]);

    await waitFor(() => {
      expect(screen.getByText('2 images selected')).toBeInTheDocument();
    });

    // 2. Paste appends a 3rd image
    const pasteEvent = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(pasteEvent, 'clipboardData', {
      value: { files: [new File(['3'], 'pasted.png', { type: 'image/png' })] },
    });
    window.dispatchEvent(pasteEvent);

    await waitFor(() => {
      expect(screen.getByText('3 images selected')).toBeInTheDocument();
    });

    // 3. Drag-and-drop onto app-shell appends a 4th image
    const shell = container.querySelector('.app-shell') as HTMLElement;
    fireEvent.drop(shell, {
      dataTransfer: {
        types: ['Files'],
        files: [new File(['4'], 'dropped.png', { type: 'image/png' })],
      },
    });

    await waitFor(() => {
      expect(screen.getByText('4 images selected')).toBeInTheDocument();
    });

    // 4. Rotate and remove one image -> revokes removed blob URL
    await user.click(screen.getByRole('button', { name: 'Rotate top.png 90 degrees' }));
    await user.click(screen.getByRole('button', { name: 'Remove pasted.png' }));
    expect(screen.getByText('3 images selected')).toBeInTheDocument();
    expect(revokeSpy).toHaveBeenCalledWith('blob:obj-3');

    // 5. Copy to clipboard works and surfaces live status
    await user.click(screen.getByRole('button', { name: 'Copy' }));
    await waitFor(() => {
      expect(clipboardWrite).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText('Copied')).toBeInTheDocument();

    // 6. Export in PNG format updates file extension
    await user.selectOptions(screen.getByLabelText('Format:'), 'image/png');
    await user.type(screen.getByLabelText('Filename:'), '  my-collage  ');
    await user.click(screen.getByRole('button', { name: 'Download image' }));

    expect(toBlobSpy).toHaveBeenCalledWith(expect.any(Function), 'image/png', undefined);
    expect(downloads.at(-1)?.name).toBe('my-collage.png');
  });
});
