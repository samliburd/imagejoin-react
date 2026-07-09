import { useEffect, type RefObject } from 'react';
import { type ImageItem, type Orientation } from '../../types';

interface ImageCanvasProps {
    canvasRef: RefObject<HTMLCanvasElement>;
    images: ImageItem[];
    orientation: Orientation;
    scaleToLargest: boolean;
    // NEW Props
    customWidth: string;
    setCanvasWidth: (width: number) => void;
    canvasWidth: number;
}

const ImageCanvas = ({ canvasRef, images, orientation, scaleToLargest, customWidth, setCanvasWidth }: ImageCanvasProps) => {

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

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

        if (isPortrait) {
            // Apply custom width override directly
            const baseWidth = hasCustomWidth ? parsedCustomWidth : getBaseDimension('width');
            const scaleFactors = images.map((img) => baseWidth / img.width);
            const newHeights = images.map((img, i) => img.height * scaleFactors[i]);

            canvas.width = baseWidth;
            canvas.height = newHeights.reduce((acc, h) => acc + h, 0);

            let yOffset = 0;
            images.forEach((img, i) => {
                ctx.drawImage(img.imgElement, 0, yOffset, baseWidth, newHeights[i]);
                yOffset += newHeights[i];
            });
            finalCanvasWidth = canvas.width;
        } else {
            let baseHeight: number;

            // To achieve a specific total width in landscape, we must scale the baseHeight
            // mathematically based on the sum of the images' aspect ratios
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
                ctx.drawImage(img.imgElement, xOffset, 0, newWidths[i], baseHeight);
                xOffset += newWidths[i];
            });
            finalCanvasWidth = canvas.width;
        }

        // Lift the calculated state up to App.tsx so the FileControls input placeholder can read it
        setCanvasWidth(finalCanvasWidth);

    }, [images, orientation, scaleToLargest, customWidth, canvasRef, setCanvasWidth]);

    return (
        <div id="canvasContainer" className={images.length > 0 ? '' : 'hidden'}>
            <canvas id="canvas" ref={canvasRef}></canvas>
        </div>
    );
};

export default ImageCanvas;
