import { type DragEvent, useCallback, useEffect, useRef, useState } from 'react';
import './App.scss';
import Controls from './components/controls/Controls';
import FileControls, { type CopyFeedback } from './components/filecontrols/FileControls';
import HelpDialog from './components/help/HelpDialog';
import ImageCanvas from './components/imagecanvas/ImageCanvas';
import ImageList from './components/imagelist/ImageList';
import {
    type Alignment,
    type CanvasSize,
    type ExportFormat,
    type ImageItem,
    type Orientation,
    type Rotation,
    type SizeMode,
} from './types';
import { filterImageFiles, loadImageFiles, revokeImageUrls } from './utils/imageLoader';

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

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastCopyMessageRef = useRef<string>('');
    const dragDepthRef = useRef<number>(0);

    const replaceImages = useCallback((nextImages: ImageItem[]) => {
        setImages((prev) => {
            revokeImageUrls(prev);
            return nextImages;
        });
    }, []);

    const appendImages = useCallback((moreImages: ImageItem[]) => {
        if (moreImages.length === 0) return;
        setImages((prev) => [...prev, ...moreImages]);
    }, []);

    const removeImage = useCallback((id: string) => {
        setImages((prev) => {
            const target = prev.find((item) => item.id === id);
            if (target) revokeImageUrls([target]);
            return prev.filter((item) => item.id !== id);
        });
    }, []);

    const rotateImage = useCallback((id: string) => {
        setImages((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, rotation: nextRotation(item.rotation) } : item,
            ),
        );
    }, []);

    const flipImage = useCallback((id: string) => {
        setImages((prev) =>
            prev.map((item) => (item.id === id ? { ...item, flipH: !item.flipH } : item)),
        );
    }, []);

    const clearImages = useCallback(() => {
        replaceImages([]);
    }, [replaceImages]);

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
        };
    }, []);

    // Global paste handler for clipboard images (Cmd+V / Ctrl+V)
    useEffect(() => {
        const handlePaste = async (e: ClipboardEvent) => {
            const pastedFiles = e.clipboardData?.files;
            if (!pastedFiles || pastedFiles.length === 0) return;

            const imageFiles = filterImageFiles(pastedFiles);
            if (imageFiles.length === 0) return;

            e.preventDefault();
            try {
                const loaded = await loadImageFiles(imageFiles);
                appendImages(loaded);
            } catch (err) {
                console.error(err);
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [appendImages]);

    // PWA File Handling API (launchQueue)
    useEffect(() => {
        if (!window.launchQueue) return;
        window.launchQueue.setConsumer(async (launchParams) => {
            if (!launchParams.files || launchParams.files.length === 0) return;
            try {
                const files = await Promise.all(launchParams.files.map((handle) => handle.getFile()));
                const loaded = await loadImageFiles(files);
                appendImages(loaded);
            } catch (err) {
                console.error(err);
            }
        });
    }, [appendImages]);

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
                    const loaded = await loadImageFiles(files);
                    appendImages(loaded);
                }
                window.history.replaceState({}, '', '/');
            } catch (err) {
                console.error(err);
            }
        })();

        return () => {
            active = false;
        };
    }, [appendImages]);

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
                    } else {
                        triggerDownload(sourceCanvas.toDataURL(exportFormat, exportQuality), downloadName);
                    }
                },
                exportFormat,
                exportQuality,
            );
            return;
        }

        triggerDownload(sourceCanvas.toDataURL(exportFormat, exportQuality), downloadName);
    };

    const handleCopy = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        try {
            if (
                typeof navigator.clipboard?.write !== 'function' ||
                typeof ClipboardItem === 'undefined' ||
                typeof canvas.toBlob !== 'function'
            ) {
                showCopyFeedback(false);
                return;
            }

            const blob = await new Promise<Blob | null>((resolve) => {
                canvas.toBlob((result) => resolve(result), 'image/png');
            });

            if (!blob) {
                showCopyFeedback(false);
                return;
            }

            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            showCopyFeedback(true);
        } catch {
            showCopyFeedback(false);
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

        try {
            const loaded = await loadImageFiles(droppedFiles);
            appendImages(loaded);
        } catch (err) {
            console.error(err);
        }
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
                <h1 id="title">Image Join</h1>
                <button
                    type="button"
                    id="helpButton"
                    className="help-btn"
                    aria-label="Open help and keyboard shortcuts"
                    title="Help & shortcuts"
                    onClick={() => setIsHelpOpen(true)}
                >
                    ?
                </button>
            </header>

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
                />
            </main>

            <HelpDialog isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
        </div>
    );
}

export default App;
