import { type ComponentProps, type Dispatch, type SetStateAction, useEffect, useState } from 'react';
import { DragDropProvider } from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import { move } from '@dnd-kit/helpers';
import { type ImageItem } from '../../types';

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
}

function SortableImageItem({
    id,
    index,
    img,
    isFirst,
    isLast,
    onMoveUp,
    onMoveDown,
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
                className={`up-arrow ${isFirst ? 'disabled' : ''}`}
                aria-label={`Move ${img.originalName} up`}
                disabled={isFirst}
                onClick={onMoveUp}
            >
                &uarr;
            </button>

            <div className="preview-container">
                <img
                    className="thumbnail-img"
                    src={img.thumbnailSrc}
                    alt={img.originalName}
                    onContextMenu={(e) => e.preventDefault()}
                />
                <span className="thumbnail-label">{img.originalName}</span>
            </div>

            <button
                type="button"
                className={`down-arrow ${isLast ? 'disabled' : ''}`}
                aria-label={`Move ${img.originalName} down`}
                disabled={isLast}
                onClick={onMoveDown}
            >
                &darr;
            </button>
        </div>
    );
}

interface ImageListProps {
    images: ImageItem[];
    setImages: Dispatch<SetStateAction<ImageItem[]>>;
}

type DragEndHandler = NonNullable<ComponentProps<typeof DragDropProvider>['onDragEnd']>;

const ImageList = ({ images, setImages }: ImageListProps) => {
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
        if (idx > 0) swapImages(idx, idx - 1);
    };

    const moveDown = (idx: number) => {
        if (idx < images.length - 1) swapImages(idx, idx + 1);
    };

    const handleDragEnd: DragEndHandler = (event) => {
        if (event.canceled) return;
        setImages((prevImages) => move(prevImages, event));
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
                        />
                    ))}
                </div>
            </DragDropProvider>

            <p id="helpText">{helpText}</p>
        </div>
    );
};

export default ImageList;
