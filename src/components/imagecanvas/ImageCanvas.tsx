import { useEffect, type RefObject } from 'react';
import { type ImageItem, type Orientation } from '../../types';

interface ImageCanvasProps {
    canvasRef: RefObject<HTMLCanvasElement>;
    images: ImageItem[];
    orientation: Orientation;
    scaleToLargest: boolean;
    customWidth: string;
    setCanvasWidth: (width: number) => void;
    canvasWidth: number;
}

const ImageCanvas = ({ canvasRef, images, orientation, scaleToLargest, customWidth, setCanvasWidth }: ImageCanvasProps) => {

    useEffect(() => {
        // 1. Cleanup flag to prevent race conditions during rapid re-renders (like dragging)
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

        const getBaseDimension = (dimension: 'width' | 'height') => {
            const values = images.map((img) => img[dimension]);
            return scaleToLargest ? Math.max(...values) : Math.min(...values);
        };

        const isPortrait = orientation === 'portrait';
        const parsedCustomWidth = parseInt(customWidth, 10);
        const hasCustomWidth = !isNaN(parsedCustomWidth) && parsedCustomWidth > 0;

        let finalCanvasWidth = 0;

        // 2. Pre-calculate all math synchronously and build a drawing queue
        const drawQueue: { img: HTMLImageElement, x: number, y: number, w: number, h: number }[] = [];

        if (isPortrait) {
            const baseWidth = hasCustomWidth ? parsedCustomWidth : getBaseDimension('width');
            const scaleFactors = images.map((img) => baseWidth / img.width);
            const newHeights = images.map((img, i) => img.height * scaleFactors[i]);

            canvas.width = baseWidth;
            canvas.height = newHeights.reduce((acc, h) => acc + h, 0);

            let yOffset = 0;
            images.forEach((img, i) => {
                drawQueue.push({
                    img: img.imgElement,
                    x: 0,
                    y: yOffset,
                    w: baseWidth,
                    h: newHeights[i]
                });
                yOffset += newHeights[i];
            });
            finalCanvasWidth = canvas.width;
        } else {
            let baseHeight: number;

            if (hasCustomWidth) {
                const aspectSum = images.reduce((sum, img) => sum + (img.width / img.height), 0);
                baseHeight = parsedCustomWidth / aspectSum;
            } else {
                baseHeight = getBaseDimension('height');
            }

            const scaleFactors = images.map((img) => baseHeight / img.height);
            const newWidths = images.map((img, i) => img.width * scaleFactors[i]);

            canvas.height = baseHeight;
            canvas.width = newWidths.reduce((acc, w) => acc + w, 0);

            let xOffset = 0;
            images.forEach((img, i) => {
                drawQueue.push({
                    img: img.imgElement,
                    x: xOffset,
                    y: 0,
                    w: newWidths[i],
                    h: baseHeight
                });
                xOffset += newWidths[i];
            });
            finalCanvasWidth = canvas.width;
        }

        setCanvasWidth(finalCanvasWidth);

        // 3. The Modern Web API Asynchronous Drawing Engine
        const drawHighQuality = async () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (const item of drawQueue) {
                if (!isActive) return; // Abort immediately if component unmounted or re-rendered

                try {
                    // createImageBitmap demands whole numbers to prevent DOMExceptions in strict browsers
                    const bitmap = await createImageBitmap(item.img, {
                        resizeWidth: Math.round(item.w),
                        resizeHeight: Math.round(item.h),
                        resizeQuality: 'high'
                    });

                    if (!isActive) return; // Check again after the await
                    ctx.drawImage(bitmap, item.x, item.y);
                } catch (error) {
                    // Safe fallback to standard rendering if a browser struggles with the specific image encoding
                    if (!isActive) return;
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(item.img, item.x, item.y, item.w, item.h);
                }
            }
        };

        drawHighQuality();

        // 4. Clean up the effect to shut down stale background threads
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
