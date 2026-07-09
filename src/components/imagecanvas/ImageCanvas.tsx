import { useEffect, type RefObject } from 'react';
import { type ImageItem, type Orientation } from '../../types';

interface ImageCanvasProps {
    canvasRef: RefObject<HTMLCanvasElement>;
    images: ImageItem[];
    orientation: Orientation;
    scaleToLargest: boolean;
}

const ImageCanvas = ({ canvasRef, images, orientation, scaleToLargest }: ImageCanvasProps) => {

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (images.length === 0) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }

        const getBaseDimension = (dimension: 'width' | 'height') => {
            const values = images.map((img) => img[dimension]);
            return scaleToLargest ? Math.max(...values) : Math.min(...values);
        };

        const isPortrait = orientation === 'portrait';

        if (isPortrait) {
            const baseWidth = getBaseDimension('width');
            const scaleFactors = images.map((img) => baseWidth / img.width);
            const newHeights = images.map((img, i) => img.height * scaleFactors[i]);

            canvas.width = baseWidth;
            canvas.height = newHeights.reduce((acc, h) => acc + h, 0);

            let yOffset = 0;
            images.forEach((img, i) => {
                // Draw the cached HTMLImageElement
                ctx.drawImage(img.imgElement, 0, yOffset, baseWidth, newHeights[i]);
                yOffset += newHeights[i];
            });
        } else {
            const baseHeight = getBaseDimension('height');
            const scaleFactors = images.map((img) => baseHeight / img.height);
            const newWidths = images.map((img, i) => img.width * scaleFactors[i]);

            canvas.height = baseHeight;
            canvas.width = newWidths.reduce((acc, w) => acc + w, 0);

            let xOffset = 0;
            images.forEach((img, i) => {
                // Draw the cached HTMLImageElement
                ctx.drawImage(img.imgElement, xOffset, 0, newWidths[i], baseHeight);
                xOffset += newWidths[i];
            });
        }
    }, [images, orientation, scaleToLargest, canvasRef]); // Dependencies that trigger a redraw

    return (
        <div id="canvasContainer" className={images.length > 0 ? '' : 'hidden'}>
            {/* We attach the ref passed from App.tsx here */}
            <canvas id="canvas" ref={canvasRef}></canvas>
        </div>
    );
};

export default ImageCanvas;
