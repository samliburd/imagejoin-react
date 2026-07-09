import { useState } from 'react';
import { type ImageItem, type Orientation } from '../../types';

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

interface FileControlsProps {
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
    // NEW Props
    customWidth: string;
    setCustomWidth: (val: string) => void;
    canvasWidth: number;
}

const FileControls = ({
                          images,
                          setImages,
                          orientation,
                          setOrientation,
                          scaleToLargest,
                          setScaleToLargest,
                          filename,
                          setFilename,
                          onDownload,
                          debug,
                          customWidth,
                          setCustomWidth,
                          canvasWidth
                      }: FileControlsProps) => {
    const [isDebugMode, setIsDebugMode] = useState(false);

    // ... (generateThumbnail and loadImage utilities stay exactly the same) ...
    const generateThumbnail = (img: HTMLImageElement, maxWidth = 100): string => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return img.src;
        const scale = Math.min(maxWidth / img.width, 1);
        const newWidth = img.width * scale;
        const newHeight = img.height * scale;
        canvas.width = newWidth;
        canvas.height = newHeight;
        ctx.drawImage(img, 0, 0, newWidth, newHeight);
        return canvas.toDataURL('image/jpeg', 0.5);
    };

    const loadImage = (src: string, name: string): Promise<ImageItem> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const tinySrc = generateThumbnail(img, 100);
                resolve({
                    id: crypto.randomUUID(),
                    src: src,
                    thumbnailSrc: tinySrc,
                    originalName: name,
                    width: img.width,
                    height: img.height,
                    imgElement: img
                });
            };
            img.onerror = () => reject(`Failed to load: ${name}`);
            img.src = src;
        });
    };

    // ... (handleFileUpload, handleDebugToggle, handleOrientationChange stay exactly the same) ...
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

    // Derived state to check if user has inputted a valid custom width
    const hasCustomWidth = customWidth.trim() !== '';

    return (
        <div id="FileControls">
            <label className="file-upload">
                <input type="file" name="upload" id="upload" multiple hidden onChange={handleFileUpload} />
                <span className="file-btn">Choose Files</span>
                <span className="file-label" id="fileLabel">
                    {images.length > 0 ? `${images.length} images selected` : 'No files chosen'}
                </span>
            </label>


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



            <div className="checkboxContainer" style={{ opacity: hasCustomWidth ? 0.5 : 1 }}>
                <label htmlFor="scaleCheckbox">Resize to largest image</label>
                <input
                    type="checkbox"
                    name="scaleCheckbox"
                    id="scaleCheckbox"
                    checked={scaleToLargest}
                    disabled={hasCustomWidth} // NEW: Disable if width is hardcoded
                    onChange={(e) => setScaleToLargest(e.target.checked)}
                />
            </div>
            <label className="filenameInput" htmlFor="customWidth">
                <span className="label-text">Width: </span>
                <input
                    type="number"
                    name="customWidth"
                    id="customWidth"
                    min="1"
                    placeholder={canvasWidth ? canvasWidth.toString() : 'Auto'}
                    value={customWidth}
                    onChange={(e) => setCustomWidth(e.target.value)}
                />
            </label>
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

            <button
                id="download"
                onClick={onDownload}
                disabled={images.length === 0}
                className={images.length === 0 ? 'disabled' : ''}
            >
                Download image
            </button>
        </div>
    );
};

export default FileControls;
