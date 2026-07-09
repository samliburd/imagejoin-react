import { useEffect, useState } from 'react';
import { DragDropProvider } from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import { move } from '@dnd-kit/helpers';
import { type ImageItem } from '../../types';

// --- 1. Dedicated Sortable Item Component ---
interface SortableImageItemProps {
    id: string;
    index: number;
    img: ImageItem;
    isFirst: boolean;
    isLast: boolean;
    onMoveUp: () => void;
    onMoveDown: () => void;
}

function SortableImageItem({ id, index, img, isFirst, isLast, onMoveUp, onMoveDown }: SortableImageItemProps) {
    const { ref, isDragging } = useSortable({ id, index });

    return (
        <div
            ref={ref}
            className={`image-thumbnail ${isDragging ? 'dragging' : ''}`}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
            <button
                className={`up-arrow ${isFirst ? 'disabled' : ''}`}
                disabled={isFirst}
                onClick={onMoveUp}
            >&uarr;</button>

            <div className="preview-container">
                <img
                    className="thumbnail-img"
                    src={img.thumbnailSrc} /* <--- Point this to the new tiny string */
                    alt={img.originalName}
                    onContextMenu={(e) => e.preventDefault()}
                />
                <span className="thumbnail-label">{img.originalName}</span>
            </div>

            <button
                className={`down-arrow ${isLast ? 'disabled' : ''}`}
                disabled={isLast}
                onClick={onMoveDown}
            >&darr;</button>
        </div>
    );
}

// --- 2. Main List Component ---
interface ImageListProps {
    images: ImageItem[];
    setImages: React.Dispatch<React.SetStateAction<ImageItem[]>>;
}

const ImageList = ({ images, setImages }: ImageListProps) => {
    const [helpText, setHelpText] = useState('Drag images to reorder or use the arrows.');

    // --- Standard Button Ordering Logic ---
    const swapImages = (idx1: number, idx2: number) => {
        setImages(prev => {
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

    // --- dnd-kit Drag End Handler ---
    const handleDragEnd = (event: any) => {
        if (event.canceled) return;
        setImages((prevImages) => move(prevImages, event));
    };

    // --- Effects ---
    useEffect(() => {
        const mediaQuery = window.matchMedia('(max-width: 600px)');
        const handleMediaChange = (e: MediaQueryListEvent | MediaQueryList) => {
            setHelpText(e.matches ? 'Use the arrows to adjust image order.' : 'Drag images to reorder or use the arrows.');
        };

        mediaQuery.addEventListener('change', handleMediaChange);
        handleMediaChange(mediaQuery);

        return () => mediaQuery.removeEventListener('change', handleMediaChange);
    }, []);

    return (
        <div id="ImageList" className={images.length > 0 ? '' : 'hidden'}>

            {/* Wrap the list in the Provider */}
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
