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
    onAppendImages: vi.fn(),
    orientation: 'portrait',
    setOrientation: vi.fn(),
    columns: 2,
    setColumns: vi.fn(),
    sizeMode: 'largest',
    setSizeMode: vi.fn(),
    alignment: 'center',
    setAlignment: vi.fn(),
    gap: 0,
    setGap: vi.fn(),
    padding: 0,
    setPadding: vi.fn(),
    backgroundColor: 'transparent',
    setBackgroundColor: vi.fn(),
    exportFormat: 'image/jpeg',
    setExportFormat: vi.fn(),
    quality: 0.92,
    setQuality: vi.fn(),
    filename: '',
    setFilename: vi.fn(),
    onDownload: vi.fn(),
    onCopy: vi.fn(),
    copyFeedback: { text: '', state: 'idle' },
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

  it('renders initial empty state with disabled export actions and hidden debug control', () => {
    const { container } = renderFileControls();

    expect(screen.getByText('No files chosen')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Auto')).toBeInTheDocument();
    expect(container.querySelector('#addUpload')).not.toBeInTheDocument();

    const downloadBtn = screen.getByRole('button', { name: 'Download image' });
    const copyBtn = screen.getByRole('button', { name: 'Copy' });
    expect(downloadBtn).toBeDisabled();
    expect(copyBtn).toBeDisabled();
    expect(container.querySelector('#debugContainer')).not.toBeInTheDocument();
  });

  it('shows singular/plural file counts, + Add control, and canvasWidth placeholder', () => {
    const img1 = createMockImageItem({ width: 800, height: 600 });
    const { container, rerender, props } = renderFileControls({
      images: [img1],
      canvasWidth: 800,
      debug: true,
    });

    expect(screen.getByText('1 image selected')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('800')).toBeInTheDocument();
    expect(container.querySelector('#debugContainer')).toBeInTheDocument();
    expect(container.querySelector('#addUpload')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download image' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeEnabled();

    rerender(<FileControls {...props} images={[img1, createMockImageItem()]} />);
    expect(screen.getByText('2 images selected')).toBeInTheDocument();
  });

  it('buffers customWidth input until Enter or Go and disables Sizing while typing', async () => {
    const user = userEvent.setup();
    const setCustomWidth = vi.fn();
    const { container, rerender, props } = renderFileControls({ setCustomWidth, customWidth: '' });

    const widthInput = container.querySelector('#customWidth') as HTMLInputElement;
    const sizeModeSelect = screen.getByLabelText('Sizing:') as HTMLSelectElement;

    expect(sizeModeSelect).toBeEnabled();

    await user.type(widthInput, '1080');
    expect(setCustomWidth).not.toHaveBeenCalled();
    expect(sizeModeSelect).toBeDisabled();
    expect(screen.getByText('Press Enter or click Go to apply width.')).toBeInTheDocument();
    expect(screen.getByText('Disabled while a custom Width is set.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Go' }));
    expect(setCustomWidth).toHaveBeenCalledWith('1080');

    setCustomWidth.mockClear();
    await user.clear(widthInput);
    await user.type(widthInput, '720{Enter}');
    expect(setCustomWidth).toHaveBeenCalledWith('720');

    rerender(<FileControls {...props} customWidth="1280" />);
    expect(widthInput.value).toBe('1280');
    await user.click(screen.getByRole('button', { name: 'Reset width to Auto' }));
    expect(setCustomWidth).toHaveBeenCalledWith('');
  });

  it('reflects active orientation (including Grid + Columns) and pushes GTM dataLayer events', async () => {
    const user = userEvent.setup();
    const setOrientation = vi.fn();
    const setColumns = vi.fn();
    const { rerender, props } = renderFileControls({
      orientation: 'portrait',
      setOrientation,
      columns: 2,
      setColumns,
    });

    const portraitBtn = screen.getByRole('button', { name: 'Portrait (vertical stack)' });
    const gridBtn = screen.getByRole('button', { name: 'Grid (multi-column collage)' });

    expect(portraitBtn).toHaveAttribute('aria-pressed', 'true');
    expect(portraitBtn).toHaveClass('active');
    expect(screen.queryByLabelText('Columns:')).not.toBeInTheDocument();

    await user.click(gridBtn);
    expect(setOrientation).toHaveBeenCalledWith('grid');
    expect(window.dataLayer).toContainEqual({
      event: 'orientation_change',
      selected_orientation: 'grid',
      image_count: 0,
      is_debug_mode: true,
    });

    rerender(<FileControls {...props} orientation="grid" />);
    const colInput = screen.getByLabelText('Columns:') as HTMLInputElement;
    fireEvent.change(colInput, { target: { value: '4' } });
    expect(setColumns).toHaveBeenCalledWith(4);
    expect(window.dataLayer).toContainEqual({
      event: 'option_change',
      option_name: 'columns',
      option_value: 4,
      image_count: 0,
      is_debug_mode: true,
    });
  });

  it('updates advanced layout & export options and displays Copy live feedback without disabling Copy', async () => {
    const user = userEvent.setup();
    const setGap = vi.fn();
    const setPadding = vi.fn();
    const setBackgroundColor = vi.fn();
    const setExportFormat = vi.fn();
    const setQuality = vi.fn();
    const onCopy = vi.fn();

    const { rerender, props } = renderFileControls({
      images: [createMockImageItem()],
      setGap,
      setPadding,
      setBackgroundColor,
      setExportFormat,
      setQuality,
      onCopy,
      copyFeedback: { text: 'Copied', state: 'copied' },
    });

    fireEvent.change(screen.getByLabelText('Gap (px)'), { target: { value: '16' } });
    expect(setGap).toHaveBeenCalledWith(16);

    fireEvent.change(screen.getByLabelText('Pad (px)'), { target: { value: '24' } });
    expect(setPadding).toHaveBeenCalledWith(24);

    await user.selectOptions(screen.getByLabelText('Background:'), '#ffffff');
    expect(setBackgroundColor).toHaveBeenCalledWith('#ffffff');

    await user.selectOptions(screen.getByLabelText('Format:'), 'image/png');
    expect(setExportFormat).toHaveBeenCalledWith('image/png');

    fireEvent.change(screen.getByLabelText('Quality:'), { target: { value: '80' } });
    expect(setQuality).toHaveBeenCalledWith(0.8);

    // JPEG + transparent shows transparency hint; PNG hides Quality slider
    expect(
      screen.getByText(/Transparent areas export as white when saving as JPEG/i),
    ).toBeInTheDocument();
    rerender(<FileControls {...props} exportFormat="image/png" />);
    expect(screen.queryByLabelText('Quality:')).not.toBeInTheDocument();

    const copyBtn = screen.getByRole('button', { name: 'Copy' });
    expect(copyBtn).toBeEnabled();
    expect(screen.getByRole('status')).toHaveTextContent('Copied');
    await user.click(copyBtn);
    expect(onCopy).toHaveBeenCalledTimes(1);
  });

  it('ingests files via Choose Files (replace) and + Add (append) using Object URLs', async () => {
    const user = userEvent.setup();
    const onReplaceImages = vi.fn();
    const onAppendImages = vi.fn();
    createMockCanvasContext('data:image/jpeg;base64,thumb-output');

    let urlCount = 0;
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:upload-${++urlCount}`);

    class MockImage {
      width = 400;
      height = 200;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      set src(_val: string) {
        queueMicrotask(() => {
          this.onload?.();
        });
      }
    }

    vi.stubGlobal('Image', MockImage);

    const existing = createMockImageItem();
    const { container } = renderFileControls({
      images: [existing],
      onReplaceImages,
      onAppendImages,
    });

    const replaceInput = container.querySelector('#upload') as HTMLInputElement;
    await user.upload(replaceInput, [new File(['a'], 'first.png', { type: 'image/png' })]);

    await waitFor(() => {
      expect(onReplaceImages).toHaveBeenCalledTimes(1);
    });
    expect(onReplaceImages.mock.calls[0][0][0]).toMatchObject({
      originalName: 'first.png',
      src: 'blob:upload-1',
    });

    const appendInput = container.querySelector('#addUpload') as HTMLInputElement;
    await user.upload(appendInput, [new File(['b'], 'extra.png', { type: 'image/png' })]);

    await waitFor(() => {
      expect(onAppendImages).toHaveBeenCalledTimes(1);
    });
    expect(onAppendImages.mock.calls[0][0][0]).toMatchObject({
      originalName: 'extra.png',
      src: 'blob:upload-2',
    });
  });
});
