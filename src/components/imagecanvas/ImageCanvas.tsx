import { useEffect, useMemo, useState, type RefObject } from 'react';
import {
    type Alignment,
    type CanvasSize,
    type ExportFormat,
    type ImageItem,
    type Orientation,
    type SizeMode,
} from '../../types';
import { computeCanvasLayout } from '../../utils/canvasLayout';

interface ImageCanvasProps {
    canvasRef: RefObject<HTMLCanvasElement | null>;
    images: ImageItem[];
    orientation: Orientation;
    sizeMode: SizeMode;
    alignment: Alignment;
    customWidth: string;
    columns: number;
    gap: number;
    padding: number;
    backgroundColor: string;
    exportFormat: ExportFormat;
    quality: number;
    canvasSize: CanvasSize;
    setCanvasSize: (size: CanvasSize) => void;
}

function formatByteEstimate(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const ImageCanvas = ({
    canvasRef,
    images,
    orientation,
    sizeMode,
    alignment,
    customWidth,
    columns,
    gap,
    padding,
    backgroundColor,
    exportFormat,
    quality,
    canvasSize,
    setCanvasSize,
}: ImageCanvasProps) => {
    const [estimatedBytes, setEstimatedBytes] = useState<number | null>(null);
    const [zoomMode, setZoomMode] = useState<'fit' | 'actual'>('fit');

    const layout = useMemo(
        () =>
            computeCanvasLayout(images, {
                orientation,
                sizeMode,
                alignment,
                customWidth,
                columns,
                gap,
                padding,
            }),
        [images, orientation, sizeMode, alignment, customWidth, columns, gap, padding],
    );

    useEffect(() => {
        let isActive = true;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (images.length === 0) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            setCanvasSize({ width: 0, height: 0 });
            return;
        }

        canvas.width = layout.width;
        canvas.height = layout.height;
        setCanvasSize({ width: canvas.width, height: canvas.height });

        const drawHighQuality = async () => {
            const resampled = await Promise.all(
                layout.drawQueue.map(async (item) => {
                    try {
                        const bitmap = await createImageBitmap(item.img, {
                            resizeWidth: Math.round(item.drawW),
                            resizeHeight: Math.round(item.drawH),
                            resizeQuality: 'high',
                        });
                        return { item, bitmap };
                    } catch {
                        return { item, bitmap: null as ImageBitmap | null };
                    }
                }),
            );

            if (!isActive) {
                for (const { bitmap } of resampled) {
                    bitmap?.close();
                }
                return;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (backgroundColor !== 'transparent') {
                ctx.fillStyle = backgroundColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            for (const { item, bitmap } of resampled) {
                if (item.rotation === 0 && !item.flipH) {
                    if (bitmap) {
                        try {
                            ctx.drawImage(bitmap, item.x, item.y);
                        } finally {
                            bitmap.close();
                        }
                    } else {
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';
                        ctx.drawImage(item.img, item.x, item.y, item.w, item.h);
                    }
                    continue;
                }

                ctx.save();
                ctx.translate(item.x + item.w / 2, item.y + item.h / 2);
                if (item.rotation !== 0) {
                    ctx.rotate((item.rotation * Math.PI) / 180);
                }
                if (item.flipH) {
                    ctx.scale(-1, 1);
                }

                if (bitmap) {
                    try {
                        ctx.drawImage(bitmap, -item.drawW / 2, -item.drawH / 2);
                    } finally {
                        bitmap.close();
                    }
                } else {
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(
                        item.img,
                        -item.drawW / 2,
                        -item.drawH / 2,
                        item.drawW,
                        item.drawH,
                    );
                }
                ctx.restore();
            }

            if (typeof canvas.toBlob === 'function') {
                canvas.toBlob(
                    (blob) => {
                        if (isActive) {
                            setEstimatedBytes(blob ? blob.size : null);
                        }
                    },
                    exportFormat,
                    exportFormat === 'image/png' ? undefined : quality,
                );
            }
        };

        drawHighQuality();

        return () => {
            isActive = false;
        };
    }, [
        images.length,
        layout,
        backgroundColor,
        exportFormat,
        quality,
        canvasRef,
        setCanvasSize,
    ]);

    const displayedEstimatedBytes = images.length === 0 ? null : estimatedBytes;

    return (
        <div id="canvasContainer" className={images.length > 0 ? '' : 'hidden'}>
            <div className="canvas-toolbar">
                <span className="canvas-dimensions" id="canvasDimensions">
                    {canvasSize.width} &times; {canvasSize.height} px
                    {displayedEstimatedBytes !== null
                        ? ` (~${formatByteEstimate(displayedEstimatedBytes)})`
                        : ''}
                </span>
                <button
                    type="button"
                    className={`zoom-toggle ${zoomMode === 'actual' ? 'active' : ''}`}
                    aria-pressed={zoomMode === 'actual'}
                    onClick={() => setZoomMode((prev) => (prev === 'fit' ? 'actual' : 'fit'))}
                >
                    {zoomMode === 'fit' ? '100% Zoom' : 'Fit View'}
                </button>
            </div>

            {layout.exceedsLimits && (
                <p className="canvas-warning" role="status">
                    Output exceeds typical browser canvas limits (16,384 px / 268 MP). Consider
                    setting a lower Width.
                </p>
            )}

            <div className={`canvas-viewport ${zoomMode === 'actual' ? 'actual-size' : 'fit-size'}`}>
                <canvas
                    id="canvas"
                    ref={canvasRef}
                    className={backgroundColor === 'transparent' ? 'checkerboard' : ''}
                ></canvas>
            </div>
        </div>
    );
};

export default ImageCanvas;
