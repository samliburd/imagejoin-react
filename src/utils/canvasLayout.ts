import { type Alignment, type ImageItem, type LayoutOptions, type Rotation } from '../types';

export interface DrawItem {
    img: HTMLImageElement;
    x: number;
    y: number;
    w: number;
    h: number;
    drawW: number;
    drawH: number;
    rotation: Rotation;
    flipH: boolean;
}

export interface CanvasLayoutResult {
    width: number;
    height: number;
    drawQueue: DrawItem[];
    exceedsLimits: boolean;
}

export const MAX_CANVAS_EDGE = 16384;
export const MAX_CANVAS_AREA = 268_435_456;

/**
 * Returns the effective visual dimensions of an image after applying 90/270-degree rotation.
 */
export function getEffectiveDimensions(img: Pick<ImageItem, 'width' | 'height' | 'rotation'>): {
    width: number;
    height: number;
} {
    const rotation = img.rotation ?? 0;
    if (rotation === 90 || rotation === 270) {
        return { width: img.height, height: img.width };
    }
    return { width: img.width, height: img.height };
}

function alignOffset(available: number, size: number, alignment: Alignment): number {
    if (alignment === 'center') return (available - size) / 2;
    if (alignment === 'end') return available - size;
    return 0;
}

function computeDrawSizes(
    effW: number,
    effH: number,
    targetW: number,
    targetH: number,
    rotation: Rotation,
): { drawW: number; drawH: number } {
    if (rotation === 90 || rotation === 270) {
        return { drawW: targetH, drawH: targetW };
    }
    void effW;
    void effH;
    return { drawW: targetW, drawH: targetH };
}

/**
 * Synchronously computes target canvas dimensions, placement rects, and resource-limit flags
 * for portrait (vertical), landscape (horizontal), and grid collage layouts.
 */
export function computeCanvasLayout(
    images: readonly ImageItem[],
    options: LayoutOptions,
): CanvasLayoutResult {
    if (images.length === 0) {
        return { width: 0, height: 0, drawQueue: [], exceedsLimits: false };
    }

    const { orientation, sizeMode, alignment, customWidth } = options;
    const gap = Math.max(0, Math.round(options.gap));
    const padding = Math.max(0, Math.round(options.padding));
    const columns = Math.max(1, Math.min(12, Math.round(options.columns)));

    const effective = images.map((img) => ({
        item: img,
        rotation: (img.rotation ?? 0) as Rotation,
        flipH: Boolean(img.flipH),
        ...getEffectiveDimensions(img),
    }));

    const parsedCustomWidth = parseInt(customWidth, 10);
    const hasCustomWidth = !isNaN(parsedCustomWidth) && parsedCustomWidth > 0;
    const drawQueue: DrawItem[] = [];

    let totalWidth = 0;
    let totalHeight = 0;

    if (orientation === 'portrait') {
        const widths = effective.map((e) => e.width);
        const targetContentWidth = hasCustomWidth
            ? Math.max(1, parsedCustomWidth - 2 * padding)
            : sizeMode === 'largest'
              ? Math.max(...widths)
              : sizeMode === 'smallest'
                ? Math.min(...widths)
                : Math.max(...widths);

        let yOffset = padding;
        for (const entry of effective) {
            const w =
                !hasCustomWidth && sizeMode === 'original' ? entry.width : targetContentWidth;
            const h =
                !hasCustomWidth && sizeMode === 'original'
                    ? entry.height
                    : entry.height * (targetContentWidth / entry.width);
            const x = padding + alignOffset(targetContentWidth, w, alignment);
            const { drawW, drawH } = computeDrawSizes(
                entry.width,
                entry.height,
                w,
                h,
                entry.rotation,
            );
            drawQueue.push({
                img: entry.item.imgElement,
                x,
                y: yOffset,
                w,
                h,
                drawW,
                drawH,
                rotation: entry.rotation,
                flipH: entry.flipH,
            });
            yOffset += h + gap;
        }

        totalWidth =
            (hasCustomWidth ? parsedCustomWidth : targetContentWidth + 2 * padding);
        totalHeight = yOffset - gap + padding;
    } else if (orientation === 'landscape') {
        const heights = effective.map((e) => e.height);
        const totalGap = gap * Math.max(0, effective.length - 1);
        const aspectSum = effective.reduce((sum, e) => sum + e.width / e.height, 0);

        const targetContentHeight = hasCustomWidth
            ? Math.max(1, parsedCustomWidth - 2 * padding - totalGap) / aspectSum
            : sizeMode === 'largest'
              ? Math.max(...heights)
              : sizeMode === 'smallest'
                ? Math.min(...heights)
                : Math.max(...heights);

        let xOffset = padding;
        for (const entry of effective) {
            const h =
                !hasCustomWidth && sizeMode === 'original' ? entry.height : targetContentHeight;
            const w =
                !hasCustomWidth && sizeMode === 'original'
                    ? entry.width
                    : entry.width * (targetContentHeight / entry.height);
            const y = padding + alignOffset(targetContentHeight, h, alignment);
            const { drawW, drawH } = computeDrawSizes(
                entry.width,
                entry.height,
                w,
                h,
                entry.rotation,
            );
            drawQueue.push({
                img: entry.item.imgElement,
                x: xOffset,
                y,
                w,
                h,
                drawW,
                drawH,
                rotation: entry.rotation,
                flipH: entry.flipH,
            });
            xOffset += w + gap;
        }

        totalWidth = xOffset - gap + padding;
        totalHeight = targetContentHeight + 2 * padding;
    } else {
        const colsUsed = Math.min(columns, effective.length);
        const totalHorizontalGaps = gap * Math.max(0, colsUsed - 1);
        const widths = effective.map((e) => e.width);

        const cellWidth = hasCustomWidth
            ? Math.max(1, (parsedCustomWidth - 2 * padding - totalHorizontalGaps) / colsUsed)
            : sizeMode === 'smallest'
              ? Math.min(...widths)
              : Math.max(...widths);

        let yOffset = padding;
        for (let rowStart = 0; rowStart < effective.length; rowStart += colsUsed) {
            const rowEntries = effective.slice(rowStart, rowStart + colsUsed);
            const rowSized = rowEntries.map((entry) => {
                if (!hasCustomWidth && sizeMode === 'original') {
                    return { entry, w: entry.width, h: entry.height };
                }
                const scale = cellWidth / entry.width;
                return { entry, w: cellWidth, h: entry.height * scale };
            });

            const rowCellWidth =
                !hasCustomWidth && sizeMode === 'original'
                    ? Math.max(...rowSized.map((r) => r.w))
                    : cellWidth;
            const rowHeight = Math.max(...rowSized.map((r) => r.h));

            let xOffset = padding;
            for (const { entry, w, h } of rowSized) {
                const x = xOffset + alignOffset(rowCellWidth, w, alignment);
                const y = yOffset + alignOffset(rowHeight, h, alignment);
                const { drawW, drawH } = computeDrawSizes(
                    entry.width,
                    entry.height,
                    w,
                    h,
                    entry.rotation,
                );
                drawQueue.push({
                    img: entry.item.imgElement,
                    x,
                    y,
                    w,
                    h,
                    drawW,
                    drawH,
                    rotation: entry.rotation,
                    flipH: entry.flipH,
                });
                xOffset += rowCellWidth + gap;
            }

            totalWidth = Math.max(totalWidth, xOffset - gap + padding);
            yOffset += rowHeight + gap;
        }

        totalHeight = yOffset - gap + padding;
    }

    const finalWidth = Math.round(totalWidth);
    const finalHeight = Math.round(totalHeight);
    const exceedsLimits =
        finalWidth > MAX_CANVAS_EDGE ||
        finalHeight > MAX_CANVAS_EDGE ||
        finalWidth * finalHeight > MAX_CANVAS_AREA;

    return {
        width: finalWidth,
        height: finalHeight,
        drawQueue,
        exceedsLimits,
    };
}
