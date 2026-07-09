import { useEffect, useState, useRef } from 'react';
import { type ImageItem } from '../../types';

interface ImageListProps {
    images: ImageItem[];
    setImages: React.Dispatch<React.SetStateAction<ImageItem[]>>;
}

const ImageList = ({ images, setImages }: ImageListProps) => {
    const [helpText, setHelpText] = useState('Drag images to reorder or use the arrows.');
    const dragItem = useRef<number | null>(null);

    // --- Ordering Logic ---
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

    // --- Drag and Drop Logic ---
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        dragItem.current = index;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index.toString());
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
        e.preventDefault();
        const dragIndex = dragItem.current;

        if (dragIndex !== null && dragIndex !== dropIndex) {
            setImages(prev => {
                const newImages = [...prev];
                const [draggedItemContent] = newImages.splice(dragIndex, 1);
                newImages.splice(dropIndex, 0, draggedItemContent);
                return newImages;
            });
        }
        dragItem.current = null;
    };

    const handleDragEnd = () => {
        dragItem.current = null;
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
            <div id="imageList">
                {images.map((img, index) => (
                    <div
                        key={img.id}
                        className="image-thumbnail"
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                    >
                        <button
                            className={`up-arrow ${index === 0 ? 'disabled' : ''}`}
                            disabled={index === 0}
                            onClick={() => moveUp(index)}
                        >&uarr;</button>

                        <div className="preview-container">
                            <img
                                className="thumbnail-img"
                                src={img.src}
                                alt={img.originalName}
                                onContextMenu={(e) => e.preventDefault()}
                            />
                            <span className="thumbnail-label">{img.originalName}</span>
                        </div>

                        <button
                            className={`down-arrow ${index === images.length - 1 ? 'disabled' : ''}`}
                            disabled={index === images.length - 1}
                            onClick={() => moveDown(index)}
                        >&darr;</button>
                    </div>
                ))}
            </div>
            <p id="helpText">{helpText}</p>
        </div>
    );
};

export default ImageList;
