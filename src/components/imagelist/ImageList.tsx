import { type ComponentProps, type Dispatch, type SetStateAction, useEffect, useState } from 'react';
import { DragDropProvider } from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import { move } from '@dnd-kit/helpers';
import { type ImageItem } from '../../types';
import { trackEvent } from '../../utils/analytics';
import {
    ArrowDownIcon,
    ArrowUpIcon,
    CloseIcon,
    FlipHorizontalIcon,
    RotateCwIcon,
} from '../icons/Icons';

const MOBILE_BREAKPOINT_QUERY = '(max-width: 600px)';

const getHelpText = (isMobile: boolean): string =>
    isMobile ? 'Use the arrows to adjust image order.' : 'Drag images to reorder or use the arrows.';

interface SortableImageItemProps {
    id: string;
    index: number;
    img: ImageItem;
    isFirst: boolean;
    isLast: boolean;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onRotate: () => void;
    onFlip: () => void;
    onRemove: () => void;
}

function SortableImageItem({
    id,
    index,
    img,
    isFirst,
    isLast,
    onMoveUp,
    onMoveDown,
    onRotate,
    onFlip,
    onRemove,
}: SortableImageItemProps) {
    const { ref, isDragging } = useSortable({ id, index });

    return (
        <div
            ref={ref}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            className={`image-thumbnail ${isDragging ? 'dragging' : ''}`}
        >
            <button
                type="button"
                className={`item-action-btn up-arrow ${isFirst ? 'disabled' : ''}`}
                aria-label={`Move ${img.originalName} up`}
                title="Move up"
                disabled={isFirst}
                onClick={onMoveUp}
            >
                <ArrowUpIcon />
            </button>

            <div className="preview-container">
                <img
                    className="thumbnail-img"
                    src={img.thumbnailSrc}
                    alt={img.originalName}
                    style={{
                        transform: `${img.rotation ? `rotate(${img.rotation}deg)` : ''} ${img.flipH ? 'scaleX(-1)' : ''}`.trim() || undefined,
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                />
                <span className="thumbnail-label">{img.originalName}</span>
            </div>

            <div className="item-actions">
                <button
                    type="button"
                    className="item-action-btn rotate-btn"
                    aria-label={`Rotate ${img.originalName} 90 degrees`}
                    title="Rotate 90°"
                    onClick={onRotate}
                >
                    <RotateCwIcon />
                </button>
                <button
                    type="button"
                    className={`item-action-btn flip-btn ${img.flipH ? 'active' : ''}`}
                    aria-label={`Flip ${img.originalName} horizontally`}
                    aria-pressed={Boolean(img.flipH)}
                    title="Flip horizontally"
                    onClick={onFlip}
                >
                    <FlipHorizontalIcon />
                </button>
                <button
                    type="button"
                    className={`item-action-btn down-arrow ${isLast ? 'disabled' : ''}`}
                    aria-label={`Move ${img.originalName} down`}
                    title="Move down"
                    disabled={isLast}
                    onClick={onMoveDown}
                >
                    <ArrowDownIcon />
                </button>
                <button
                    type="button"
                    className="item-action-btn remove-btn"
                    aria-label={`Remove ${img.originalName}`}
                    title="Remove image"
                    onClick={onRemove}
                >
                    <CloseIcon />
                </button>
            </div>
        </div>
    );
}

interface ImageListProps {
    images: ImageItem[];
    setImages: Dispatch<SetStateAction<ImageItem[]>>;
    onRemoveImage: (id: string) => void;
    onRotateImage: (id: string) => void;
    onFlipImage: (id: string) => void;
    onClearAll: () => void;
}

type DragEndHandler = NonNullable<ComponentProps<typeof DragDropProvider>['onDragEnd']>;

const ImageList = ({
    images,
    setImages,
    onRemoveImage,
    onRotateImage,
    onFlipImage,
    onClearAll,
}: ImageListProps) => {
    const [helpText, setHelpText] = useState(() =>
        getHelpText(window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches),
    );

    const swapImages = (idx1: number, idx2: number) => {
        setImages((prev) => {
            const newImages = [...prev];
            [newImages[idx1], newImages[idx2]] = [newImages[idx2], newImages[idx1]];
            return newImages;
        });
    };

    const moveUp = (idx: number) => {
        if (idx > 0) {
            swapImages(idx, idx - 1);
            trackEvent({
                event: 'image_list_action',
                action_type: 'move_up',
                image_count: images.length,
            });
        }
    };

    const moveDown = (idx: number) => {
        if (idx < images.length - 1) {
            swapImages(idx, idx + 1);
            trackEvent({
                event: 'image_list_action',
                action_type: 'move_down',
                image_count: images.length,
            });
        }
    };

    const handleDragEnd: DragEndHandler = (event) => {
        if (event.canceled) return;
        const nextImages = move(images, event);
        const orderChanged =
            nextImages.length === images.length &&
            nextImages.some((item, index) => item.id !== images[index].id);
        setImages(nextImages);
        if (orderChanged) {
            trackEvent({
                event: 'image_list_action',
                action_type: 'drag_reorder',
                image_count: nextImages.length,
            });
        }
    };

    useEffect(() => {
        const mediaQuery = window.matchMedia(MOBILE_BREAKPOINT_QUERY);
        const handleMediaChange = (e: MediaQueryListEvent) => {
            setHelpText(getHelpText(e.matches));
        };

        mediaQuery.addEventListener('change', handleMediaChange);
        return () => mediaQuery.removeEventListener('change', handleMediaChange);
    }, []);

    return (
        <div id="ImageList" className={images.length > 0 ? '' : 'hidden'}>
            <DragDropProvider onDragEnd={handleDragEnd}>
                <div id="imageList">
                    {images.map((img, index) => (
                        <SortableImageItem
                            key={img.id}
                            id={img.id}
                            index={index}
                            img={img}
                            isFirst={index === 0}
                            isLast={index === images.length - 1}
                            onMoveUp={() => moveUp(index)}
                            onMoveDown={() => moveDown(index)}
                            onRotate={() => onRotateImage(img.id)}
                            onFlip={() => onFlipImage(img.id)}
                            onRemove={() => onRemoveImage(img.id)}
                        />
                    ))}
                </div>
            </DragDropProvider>

            <div className="image-list-footer">
                <p id="helpText">{helpText}</p>
                <button type="button" className="clear-all-btn" onClick={onClearAll}>
                    Clear all
                </button>
            </div>
        </div>
    );
};

export default ImageList;
