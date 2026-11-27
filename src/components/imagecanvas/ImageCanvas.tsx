import { useEffect, type RefObject } from 'react';
import { type ImageItem, type Orientation } from '../../types';
import { computeCanvasLayout } from '../../utils/canvasLayout';

interface ImageCanvasProps {
    canvasRef: RefObject<HTMLCanvasElement | null>;
    images: ImageItem[];
    orientation: Orientation;
    scaleToLargest: boolean;
    customWidth: string;
    setCanvasWidth: (width: number) => void;
}

const ImageCanvas = ({
    canvasRef,
    images,
    orientation,
    scaleToLargest,
    customWidth,
    setCanvasWidth,
}: ImageCanvasProps) => {
    useEffect(() => {
        // Cleanup flag prevents stale async draws from overwriting newer renders (e.g. rapid drag)
        let isActive = true;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (images.length === 0) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            setCanvasWidth(0);
            return;
        }

        const layout = computeCanvasLayout(images, orientation, scaleToLargest, customWidth);
        canvas.width = layout.width;
        canvas.height = layout.height;
        setCanvasWidth(canvas.width);

        const drawHighQuality = async () => {
            const resampled = await Promise.all(
                layout.drawQueue.map(async (item) => {
                    try {
                        // createImageBitmap requires integer dimensions to avoid DOMExceptions
                        const bitmap = await createImageBitmap(item.img, {
                            resizeWidth: Math.round(item.w),
                            resizeHeight: Math.round(item.h),
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

            for (const { item, bitmap } of resampled) {
                if (bitmap) {
                    try {
                        ctx.drawImage(bitmap, item.x, item.y);
                    } finally {
                        bitmap.close();
                    }
                } else {
                    // Fallback when a browser rejects createImageBitmap for a specific image encoding
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(item.img, item.x, item.y, item.w, item.h);
                }
            }
        };

        drawHighQuality();

        return () => {
            isActive = false;
        };
    }, [images, orientation, scaleToLargest, customWidth, canvasRef, setCanvasWidth]);

    return (
        <div id="canvasContainer" className={images.length > 0 ? '' : 'hidden'}>
            <canvas id="canvas" ref={canvasRef}></canvas>
        </div>
    );
};

export default ImageCanvas;
