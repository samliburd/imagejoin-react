import { type ChangeEvent, type KeyboardEvent, useState } from 'react';
import { type ImageItem, type Orientation } from '../../types';
import { loadImage, loadImageFiles } from '../../utils/imageLoader';

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
    onReplaceImages: (nextImages: ImageItem[]) => void;
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
    onReplaceImages,
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
    canvasWidth,
}: FileControlsProps) => {
    const [isDebugMode, setIsDebugMode] = useState(false);

    // Local state buffers keystrokes without triggering canvas renders; synced if parent resets customWidth
    const [localWidth, setLocalWidth] = useState<string>(customWidth);
    const [prevCustomWidth, setPrevCustomWidth] = useState<string>(customWidth);
    if (prevCustomWidth !== customWidth) {
        setPrevCustomWidth(customWidth);
        setLocalWidth(customWidth);
    }

    const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        try {
            const loadedImages = await loadImageFiles(files);
            onReplaceImages(loadedImages);
        } catch (error) {
            console.error(error);
        }
        e.target.value = '';
    };

    const handleDebugToggle = async (e: ChangeEvent<HTMLInputElement>) => {
        const isChecked = e.target.checked;
        setIsDebugMode(isChecked);
        if (isChecked) {
            try {
                const loaded = await Promise.all(
                    TEST_IMAGES.map((src) => loadImage(src, src.split('/').pop() || 'test')),
                );
                onReplaceImages(loaded);
            } catch (err) {
                console.error(err);
            }
        } else {
            onReplaceImages([]);
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

    const handleWidthChange = (e: ChangeEvent<HTMLInputElement>) => {
        setLocalWidth(e.target.value);
    };

    const applyWidth = () => {
        const val = localWidth.trim();

        if (val === '') {
            setCustomWidth('');
            return;
        }

        const parsed = parseInt(val, 10);
        if (!isNaN(parsed) && parsed > 0) {
            setCustomWidth(parsed.toString());
        } else {
            // Revert invalid inputs back to the last valid committed width
            setLocalWidth(customWidth);
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            applyWidth();
        }
    };

    const hasCustomWidth = localWidth.trim() !== '';
    const fileLabelText =
        images.length === 0
            ? 'No files chosen'
            : `${images.length} ${images.length === 1 ? 'image' : 'images'} selected`;

    return (
        <div id="FileControls">
            <label className="file-upload">
                <input
                    type="file"
                    name="upload"
                    id="upload"
                    multiple
                    hidden
                    onChange={handleFileUpload}
                />
                <span className="file-btn">Choose Files</span>
                <span className="file-label" id="fileLabel">
                    {fileLabelText}
                </span>
            </label>

            <div className="dropdownContainer">
                <span id="orientationLabel" className="orientation-label">
                    Orientation:
                </span>
                <div id="orientationButtons" role="group" aria-labelledby="orientationLabel">
                    <button
                        type="button"
                        className={`orientationButton ${orientation === 'portrait' ? 'active' : ''}`}
                        aria-label="Portrait (vertical stack)"
                        aria-pressed={orientation === 'portrait'}
                        title="Portrait (vertical stack)"
                        onClick={() => handleOrientationChange('portrait')}
                    >
                        &#8597;
                    </button>
                    <button
                        type="button"
                        className={`orientationButton ${orientation === 'landscape' ? 'active' : ''}`}
                        aria-label="Landscape (horizontal row)"
                        aria-pressed={orientation === 'landscape'}
                        title="Landscape (horizontal row)"
                        onClick={() => handleOrientationChange('landscape')}
                    >
                        &#8596;
                    </button>
                </div>
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
                    <button type="button" onClick={applyWidth}>
                        Go
                    </button>
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
                type="button"
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
