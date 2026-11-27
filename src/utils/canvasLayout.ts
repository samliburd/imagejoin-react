import { type ImageItem, type Orientation } from '../types';

export interface DrawItem {
    img: HTMLImageElement;
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface CanvasLayoutResult {
    width: number;
    height: number;
    drawQueue: DrawItem[];
}

/**
 * Synchronously computes target canvas dimensions and per-image placement rects
 * for portrait (vertical) or landscape (horizontal) image stacking.
 */
export function computeCanvasLayout(
    images: readonly ImageItem[],
    orientation: Orientation,
    scaleToLargest: boolean,
    customWidth: string,
): CanvasLayoutResult {
    if (images.length === 0) {
        return { width: 0, height: 0, drawQueue: [] };
    }

    const getBaseDimension = (dimension: 'width' | 'height'): number => {
        const values = images.map((img) => img[dimension]);
        return scaleToLargest ? Math.max(...values) : Math.min(...values);
    };

    const parsedCustomWidth = parseInt(customWidth, 10);
    const hasCustomWidth = !isNaN(parsedCustomWidth) && parsedCustomWidth > 0;
    const drawQueue: DrawItem[] = [];

    if (orientation === 'portrait') {
        const baseWidth = hasCustomWidth ? parsedCustomWidth : getBaseDimension('width');
        const newHeights = images.map((img) => img.height * (baseWidth / img.width));
        const totalHeight = newHeights.reduce((acc, h) => acc + h, 0);

        let yOffset = 0;
        images.forEach((img, i) => {
            drawQueue.push({
                img: img.imgElement,
                x: 0,
                y: yOffset,
                w: baseWidth,
                h: newHeights[i],
            });
            yOffset += newHeights[i];
        });

        return { width: baseWidth, height: totalHeight, drawQueue };
    }

    const baseHeight = hasCustomWidth
        ? parsedCustomWidth / images.reduce((sum, img) => sum + img.width / img.height, 0)
        : getBaseDimension('height');

    const newWidths = images.map((img) => img.width * (baseHeight / img.height));
    const totalWidth = newWidths.reduce((acc, w) => acc + w, 0);

    let xOffset = 0;
    images.forEach((img, i) => {
        drawQueue.push({
            img: img.imgElement,
            x: xOffset,
            y: 0,
            w: newWidths[i],
            h: baseHeight,
        });
        xOffset += newWidths[i];
    });

    return { width: totalWidth, height: baseHeight, drawQueue };
}
