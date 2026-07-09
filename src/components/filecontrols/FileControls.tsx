import { useState, useEffect } from 'react';
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

    // Local state allows typing freely without triggering canvas renders
    const [localWidth, setLocalWidth] = useState<string>(customWidth);

    useEffect(() => {
        setLocalWidth(customWidth);
    }, [customWidth]);

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

    // --- CLEANED Width Logic ---

    const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Pure text updater. No intercepting logic.
        setLocalWidth(e.target.value);
    };

    const applyWidth = () => {
        const val = localWidth.trim();

        if (val === '') {
            setCustomWidth('');
            return;
        }

        // Just ensure it's a valid number greater than 0 before pushing to canvas
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed) && parsed > 0) {
            setCustomWidth(parsed.toString());
        } else {
            // If they typed "-50" or "abc", reset the input box back to the last safe value
            setLocalWidth(customWidth);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            applyWidth();
        }
    };

    const hasCustomWidth = localWidth.trim() !== '';

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
                    disabled={hasCustomWidth}
                    onChange={(e) => setScaleToLargest(e.target.checked)}
                />
            </div>


            <label className="textInput" htmlFor="customWidth">
                <span className="label-text">Width:</span>
                <div className="input-wrapper">
                    <input
                        type="number"
                        name="customWidth"
                        id="customWidth"
                        placeholder={canvasWidth ? canvasWidth.toString() : 'Auto'}
                        value={localWidth}
                        onChange={handleWidthChange}
                        onKeyDown={handleKeyDown}
                    />
                    <button type="button" onClick={applyWidth}>Go</button>
                </div>
            </label>

            <label className="textInput" htmlFor="filename">
                <span className="label-text">Filename:</span>
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
