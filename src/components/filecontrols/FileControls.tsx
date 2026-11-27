import { type ChangeEvent, type CSSProperties, type KeyboardEvent, useRef, useState } from 'react';
import {
    type Alignment,
    type ExportFormat,
    type ImageItem,
    type Orientation,
    type SizeMode,
} from '../../types';
import {
    classifyBackground,
    extractFileTypes,
    formatExportType,
    sumFileSizeKb,
    trackEvent,
} from '../../utils/analytics';
import { loadImage, loadImageFiles } from '../../utils/imageLoader';

const TEST_IMAGES = [
    'testimg/01-tall-portrait.png',
    'testimg/02-wide-landscape.jpg',
    'testimg/03-tiny-icon.png',
    'testimg/04-square-alpha.webp',
    'testimg/05-highres-stress.jpg',
    'testimg/06-very-long-filename-for-list-truncation-check.png',
];

const BG_PRESETS = ['transparent', '#ffffff', '#000000', '#2f3b45'] as const;

export interface CopyFeedback {
    text: string;
    state: 'idle' | 'copied' | 'failed';
}

interface FileControlsProps {
    images: ImageItem[];
    onReplaceImages: (nextImages: ImageItem[]) => void;
    onAppendImages: (moreImages: ImageItem[]) => void;
    orientation: Orientation;
    setOrientation: (val: Orientation) => void;
    columns: number;
    setColumns: (val: number) => void;
    sizeMode: SizeMode;
    setSizeMode: (val: SizeMode) => void;
    alignment: Alignment;
    setAlignment: (val: Alignment) => void;
    gap: number;
    setGap: (val: number) => void;
    padding: number;
    setPadding: (val: number) => void;
    backgroundColor: string;
    setBackgroundColor: (val: string) => void;
    exportFormat: ExportFormat;
    setExportFormat: (val: ExportFormat) => void;
    quality: number;
    setQuality: (val: number) => void;
    filename: string;
    setFilename: (val: string) => void;
    onDownload: () => void;
    onCopy: () => void;
    copyFeedback: CopyFeedback;
    debug: boolean;
    customWidth: string;
    setCustomWidth: (val: string) => void;
    canvasWidth: number;
}

const FileControls = ({
    images,
    onReplaceImages,
    onAppendImages,
    orientation,
    setOrientation,
    columns,
    setColumns,
    sizeMode,
    setSizeMode,
    alignment,
    setAlignment,
    gap,
    setGap,
    padding,
    setPadding,
    backgroundColor,
    setBackgroundColor,
    exportFormat,
    setExportFormat,
    quality,
    setQuality,
    filename,
    setFilename,
    onDownload,
    onCopy,
    copyFeedback,
    debug,
    customWidth,
    setCustomWidth,
    canvasWidth,
}: FileControlsProps) => {
    const [isDebugMode, setIsDebugMode] = useState(false);

    const [localWidth, setLocalWidth] = useState<string>(customWidth);
    const [prevCustomWidth, setPrevCustomWidth] = useState<string>(customWidth);
    if (prevCustomWidth !== customWidth) {
        setPrevCustomWidth(customWidth);
        setLocalWidth(customWidth);
    }

    const prevDetailsOpenRef = useRef<boolean>(false);
    const lastTrackedQualityRef = useRef<number>(Math.round(quality * 100));

    const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>, mode: 'replace' | 'append') => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        try {
            const loadedImages = await loadImageFiles(files);
            if (loadedImages.length > 0) {
                const nextCount =
                    mode === 'append' ? images.length + loadedImages.length : loadedImages.length;
                if (mode === 'append') {
                    onAppendImages(loadedImages);
                } else {
                    onReplaceImages(loadedImages);
                }
                trackEvent({
                    event: 'images_added',
                    ingest_method: mode === 'append' ? 'picker_append' : 'picker_replace',
                    added_count: loadedImages.length,
                    image_count: nextCount,
                    file_types: extractFileTypes(loadedImages),
                    total_input_kb: sumFileSizeKb(loadedImages),
                });
            }
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
                trackEvent({
                    event: 'images_added',
                    ingest_method: 'debug_fixture',
                    added_count: loaded.length,
                    image_count: loaded.length,
                    file_types: extractFileTypes(loaded),
                });
            } catch (err) {
                console.error(err);
            }
        } else {
            onReplaceImages([]);
            trackEvent({
                event: 'image_list_action',
                action_type: 'clear_all',
                image_count: 0,
            });
        }
    };

    const handleOrientationChange = (newOrientation: Orientation) => {
        setOrientation(newOrientation);
        trackEvent({
            event: 'orientation_change',
            selected_orientation: newOrientation,
            image_count: images.length,
        });
    };

    const handleWidthChange = (e: ChangeEvent<HTMLInputElement>) => {
        setLocalWidth(e.target.value);
    };

    const applyWidth = () => {
        const val = localWidth.trim();

        if (val === '') {
            if (customWidth !== '') {
                trackEvent({
                    event: 'option_change',
                    option_name: 'custom_width',
                    option_value: 'auto',
                    image_count: images.length,
                });
            }
            setCustomWidth('');
            return;
        }

        const parsed = parseInt(val, 10);
        if (!isNaN(parsed) && parsed > 0) {
            const nextWidth = parsed.toString();
            setCustomWidth(nextWidth);
            if (nextWidth !== customWidth) {
                trackEvent({
                    event: 'option_change',
                    option_name: 'custom_width',
                    option_value: parsed,
                    image_count: images.length,
                });
            }
        } else {
            setLocalWidth(customWidth);
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            applyWidth();
        }
    };

    const commitQualityTracking = () => {
        const currentPercent = Math.round(quality * 100);
        if (currentPercent !== lastTrackedQualityRef.current) {
            lastTrackedQualityRef.current = currentPercent;
            trackEvent({
                event: 'option_change',
                option_name: 'quality',
                option_value: currentPercent,
                image_count: images.length,
            });
        }
    };

    const hasCustomWidth = localWidth.trim() !== '';
    const fileLabelText =
        images.length === 0
            ? 'No files chosen'
            : `${images.length} ${images.length === 1 ? 'image' : 'images'} selected`;

    const isPresetBg = (BG_PRESETS as readonly string[]).includes(backgroundColor);
    const bgSelectValue = isPresetBg ? backgroundColor : 'custom';
    const qualityPercent = Math.round(quality * 100);
    const sliderStyle = {
        '--attr-min': 10,
        '--attr-max': 100,
        '--control-value': qualityPercent,
    } as CSSProperties;

    return (
        <div id="FileControls">
            <div className="file-upload-row">
                <label className="file-upload">
                    <input
                        type="file"
                        name="upload"
                        id="upload"
                        accept="image/*"
                        multiple
                        hidden
                        onChange={(e) => handleFileUpload(e, 'replace')}
                    />
                    <span className="file-btn">Choose Files</span>
                    <span className="file-label" id="fileLabel">
                        {fileLabelText}
                    </span>
                </label>

                {images.length > 0 && (
                    <label className="add-files-btn">
                        <input
                            type="file"
                            name="addUpload"
                            id="addUpload"
                            accept="image/*"
                            multiple
                            hidden
                            onChange={(e) => handleFileUpload(e, 'append')}
                        />
                        <span>+ Add</span>
                    </label>
                )}
            </div>

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
                    <button
                        type="button"
                        className={`orientationButton ${orientation === 'grid' ? 'active' : ''}`}
                        aria-label="Grid (multi-column collage)"
                        aria-pressed={orientation === 'grid'}
                        title="Grid (multi-column collage)"
                        onClick={() => handleOrientationChange('grid')}
                    >
                        &#9638;
                    </button>
                </div>
            </div>

            {orientation === 'grid' && (
                <label className="selectRow" htmlFor="gridColumns">
                    <span className="label-text">Columns:</span>
                    <input
                        type="number"
                        id="gridColumns"
                        name="gridColumns"
                        min={1}
                        max={12}
                        value={columns}
                        onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val)) {
                                const clamped = Math.max(1, Math.min(12, val));
                                setColumns(clamped);
                                if (clamped !== columns) {
                                    trackEvent({
                                        event: 'option_change',
                                        option_name: 'columns',
                                        option_value: clamped,
                                        image_count: images.length,
                                    });
                                }
                            }
                        }}
                    />
                </label>
            )}

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

            <details
                className="advanced-options"
                onToggle={(e) => {
                    const isOpen = e.currentTarget.open;
                    if (isOpen === prevDetailsOpenRef.current) return;
                    prevDetailsOpenRef.current = isOpen;
                    trackEvent({
                        event: 'advanced_options_toggle',
                        is_open: isOpen,
                        image_count: images.length,
                    });
                }}
            >
                <summary>Layout &amp; Export Options</summary>
                <div className="advanced-body">
                    <label
                        className="selectRow"
                        htmlFor="sizeMode"
                        style={{ opacity: hasCustomWidth ? 0.5 : 1 }}
                    >
                        <span className="label-text">Sizing:</span>
                        <select
                            id="sizeMode"
                            value={sizeMode}
                            disabled={hasCustomWidth}
                            onChange={(e) => {
                                const nextSize = e.target.value as SizeMode;
                                setSizeMode(nextSize);
                                trackEvent({
                                    event: 'option_change',
                                    option_name: 'size_mode',
                                    option_value: nextSize,
                                    image_count: images.length,
                                });
                            }}
                        >
                            <option value="largest">Match largest</option>
                            <option value="smallest">Match smallest</option>
                            <option value="original">Original sizes</option>
                        </select>
                    </label>

                    <label className="selectRow" htmlFor="alignment">
                        <span className="label-text">Align:</span>
                        <select
                            id="alignment"
                            value={alignment}
                            onChange={(e) => {
                                const nextAlign = e.target.value as Alignment;
                                setAlignment(nextAlign);
                                trackEvent({
                                    event: 'option_change',
                                    option_name: 'alignment',
                                    option_value: nextAlign,
                                    image_count: images.length,
                                });
                            }}
                        >
                            <option value="start">Start</option>
                            <option value="center">Center</option>
                            <option value="end">End</option>
                        </select>
                    </label>

                    <div className="compact-pair">
                        <label className="compact-field" htmlFor="gapInput">
                            <span>Gap (px)</span>
                            <input
                                type="number"
                                id="gapInput"
                                min={0}
                                max={200}
                                value={gap}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    const nextGap = isNaN(val) ? 0 : Math.max(0, Math.min(200, val));
                                    setGap(nextGap);
                                    if (nextGap !== gap) {
                                        trackEvent({
                                            event: 'option_change',
                                            option_name: 'gap',
                                            option_value: nextGap,
                                            image_count: images.length,
                                        });
                                    }
                                }}
                            />
                        </label>
                        <label className="compact-field" htmlFor="paddingInput">
                            <span>Pad (px)</span>
                            <input
                                type="number"
                                id="paddingInput"
                                min={0}
                                max={200}
                                value={padding}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    const nextPad = isNaN(val) ? 0 : Math.max(0, Math.min(200, val));
                                    setPadding(nextPad);
                                    if (nextPad !== padding) {
                                        trackEvent({
                                            event: 'option_change',
                                            option_name: 'padding',
                                            option_value: nextPad,
                                            image_count: images.length,
                                        });
                                    }
                                }}
                            />
                        </label>
                    </div>

                    <div className="selectRow">
                        <label className="label-text" htmlFor="bgPreset">
                            Background:
                        </label>
                        <div className="bg-controls">
                            <select
                                id="bgPreset"
                                value={bgSelectValue}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    const nextBg = val === 'custom' ? '#1e293b' : val;
                                    setBackgroundColor(nextBg);
                                    trackEvent({
                                        event: 'option_change',
                                        option_name: 'background',
                                        option_value: classifyBackground(nextBg),
                                        image_count: images.length,
                                    });
                                }}
                            >
                                <option value="transparent">Transparent</option>
                                <option value="#ffffff">White</option>
                                <option value="#000000">Black</option>
                                <option value="#2f3b45">Slate</option>
                                <option value="custom">Custom</option>
                            </select>
                            {bgSelectValue === 'custom' && (
                                <input
                                    type="color"
                                    aria-label="Custom background color"
                                    value={isPresetBg ? '#1e293b' : backgroundColor}
                                    onChange={(e) => setBackgroundColor(e.target.value)}
                                    onBlur={() =>
                                        trackEvent({
                                            event: 'option_change',
                                            option_name: 'background',
                                            option_value: 'custom',
                                            image_count: images.length,
                                        })
                                    }
                                />
                            )}
                        </div>
                    </div>

                    <label className="selectRow" htmlFor="exportFormat">
                        <span className="label-text">Format:</span>
                        <select
                            id="exportFormat"
                            value={exportFormat}
                            onChange={(e) => {
                                const nextFormat = e.target.value as ExportFormat;
                                setExportFormat(nextFormat);
                                trackEvent({
                                    event: 'option_change',
                                    option_name: 'export_format',
                                    option_value: formatExportType(nextFormat),
                                    image_count: images.length,
                                });
                            }}
                        >
                            <option value="image/jpeg">JPEG (.jpg)</option>
                            <option value="image/png">PNG (.png)</option>
                            <option value="image/webp">WebP (.webp)</option>
                        </select>
                    </label>

                    {exportFormat !== 'image/png' && (
                        <div className="sliderRow">
                            <div className="slider-header">
                                <label htmlFor="exportQuality">Quality:</label>
                                <span className="slider-value">{qualityPercent}%</span>
                            </div>
                            <input
                                type="range"
                                id="exportQuality"
                                min={10}
                                max={100}
                                step={5}
                                value={qualityPercent}
                                aria-valuetext={`${qualityPercent}%`}
                                style={sliderStyle}
                                onChange={(e) => setQuality(Number(e.target.value) / 100)}
                                onPointerUp={commitQualityTracking}
                                onKeyUp={commitQualityTracking}
                                onBlur={commitQualityTracking}
                            />
                        </div>
                    )}

                    {exportFormat === 'image/jpeg' && backgroundColor === 'transparent' && (
                        <p className="format-hint">
                            Transparent areas export as white when saving as JPEG.
                        </p>
                    )}
                </div>
            </details>

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

            <div className="export-actions">
                <button
                    type="button"
                    id="download"
                    onClick={onDownload}
                    disabled={images.length === 0}
                    className={images.length === 0 ? 'disabled' : ''}
                >
                    Download image
                </button>

                <span className="copy-wrapper">
                    <button
                        type="button"
                        id="copyImage"
                        onClick={onCopy}
                        disabled={images.length === 0}
                        className={images.length === 0 ? 'disabled' : ''}
                        data-copied={copyFeedback.state === 'copied' ? '' : undefined}
                        data-failed={copyFeedback.state === 'failed' ? '' : undefined}
                    >
                        Copy
                    </button>
                    <span
                        className="copy-status"
                        role="status"
                        data-visible={copyFeedback.text ? 'true' : 'false'}
                        data-state={copyFeedback.state}
                    >
                        {copyFeedback.text}
                    </span>
                </span>
            </div>
        </div>
    );
};

export default FileControls;
