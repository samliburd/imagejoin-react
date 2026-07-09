import {useEffect, useState, useRef} from 'react';
import {type ImageItem, type Orientation} from '../../types';

// Declare GTM dataLayer for TypeScript
declare global {
    interface Window {
        dataLayer: any[];
    }
}

const TEST_IMAGES = [
    'testimg/1.webp',
    'testimg/2.webp',
    'testimg/rect.png',
    'testimg/rect2.png',
    'testimg/triangle.png',
    'testimg/05063b2318e3dd0632eb34c1821f905db558b5cd17b32360ff517d2cfae15ec2.0.webp',
];

interface ControlsProps {
    images: ImageItem[];
    setImages: React.Dispatch<React.SetStateAction<ImageItem[]>>;
    orientation: Orientation;
    setOrientation: (val: Orientation) => void;
    scaleToLargest: boolean;
    setScaleToLargest: (val: boolean) => void;
    filename: string;
    setFilename: (val: string) => void;
    onDownload: () => void;
    debug: boolean;
}

const Controls = ({
                      images,
                      setImages,
                      orientation,
                      setOrientation,
                      scaleToLargest,
                      setScaleToLargest,
                      filename,
                      setFilename,
                      onDownload,
                      debug
                  }: ControlsProps) => {
    const [isDebugMode, setIsDebugMode] = useState(false);
    const [helpText, setHelpText] = useState('Drag images to reorder or use the arrows.');

    // Refs for drag and drop to avoid unnecessary re-renders while dragging
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    // --- Utilities ---
    const loadImage = (src: string, name: string): Promise<ImageItem> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve({
                id: crypto.randomUUID(), // Standard web API for unique IDs
                src: src,
                originalName: name,
                width: img.width,
                height: img.height,
                imgElement: img
            });
            img.onerror = () => reject(`Failed to load: ${name}`);
            img.src = src;

        });
    };

    // --- Event Handlers ---
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        try {
            const filePromises = Array.from(files).map(file => {
                return new Promise<ImageItem>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = async () => {
                        try {
                            const loaded = await loadImage(reader.result as string, file.name);
                            resolve(loaded);
                        } catch (err) {
                            reject(err);
                        }
                    };
                    reader.readAsDataURL(file);
                });
            });

            const loadedImages = await Promise.all(filePromises);
            setImages(loadedImages);
        } catch (error) {
            console.error(error);
        }
        // Reset input so the same file can be uploaded again if needed
        e.target.value = '';
    };

    const handleDebugToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const isChecked = e.target.checked;
        setIsDebugMode(isChecked);

        if (isChecked) {
            try {
                const loaded = await Promise.all(TEST_IMAGES.map(src => loadImage(src, src.split('/').pop() || 'test')));
                setImages(loaded);
            } catch (err) {
                console.error(err);
            }
        } else {
            setImages([]);
        }
    };

    const handleOrientationChange = (newOrientation: Orientation) => {
        setOrientation(newOrientation);
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
            event: 'orientation_change',
            selected_orientation: newOrientation,
        });
    };

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
// We can completely remove the dragOverItem ref!
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        dragItem.current = index;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index.toString());
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); // Crucial: Tells the browser "this is a valid drop target"
        e.dataTransfer.dropEffect = 'move';
    };

// NEW: Handle the actual reordering here
    const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
        e.preventDefault();
        const dragIndex = dragItem.current;

        // If we have a valid drag item and it's not dropped on itself
        if (dragIndex !== null && dragIndex !== dropIndex) {
            setImages(prev => {
                const newImages = [...prev];
                // Remove the item from its original position
                const [draggedItemContent] = newImages.splice(dragIndex, 1);
                // Insert it into the new position
                newImages.splice(dropIndex, 0, draggedItemContent);
                return newImages;
            });
        }

        // Clean up
        dragItem.current = null;
    };

    const handleDragEnd = () => {
        // Failsafe cleanup in case the drag is cancelled outside the drop zone
        dragItem.current = null;
    };

    // --- Effects ---
    useEffect(() => {
        const mediaQuery = window.matchMedia('(max-width: 600px)');
        const handleMediaChange = (e: MediaQueryListEvent | MediaQueryList) => {
            setHelpText(e.matches ? 'Use the arrows to adjust image order.' : 'Drag images to reorder or use the arrows.');
        };

        mediaQuery.addEventListener('change', handleMediaChange);
        handleMediaChange(mediaQuery); // Initial check

        return () => mediaQuery.removeEventListener('change', handleMediaChange);
    }, []);

    return (
        <div id="controls" className="controls">
            <div id="controlContainer">
                <label className="file-upload">
                    <input type="file" name="upload" id="upload" multiple hidden onChange={handleFileUpload}/>
                    <span className="file-btn">Choose Files</span>
                    <span className="file-label" id="fileLabel">
            {images.length > 0 ? `${images.length} images selected` : 'No files chosen'}
          </span>
                </label>

                <div className="checkboxContainer">
                    <label htmlFor="scaleCheckbox">Resize to largest image</label>
                    <input
                        type="checkbox"
                        name="scaleCheckbox"
                        id="scaleCheckbox"
                        checked={scaleToLargest}
                        onChange={(e) => setScaleToLargest(e.target.checked)}
                    />
                </div>

                <div className="dropdownContainer">
                    <label htmlFor="orientationDropdown">Orientation:</label>
                    <div id="orientationButtons">
                        <button
                            className="orientationButton"
                            onClick={() => handleOrientationChange('portrait')}
                        >&#8597;</button>
                        <button
                            className="orientationButton"
                            onClick={() => handleOrientationChange('landscape')}
                        >&#8596;</button>
                    </div>
                    <select
                        name="orientationDropdown"
                        id="orientationDropdown"
                        value={orientation}
                        onChange={(e) => handleOrientationChange(e.target.value as Orientation)}
                    >
                        <option value="portrait">Portrait</option>
                        <option value="landscape">Landscape</option>
                    </select>
                </div>

                <label className="filenameInput" htmlFor="filename">
                    <span className="label-text">Filename: </span>
                    <input
                        type="text"
                        name="filename"
                        id="filename"
                        value={filename}
                        onChange={(e) => setFilename(e.target.value)}
                    />
                </label>

                {debug && (
                    <div className="checkboxContainer" id="debugContainer">
                        <label htmlFor="debugToggle">Debug</label>
                        <input
                            type="checkbox"
                            name="debugToggle"
                            id="debugToggle"
                            checked={isDebugMode}
                            onChange={handleDebugToggle}
                        />
                    </div>
                )}

                <button id="download" onClick={onDownload}
                        disabled={images.length === 0}
                        className={images.length === 0 ? 'disabled' : ''}>Download image
                </button>
            </div>

            <div id="imageListContainer" className={images.length > 0 ? '' : 'hidden'}>
                <div id="imageList">
                    {images.map((img, index) => (
                        <div
                            key={img.id}
                            className="image-thumbnail"
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, index)} /* <-- Handles the actual reorder */
                            onDragEnd={handleDragEnd}
                        >
                            <button
                                className={`up-arrow ${index === 0 ? 'disabled' : ''}`}
                                disabled={index === 0}
                                onClick={() => moveUp(index)}
                            >&uarr;</button>

                            <div className="preview-container">
                                {/* Note: In a production app, generating a smaller thumbnail upfront is better for memory,
                    but leveraging the base64 src directly here mirrors your vanilla implementation */}
                                <img className="thumbnail-img" src={img.src} alt={img.originalName}
                                     onContextMenu={(e) => e.preventDefault()}/>
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
        </div>
    );
};

export default Controls;
