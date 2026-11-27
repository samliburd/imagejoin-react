import { type DragEvent, useCallback, useEffect, useRef, useState } from 'react';
import './App.scss';
import Controls from './components/controls/Controls';
import FileControls, { type CopyFeedback } from './components/filecontrols/FileControls';
import HelpDialog from './components/help/HelpDialog';
import { CloseIcon } from './components/icons/Icons';
import ImageCanvas from './components/imagecanvas/ImageCanvas';
import ImageList from './components/imagelist/ImageList';
import SeoInfoSection from './components/info/SeoInfoSection';
import {
    type Alignment,
    type CanvasSize,
    type ExportFormat,
    type ImageItem,
    type IngestMethod,
    type Orientation,
    type Rotation,
    type SizeMode,
} from './types';
import {
    buildExportSnapshot,
    extractFileTypes,
    sumFileSizeKb,
    trackEvent,
} from './utils/analytics';
import { loadImageFilesDetailed, revokeImageUrls } from './utils/imageLoader';

const FORMAT_EXTENSION: Record<ExportFormat, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
};

const SHARED_CACHE = 'imagejoin-shared-files';

function triggerDownload(href: string, downloadName: string): void {
    const link = document.createElement('a');
    link.href = href;
    link.download = downloadName;
    link.click();
}

function formatFailedFilesMessage(failedNames: string[]): string {
    const preview = failedNames.slice(0, 3).join(', ');
    const extra = failedNames.length > 3 ? ` (+${failedNames.length - 3} more)` : '';
    return `Skipped ${failedNames.length} unsupported or unreadable file(s): ${preview}${extra}. Try PNG, JPEG, WebP, GIF, or AVIF.`;
}

function nextRotation(current: Rotation = 0): Rotation {
    return ((current + 90) % 360) as Rotation;
}

function App() {
    const searchParams = new URLSearchParams(window.location.search);
    const debugQuery = searchParams.get('debug');
    const isLocalhost =
        window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const showDebug =
        (import.meta.env.DEV && debugQuery !== 'false') ||
        (isLocalhost && debugQuery === 'true');

    const [images, setImages] = useState<ImageItem[]>([]);
    const [orientation, setOrientation] = useState<Orientation>('portrait');
    const [columns, setColumns] = useState<number>(2);
    const [sizeMode, setSizeMode] = useState<SizeMode>('largest');
    const [alignment, setAlignment] = useState<Alignment>('center');
    const [gap, setGap] = useState<number>(0);
    const [padding, setPadding] = useState<number>(0);
    const [backgroundColor, setBackgroundColor] = useState<string>('transparent');
    const [exportFormat, setExportFormat] = useState<ExportFormat>('image/jpeg');
    const [quality, setQuality] = useState<number>(0.92);
    const [filename, setFilename] = useState<string>('');
    const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width: 0, height: 0 });
    const [customWidth, setCustomWidth] = useState<string>('');
    const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
    const [isFileDragging, setIsFileDragging] = useState<boolean>(false);
    const [copyFeedback, setCopyFeedback] = useState<CopyFeedback>({ text: '', state: 'idle' });
    const [errorBanner, setErrorBanner] = useState<string | null>(null);
    const [undoClearImages, setUndoClearImages] = useState<ImageItem[] | null>(null);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const undoClearRef = useRef<ImageItem[] | null>(null);
    const lastCopyMessageRef = useRef<string>('');
    const dragDepthRef = useRef<number>(0);
    const imagesRef = useRef<ImageItem[]>(images);

    useEffect(() => {
        imagesRef.current = images;
    }, [images]);

    const discardPendingUndo = useCallback(() => {
        if (undoTimerRef.current !== null) {
            clearTimeout(undoTimerRef.current);
            undoTimerRef.current = null;
        }
        if (undoClearRef.current) {
            revokeImageUrls(undoClearRef.current);
            undoClearRef.current = null;
        }
        setUndoClearImages(null);
    }, []);

    const replaceImages = useCallback(
        (nextImages: ImageItem[]) => {
            discardPendingUndo();
            setErrorBanner(null);
            setImages((prev) => {
                revokeImageUrls(prev);
                return nextImages;
            });
        },
        [discardPendingUndo],
    );

    const appendImages = useCallback(
        (moreImages: ImageItem[]) => {
            if (moreImages.length === 0) return;
            discardPendingUndo();
            setImages((prev) => [...prev, ...moreImages]);
        },
        [discardPendingUndo],
    );

    const appendIngestedImages = useCallback(
        (loaded: ImageItem[], ingestMethod: IngestMethod) => {
            if (loaded.length === 0) return;
            const nextCount = imagesRef.current.length + loaded.length;
            appendImages(loaded);
            trackEvent({
                event: 'images_added',
                ingest_method: ingestMethod,
                added_count: loaded.length,
                image_count: nextCount,
                file_types: extractFileTypes(loaded),
                total_input_kb: sumFileSizeKb(loaded),
            });
        },
        [appendImages],
    );

    const ingestFiles = useCallback(
        async (files: FileList | readonly File[], ingestMethod: IngestMethod) => {
            try {
                const { loaded, failedNames } = await loadImageFilesDetailed(files);
                if (failedNames.length > 0) {
                    setErrorBanner(formatFailedFilesMessage(failedNames));
                    trackEvent({
                        event: 'file_ingest_error',
                        ingest_method: ingestMethod,
                        skipped_count: failedNames.length,
                        loaded_count: loaded.length,
                    });
                } else if (loaded.length > 0) {
                    setErrorBanner(null);
                }
                appendIngestedImages(loaded, ingestMethod);
            } catch (err) {
                console.error(err);
                setErrorBanner('Could not load the selected image files.');
                trackEvent({
                    event: 'file_ingest_error',
                    ingest_method: ingestMethod,
                    skipped_count: files.length,
                    loaded_count: 0,
                });
            }
        },
        [appendIngestedImages],
    );

    const removeImage = useCallback((id: string) => {
        const current = imagesRef.current;
        const hasTarget = current.some((item) => item.id === id);
        setImages((prev) => {
            const target = prev.find((item) => item.id === id);
            if (target) revokeImageUrls([target]);
            return prev.filter((item) => item.id !== id);
        });
        if (hasTarget) {
            trackEvent({
                event: 'image_list_action',
                action_type: 'remove',
                image_count: Math.max(0, current.length - 1),
            });
        }
    }, []);

    const rotateImage = useCallback((id: string) => {
        const current = imagesRef.current;
        const target = current.find((item) => item.id === id);
        setImages((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, rotation: nextRotation(item.rotation) } : item,
            ),
        );
        if (target) {
            trackEvent({
                event: 'image_list_action',
                action_type: 'rotate',
                image_count: current.length,
                rotation_deg: nextRotation(target.rotation),
            });
        }
    }, []);

    const flipImage = useCallback((id: string) => {
        const current = imagesRef.current;
        const target = current.find((item) => item.id === id);
        setImages((prev) =>
            prev.map((item) => (item.id === id ? { ...item, flipH: !item.flipH } : item)),
        );
        if (target) {
            trackEvent({
                event: 'image_list_action',
                action_type: 'flip',
                image_count: current.length,
                is_flipped: !target.flipH,
            });
        }
    }, []);

    const clearImages = useCallback(() => {
        const current = imagesRef.current;
        if (current.length === 0) return;

        discardPendingUndo();
        undoClearRef.current = current;
        setUndoClearImages(current);
        setImages([]);

        undoTimerRef.current = setTimeout(() => {
            discardPendingUndo();
        }, 6000);

        trackEvent({
            event: 'image_list_action',
            action_type: 'clear_all',
            image_count: 0,
        });
    }, [discardPendingUndo]);

    const handleUndoClear = useCallback(() => {
        if (!undoClearRef.current) return;
        const restored = undoClearRef.current;
        if (undoTimerRef.current !== null) {
            clearTimeout(undoTimerRef.current);
            undoTimerRef.current = null;
        }
        undoClearRef.current = null;
        setUndoClearImages(null);
        setImages(restored);
        trackEvent({
            event: 'image_list_action',
            action_type: 'undo_clear',
            image_count: restored.length,
        });
    }, []);

    const showCopyFeedback = useCallback((ok: boolean) => {
        if (copyTimerRef.current !== null) {
            clearTimeout(copyTimerRef.current);
        }
        let message = ok ? 'Copied' : 'Copy failed';
        if (message === lastCopyMessageRef.current) {
            message += '\u00A0';
        }
        lastCopyMessageRef.current = message;

        setCopyFeedback({ text: message, state: ok ? 'copied' : 'failed' });
        copyTimerRef.current = setTimeout(() => {
            setCopyFeedback({ text: '', state: 'idle' });
            copyTimerRef.current = null;
        }, 2000);
    }, []);

    useEffect(() => {
        return () => {
            if (copyTimerRef.current !== null) {
                clearTimeout(copyTimerRef.current);
            }
            discardPendingUndo();
        };
    }, [discardPendingUndo]);

    // Global paste handler for clipboard images (Cmd+V / Ctrl+V)
    useEffect(() => {
        const handlePaste = async (e: ClipboardEvent) => {
            const pastedFiles = e.clipboardData?.files;
            if (!pastedFiles || pastedFiles.length === 0) return;

            e.preventDefault();
            await ingestFiles(pastedFiles, 'paste');
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [ingestFiles]);

    // PWA File Handling API (launchQueue)
    useEffect(() => {
        if (!window.launchQueue) return;
        window.launchQueue.setConsumer(async (launchParams) => {
            if (!launchParams.files || launchParams.files.length === 0) return;
            try {
                const files = await Promise.all(launchParams.files.map((handle) => handle.getFile()));
                await ingestFiles(files, 'pwa_file_handler');
            } catch (err) {
                console.error(err);
                setErrorBanner('Could not open files shared to ImageJoin.');
            }
        });
    }, [ingestFiles]);

    // PWA Share Target consumption (?shared=1 from share-target-sw.js)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('shared') !== '1' || typeof caches === 'undefined') return;

        let active = true;
        (async () => {
            try {
                const cache = await caches.open(SHARED_CACHE);
                const requests = await cache.keys();
                const files: File[] = [];
                for (const req of requests) {
                    const res = await cache.match(req);
                    if (!res) continue;
                    const blob = await res.blob();
                    const rawName = res.headers.get('X-Shared-Filename');
                    const name = rawName ? decodeURIComponent(rawName) : 'shared-image.png';
                    files.push(new File([blob], name, { type: blob.type || 'image/png' }));
                    await cache.delete(req);
                }
                if (active && files.length > 0) {
                    await ingestFiles(files, 'pwa_share_target');
                }
                window.history.replaceState({}, '', '/');
            } catch (err) {
                console.error(err);
                if (active) setErrorBanner('Could not load shared image files.');
            }
        })();

        return () => {
            active = false;
        };
    }, [ingestFiles]);

    const getExportSourceCanvas = (format: ExportFormat): HTMLCanvasElement | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        if (format === 'image/jpeg' && backgroundColor === 'transparent') {
            const whiteBacked = document.createElement('canvas');
            whiteBacked.width = canvas.width;
            whiteBacked.height = canvas.height;
            const ctx = whiteBacked.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, whiteBacked.width, whiteBacked.height);
                ctx.drawImage(canvas, 0, 0);
                return whiteBacked;
            }
        }
        return canvas;
    };

    const emitExportEvent = (outputBytes?: number) => {
        const snapshot = buildExportSnapshot({
            images,
            orientation,
            columns,
            sizeMode,
            customWidth,
            alignment,
            gap,
            padding,
            backgroundColor,
            exportFormat,
            quality,
            filename,
            canvasSize,
            outputBytes,
        });
        trackEvent({
            event: 'image_export',
            export_method: 'download',
            ...snapshot,
        });
    };

    const emitCopyEvent = (copySuccess: boolean, outputBytes?: number) => {
        const snapshot = buildExportSnapshot({
            images,
            orientation,
            columns,
            sizeMode,
            customWidth,
            alignment,
            gap,
            padding,
            backgroundColor,
            exportFormat,
            quality,
            filename,
            canvasSize,
            outputBytes,
        });
        trackEvent({
            event: 'image_copy',
            export_method: 'clipboard',
            copy_success: copySuccess,
            ...snapshot,
        });
    };

    const handleDownload = () => {
        const sourceCanvas = getExportSourceCanvas(exportFormat);
        if (!sourceCanvas) return;

        const ext = FORMAT_EXTENSION[exportFormat];
        const downloadName = `${filename.trim() || 'joinedimage'}.${ext}`;
        const exportQuality = exportFormat === 'image/png' ? undefined : quality;

        if (typeof sourceCanvas.toBlob === 'function') {
            sourceCanvas.toBlob(
                (blob) => {
                    if (blob) {
                        const blobUrl = URL.createObjectURL(blob);
                        triggerDownload(blobUrl, downloadName);
                        setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
                        emitExportEvent(blob.size);
                    } else {
                        triggerDownload(sourceCanvas.toDataURL(exportFormat, exportQuality), downloadName);
                        emitExportEvent();
                    }
                },
                exportFormat,
                exportQuality,
            );
            return;
        }

        triggerDownload(sourceCanvas.toDataURL(exportFormat, exportQuality), downloadName);
        emitExportEvent();
    };

    const handleCopy = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        let blob: Blob | null = null;
        try {
            if (
                typeof navigator.clipboard?.write !== 'function' ||
                typeof ClipboardItem === 'undefined' ||
                typeof canvas.toBlob !== 'function'
            ) {
                showCopyFeedback(false);
                emitCopyEvent(false);
                return;
            }

            blob = await new Promise<Blob | null>((resolve) => {
                canvas.toBlob((result) => resolve(result), 'image/png');
            });

            if (!blob) {
                showCopyFeedback(false);
                emitCopyEvent(false);
                return;
            }

            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            showCopyFeedback(true);
            emitCopyEvent(true, blob.size);
        } catch {
            showCopyFeedback(false);
            emitCopyEvent(false, blob?.size);
        }
    };

    const hasFilePayload = (e: DragEvent<HTMLDivElement>): boolean =>
        Array.from(e.dataTransfer?.types ?? []).includes('Files');

    const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
        if (!hasFilePayload(e)) return;
        e.preventDefault();
        dragDepthRef.current += 1;
        setIsFileDragging(true);
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        if (!hasFilePayload(e)) return;
        e.preventDefault();
    };

    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
        if (!hasFilePayload(e)) return;
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
        if (dragDepthRef.current === 0) {
            setIsFileDragging(false);
        }
    };

    const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
        if (!hasFilePayload(e)) return;
        e.preventDefault();
        dragDepthRef.current = 0;
        setIsFileDragging(false);

        const droppedFiles = e.dataTransfer?.files;
        if (!droppedFiles || droppedFiles.length === 0) return;

        await ingestFiles(droppedFiles, 'drag_drop');
    };

    return (
        <div
            className="app-shell"
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <header className="app-header">
                <div className="app-brand">
                    <h1 id="title">ImageJoin</h1>
                    <p className="app-tagline">
                        Combine, stack &amp; grid images privately in your browser
                    </p>
                </div>
                <button
                    type="button"
                    id="helpButton"
                    className="help-btn"
                    aria-label="Open help and keyboard shortcuts"
                    title="Help & shortcuts"
                    onClick={() => {
                        setIsHelpOpen(true);
                        trackEvent({
                            event: 'help_dialog_toggle',
                            action: 'open',
                            image_count: images.length,
                        });
                    }}
                >
                    ?
                </button>
            </header>

            {errorBanner && (
                <div className="app-banner app-banner-error" role="alert">
                    <span>{errorBanner}</span>
                    <button
                        type="button"
                        className="banner-icon-btn"
                        aria-label="Dismiss error"
                        onClick={() => setErrorBanner(null)}
                    >
                        <CloseIcon />
                    </button>
                </div>
            )}

            {undoClearImages && (
                <div className="app-banner app-banner-undo" role="status">
                    <span>
                        Cleared {undoClearImages.length}{' '}
                        {undoClearImages.length === 1 ? 'image' : 'images'}.
                    </span>
                    <div className="banner-actions">
                        <button
                            type="button"
                            className="banner-undo-btn"
                            onClick={handleUndoClear}
                        >
                            Undo
                        </button>
                        <button
                            type="button"
                            className="banner-icon-btn"
                            aria-label="Dismiss undo notification"
                            onClick={discardPendingUndo}
                        >
                            <CloseIcon />
                        </button>
                    </div>
                </div>
            )}

            {isFileDragging && (
                <div className="drop-overlay" aria-hidden="true">
                    <div className="drop-overlay-card">Drop images to add</div>
                </div>
            )}

            <main>
                <Controls>
                    <FileControls
                        images={images}
                        onReplaceImages={replaceImages}
                        onAppendImages={appendImages}
                        orientation={orientation}
                        setOrientation={setOrientation}
                        columns={columns}
                        setColumns={setColumns}
                        sizeMode={sizeMode}
                        setSizeMode={setSizeMode}
                        alignment={alignment}
                        setAlignment={setAlignment}
                        gap={gap}
                        setGap={setGap}
                        padding={padding}
                        setPadding={setPadding}
                        backgroundColor={backgroundColor}
                        setBackgroundColor={setBackgroundColor}
                        exportFormat={exportFormat}
                        setExportFormat={setExportFormat}
                        quality={quality}
                        setQuality={setQuality}
                        filename={filename}
                        setFilename={setFilename}
                        onDownload={handleDownload}
                        onCopy={handleCopy}
                        copyFeedback={copyFeedback}
                        debug={showDebug}
                        customWidth={customWidth}
                        setCustomWidth={setCustomWidth}
                        canvasWidth={canvasSize.width}
                        fileInputRef={fileInputRef}
                        onNotifyError={setErrorBanner}
                    />
                    <ImageList
                        images={images}
                        setImages={setImages}
                        onRemoveImage={removeImage}
                        onRotateImage={rotateImage}
                        onFlipImage={flipImage}
                        onClearAll={clearImages}
                    />
                </Controls>
                <ImageCanvas
                    canvasRef={canvasRef}
                    images={images}
                    orientation={orientation}
                    sizeMode={sizeMode}
                    alignment={alignment}
                    customWidth={customWidth}
                    columns={columns}
                    gap={gap}
                    padding={padding}
                    backgroundColor={backgroundColor}
                    exportFormat={exportFormat}
                    quality={quality}
                    canvasSize={canvasSize}
                    setCanvasSize={setCanvasSize}
                    onBrowseFiles={() => {
                        trackEvent({
                            event: 'empty_dropzone_browse',
                            image_count: 0,
                        });
                        fileInputRef.current?.click();
                    }}
                />
            </main>

            <SeoInfoSection />

            <HelpDialog
                isOpen={isHelpOpen}
                onClose={() => {
                    setIsHelpOpen(false);
                    trackEvent({
                        event: 'help_dialog_toggle',
                        action: 'close',
                        image_count: images.length,
                    });
                }}
            />
        </div>
    );
}

export default App;
