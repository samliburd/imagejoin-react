import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FileControls from './FileControls';
import { createMockCanvasContext, createMockImageItem } from '../../test/fixtures';

function renderFileControls(overrides: Partial<ComponentProps<typeof FileControls>> = {}) {
  const props: ComponentProps<typeof FileControls> = {
    images: [],
    onReplaceImages: vi.fn(),
    orientation: 'portrait',
    setOrientation: vi.fn(),
    scaleToLargest: true,
    setScaleToLargest: vi.fn(),
    filename: '',
    setFilename: vi.fn(),
    onDownload: vi.fn(),
    debug: false,
    customWidth: '',
    setCustomWidth: vi.fn(),
    canvasWidth: 0,
    ...overrides,
  };
  return { ...render(<FileControls {...props} />), props };
}

describe('FileControls', () => {
  beforeEach(() => {
    window.dataLayer = [];
  });

  it('renders initial empty state with disabled download button and hidden debug control', () => {
    const { container } = renderFileControls();

    expect(screen.getByText('No files chosen')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Auto')).toBeInTheDocument();

    const downloadBtn = screen.getByRole('button', { name: 'Download image' });
    expect(downloadBtn).toBeDisabled();
    expect(downloadBtn).toHaveClass('disabled');
    expect(container.querySelector('#debugContainer')).not.toBeInTheDocument();
  });

  it('shows singular/plural file counts, debug toggle when debug=true, and canvasWidth placeholder', () => {
    const img1 = createMockImageItem({ width: 800, height: 600 });
    const { container, rerender, props } = renderFileControls({
      images: [img1],
      canvasWidth: 800,
      debug: true,
    });

    expect(screen.getByText('1 image selected')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('800')).toBeInTheDocument();
    expect(container.querySelector('#debugContainer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download image' })).toBeEnabled();

    rerender(<FileControls {...props} images={[img1, createMockImageItem()]} />);
    expect(screen.getByText('2 images selected')).toBeInTheDocument();
  });

  it('buffers customWidth input until Enter or Go and syncs when parent customWidth changes', async () => {
    const user = userEvent.setup();
    const setCustomWidth = vi.fn();
    const { container, rerender, props } = renderFileControls({ setCustomWidth, customWidth: '' });

    const widthInput = container.querySelector('#customWidth') as HTMLInputElement;
    const scaleCheckbox = screen.getByLabelText('Resize to largest image') as HTMLInputElement;
    const checkboxContainer = scaleCheckbox.closest('.checkboxContainer') as HTMLElement;

    expect(scaleCheckbox).toBeEnabled();
    expect(checkboxContainer).toHaveStyle({ opacity: '1' });

    await user.type(widthInput, '1080');
    expect(setCustomWidth).not.toHaveBeenCalled();
    expect(scaleCheckbox).toBeDisabled();
    expect(checkboxContainer).toHaveStyle({ opacity: '0.5' });

    await user.click(screen.getByRole('button', { name: 'Go' }));
    expect(setCustomWidth).toHaveBeenCalledWith('1080');

    setCustomWidth.mockClear();
    await user.clear(widthInput);
    await user.type(widthInput, '720{Enter}');
    expect(setCustomWidth).toHaveBeenCalledWith('720');

    rerender(<FileControls {...props} customWidth="1280" />);
    expect(widthInput.value).toBe('1280');
  });

  it('reverts invalid customWidth values and clears customWidth when Go is clicked with empty input', async () => {
    const user = userEvent.setup();
    const setCustomWidth = vi.fn();
    const { container } = renderFileControls({ setCustomWidth, customWidth: '640' });

    const widthInput = container.querySelector('#customWidth') as HTMLInputElement;
    expect(widthInput.value).toBe('640');

    fireEvent.change(widthInput, { target: { value: '-50' } });
    await user.click(screen.getByRole('button', { name: 'Go' }));
    expect(setCustomWidth).not.toHaveBeenCalled();
    expect(widthInput.value).toBe('640');

    fireEvent.change(widthInput, { target: { value: '0' } });
    fireEvent.keyDown(widthInput, { key: 'Enter' });
    expect(setCustomWidth).not.toHaveBeenCalled();
    expect(widthInput.value).toBe('640');

    await user.clear(widthInput);
    await user.click(screen.getByRole('button', { name: 'Go' }));
    expect(setCustomWidth).toHaveBeenCalledWith('');
  });

  it('reflects active orientation via aria-pressed/.active and pushes GTM dataLayer events', async () => {
    const user = userEvent.setup();
    const setOrientation = vi.fn();
    renderFileControls({ orientation: 'portrait', setOrientation });

    const portraitBtn = screen.getByRole('button', { name: 'Portrait (vertical stack)' });
    const landscapeBtn = screen.getByRole('button', { name: 'Landscape (horizontal row)' });

    expect(portraitBtn).toHaveAttribute('aria-pressed', 'true');
    expect(portraitBtn).toHaveClass('active');
    expect(landscapeBtn).toHaveAttribute('aria-pressed', 'false');
    expect(landscapeBtn).not.toHaveClass('active');

    await user.click(landscapeBtn);
    expect(setOrientation).toHaveBeenCalledWith('landscape');
    expect(window.dataLayer).toContainEqual({
      event: 'orientation_change',
      selected_orientation: 'landscape',
    });
  });

  it('ingests uploaded files via Object URLs, generates 100px JPEG thumbnails, and resets file input', async () => {
    const user = userEvent.setup();
    const onReplaceImages = vi.fn();
    const { ctx, toDataURLSpy } = createMockCanvasContext('data:image/jpeg;base64,thumb-output');

    let urlCount = 0;
    const createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockImplementation(() => `blob:upload-${++urlCount}`);

    class MockImage {
      width = 400;
      height = 200;
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

    const { container } = renderFileControls({ onReplaceImages });
    const fileInput = container.querySelector('#upload') as HTMLInputElement;
    const file1 = new File(['abc'], 'first.png', { type: 'image/png' });
    const file2 = new File(['def'], 'second.jpg', { type: 'image/jpeg' });

    await user.upload(fileInput, [file1, file2]);

    await waitFor(() => {
      expect(onReplaceImages).toHaveBeenCalledTimes(1);
    });

    expect(createObjectURLSpy).toHaveBeenCalledTimes(2);
    const loaded = onReplaceImages.mock.calls[0][0];
    expect(loaded).toHaveLength(2);
    expect(loaded[0]).toMatchObject({
      originalName: 'first.png',
      src: 'blob:upload-1',
      thumbnailSrc: 'data:image/jpeg;base64,thumb-output',
      width: 400,
      height: 200,
    });
    expect(loaded[1]).toMatchObject({
      originalName: 'second.jpg',
      src: 'blob:upload-2',
    });
    expect(ctx.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 100, 50);
    expect(toDataURLSpy).toHaveBeenCalledWith('image/jpeg', 0.5);
    expect(fileInput.value).toBe('');
  });

  it('updates filename and triggers onDownload when images are loaded', async () => {
    const user = userEvent.setup();
    const setFilename = vi.fn();
    const onDownload = vi.fn();
    renderFileControls({
      images: [createMockImageItem()],
      setFilename,
      onDownload,
    });

    await user.type(screen.getByLabelText('Filename:'), 'merged');
    expect(setFilename).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Download image' }));
    expect(onDownload).toHaveBeenCalledTimes(1);
  });
});
