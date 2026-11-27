import { act, createEvent, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import ImageList from './ImageList';
import { createMockImageItem, mockMatchMedia } from '../../test/fixtures';
import type { ImageItem } from '../../types';

function ImageListHarness({
  initialImages,
  onRemoveImage = vi.fn(),
  onRotateImage = vi.fn(),
  onFlipImage = vi.fn(),
  onClearAll = vi.fn(),
}: {
  initialImages: ImageItem[];
  onRemoveImage?: (id: string) => void;
  onRotateImage?: (id: string) => void;
  onFlipImage?: (id: string) => void;
  onClearAll?: () => void;
}) {
  const [images, setImages] = useState<ImageItem[]>(initialImages);
  return (
    <ImageList
      images={images}
      setImages={setImages}
      onRemoveImage={onRemoveImage}
      onRotateImage={onRotateImage}
      onFlipImage={onFlipImage}
      onClearAll={onClearAll}
    />
  );
}

describe('ImageList', () => {
  it('hides the list container when images is empty', () => {
    const { container } = render(
      <ImageList
        images={[]}
        setImages={vi.fn()}
        onRemoveImage={vi.fn()}
        onRotateImage={vi.fn()}
        onFlipImage={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );
    expect(container.querySelector('#ImageList')).toHaveClass('hidden');
  });

  it('renders thumbnails using thumbnailSrc, transform styles, and disabled boundary buttons', () => {
    const img1 = createMockImageItem({
      originalName: 'one.png',
      src: 'blob:full-1',
      thumbnailSrc: 'thumb-1',
      rotation: 90,
      flipH: true,
    });
    const img2 = createMockImageItem({ originalName: 'two.png', src: 'blob:full-2', thumbnailSrc: 'thumb-2' });
    const img3 = createMockImageItem({ originalName: 'three.png', src: 'blob:full-3', thumbnailSrc: 'thumb-3' });

    const { container } = render(<ImageListHarness initialImages={[img1, img2, img3]} />);

    expect(container.querySelector('#ImageList')).not.toHaveClass('hidden');

    const renderedImgs = screen.getAllByRole('img');
    expect(renderedImgs).toHaveLength(3);
    expect(renderedImgs[0]).toHaveAttribute('src', 'thumb-1');
    expect(renderedImgs[0]).toHaveStyle({ transform: 'rotate(90deg) scaleX(-1)' });
    expect(renderedImgs[1]).toHaveAttribute('src', 'thumb-2');

    const moveOneUp = screen.getByRole('button', { name: 'Move one.png up' });
    const moveTwoUp = screen.getByRole('button', { name: 'Move two.png up' });
    const moveThreeDown = screen.getByRole('button', { name: 'Move three.png down' });

    expect(moveOneUp).toBeDisabled();
    expect(moveOneUp).toHaveClass('disabled');
    expect(moveTwoUp).toBeEnabled();
    expect(moveThreeDown).toBeDisabled();
    expect(moveThreeDown).toHaveClass('disabled');
  });

  it('reorders items with arrow buttons and delegates rotate, flip, remove, and clear-all', async () => {
    const user = userEvent.setup();
    const onRemoveImage = vi.fn();
    const onRotateImage = vi.fn();
    const onFlipImage = vi.fn();
    const onClearAll = vi.fn();

    const img1 = createMockImageItem({ id: 'id-1', originalName: 'first.png' });
    const img2 = createMockImageItem({ id: 'id-2', originalName: 'second.png' });
    const img3 = createMockImageItem({ id: 'id-3', originalName: 'third.png' });

    const { container } = render(
      <ImageListHarness
        initialImages={[img1, img2, img3]}
        onRemoveImage={onRemoveImage}
        onRotateImage={onRotateImage}
        onFlipImage={onFlipImage}
        onClearAll={onClearAll}
      />,
    );

    const getOrder = () =>
      Array.from(container.querySelectorAll('.thumbnail-label')).map((el) => el.textContent);

    expect(getOrder()).toEqual(['first.png', 'second.png', 'third.png']);

    await user.click(screen.getByRole('button', { name: 'Move first.png down' }));
    expect(getOrder()).toEqual(['second.png', 'first.png', 'third.png']);

    await user.click(screen.getByRole('button', { name: 'Move third.png up' }));
    expect(getOrder()).toEqual(['second.png', 'third.png', 'first.png']);

    await user.click(screen.getByRole('button', { name: 'Rotate first.png 90 degrees' }));
    expect(onRotateImage).toHaveBeenCalledWith('id-1');

    await user.click(screen.getByRole('button', { name: 'Flip second.png horizontally' }));
    expect(onFlipImage).toHaveBeenCalledWith('id-2');

    await user.click(screen.getByRole('button', { name: 'Remove third.png' }));
    expect(onRemoveImage).toHaveBeenCalledWith('id-3');

    await user.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(onClearAll).toHaveBeenCalledTimes(1);
  });

  it('prevents the default context menu on thumbnail images', () => {
    const img1 = createMockImageItem({ originalName: 'alpha.png' });
    render(<ImageListHarness initialImages={[img1]} />);

    const imgEl = screen.getByAltText('alpha.png');
    const event = createEvent.contextMenu(imgEl);
    fireEvent(imgEl, event);

    expect(event.defaultPrevented).toBe(true);
  });

  it('initializes help text from matchMedia and updates on breakpoint changes', () => {
    const media = mockMatchMedia(true);
    const img1 = createMockImageItem({ originalName: 'alpha.png' });

    render(<ImageListHarness initialImages={[img1]} />);
    expect(screen.getByText('Use the arrows to adjust image order.')).toBeInTheDocument();

    act(() => {
      media.setMatches(false);
    });
    expect(screen.getByText('Drag images to reorder or use the arrows.')).toBeInTheDocument();
  });
});
