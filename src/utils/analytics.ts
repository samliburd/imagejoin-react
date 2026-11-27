import {
    type Alignment,
    type AnalyticsEvent,
    type BackgroundType,
    type CanvasSize,
    type ExportFormat,
    type ExportFormatShort,
    type ExportSettingsSnapshot,
    type ImageItem,
    type Orientation,
    type SizeMode,
} from '../types';
import { MAX_CANVAS_AREA, MAX_CANVAS_EDGE } from './canvasLayout';

const BACKGROUND_MAP: Record<string, BackgroundType> = {
    transparent: 'transparent',
    '#ffffff': 'white',
    '#000000': 'black',
    '#2f3b45': 'slate',
};

const FORMAT_MAP: Record<ExportFormat, ExportFormatShort> = {
    'image/jpeg': 'jpeg',
    'image/png': 'png',
    'image/webp': 'webp',
};

let lastPushedKeys: string[] = [];

/**
 * Returns true when running under Vite dev mode or a localhost hostname so
 * GTM Tag Assistant / GA4 DebugView can distinguish local testing from prod traffic.
 */
export function isLocalDebugEnvironment(): boolean {
    if (import.meta.env.DEV) return true;
    if (typeof window === 'undefined') return false;
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1';
}

function normalizeImageType(item: Pick<ImageItem, 'mimeType' | 'originalName'>): string | null {
    if (item.mimeType) {
        const mime = item.mimeType.toLowerCase();
        if (mime.startsWith('image/')) {
            const sub = mime.slice('image/'.length).split('+')[0];
            return sub === 'jpg' ? 'jpeg' : sub;
        }
    }

    const dotIdx = item.originalName.lastIndexOf('.');
    if (dotIdx !== -1 && dotIdx < item.originalName.length - 1) {
        const ext = item.originalName.slice(dotIdx + 1).toLowerCase();
        return ext === 'jpg' ? 'jpeg' : ext;
    }

    return null;
}

/**
 * Extracts a sorted, deduplicated comma-separated list of image format names
 * without exposing raw user filenames.
 */
export function extractFileTypes(
    items: readonly Pick<ImageItem, 'mimeType' | 'originalName'>[],
): string {
    const types = new Set<string>();
    for (const item of items) {
        const normalized = normalizeImageType(item);
        if (normalized) types.add(normalized);
    }
    return Array.from(types).sort().join(',') || 'unknown';
}

/**
 * Computes total input size in rounded KB when File byte sizes are available.
 */
export function sumFileSizeKb(items: readonly Pick<ImageItem, 'fileSize'>[]): number | undefined {
    let totalBytes = 0;
    let hasAnySize = false;
    for (const item of items) {
        if (typeof item.fileSize === 'number') {
            totalBytes += item.fileSize;
            hasAnySize = true;
        }
    }
    return hasAnySize ? Math.round(totalBytes / 1024) : undefined;
}

/**
 * Classifies a CSS background value into a low-cardinality preset label.
 */
export function classifyBackground(bg: string): BackgroundType {
    return BACKGROUND_MAP[bg.trim().toLowerCase()] ?? 'custom';
}

/**
 * Maps an export MIME type to a short GA4-friendly format identifier.
 */
export function formatExportType(format: ExportFormat): ExportFormatShort {
    return FORMAT_MAP[format];
}

export interface SnapshotInput {
    images: readonly ImageItem[];
    orientation: Orientation;
    columns: number;
    sizeMode: SizeMode;
    customWidth: string;
    alignment: Alignment;
    gap: number;
    padding: number;
    backgroundColor: string;
    exportFormat: ExportFormat;
    quality: number;
    filename: string;
    canvasSize: CanvasSize;
    outputBytes?: number;
}

/**
 * Builds a complete, PII-free configuration and output snapshot for export/copy events.
 */
export function buildExportSnapshot({
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
}: SnapshotInput): ExportSettingsSnapshot {
    const parsedCustomWidth = parseInt(customWidth.trim(), 10);
    const hasCustomWidth = !isNaN(parsedCustomWidth) && parsedCustomWidth > 0;
    const rotatedCount = images.filter((img) => (img.rotation ?? 0) !== 0).length;
    const flippedCount = images.filter((img) => Boolean(img.flipH)).length;
    const exceedsLimits =
        canvasSize.width > MAX_CANVAS_EDGE ||
        canvasSize.height > MAX_CANVAS_EDGE ||
        canvasSize.width * canvasSize.height > MAX_CANVAS_AREA;

    return {
        orientation,
        ...(orientation === 'grid' ? { grid_columns: columns } : {}),
        size_mode: hasCustomWidth ? 'custom_width' : sizeMode,
        ...(hasCustomWidth ? { custom_width_px: parsedCustomWidth } : {}),
        alignment,
        gap_px: gap,
        padding_px: padding,
        background_type: classifyBackground(backgroundColor),
        export_format: formatExportType(exportFormat),
        ...(exportFormat !== 'image/png' ? { export_quality: Math.round(quality * 100) } : {}),
        image_count: images.length,
        file_types: extractFileTypes(images),
        rotated_image_count: rotatedCount,
        flipped_image_count: flippedCount,
        canvas_width: canvasSize.width,
        canvas_height: canvasSize.height,
        exceeds_canvas_limits: exceedsLimits,
        has_custom_filename: filename.trim().length > 0,
        ...(typeof outputBytes === 'number'
            ? { output_size_kb: Math.round(outputBytes / 1024) }
            : {}),
    };
}

/**
 * Pushes a structured analytics event to window.dataLayer (active on both
 * production and localhost), clearing stale parameter keys from the previous push
 * so GTM Data Layer v2 never carries over unrelated event parameters.
 */
export function trackEvent(event: AnalyticsEvent): void {
    if (typeof window === 'undefined') return;
    window.dataLayer = window.dataLayer || [];

    const payload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(event)) {
        if (value !== undefined) {
            payload[key] = value;
        }
    }
    payload.is_debug_mode = isLocalDebugEnvironment();

    const nextKeys = Object.keys(payload).filter((key) => key !== 'event');
    const resetPatch: Record<string, undefined> = {};
    let hasStaleKey = false;
    for (const prevKey of lastPushedKeys) {
        if (!(prevKey in payload)) {
            resetPatch[prevKey] = undefined;
            hasStaleKey = true;
        }
    }
    if (hasStaleKey) {
        window.dataLayer.push(resetPatch);
    }

    lastPushedKeys = nextKeys;
    window.dataLayer.push(payload);
}

/**
 * Resets module-level dataLayer key tracking (used between test runs).
 */
export function resetAnalyticsState(): void {
    lastPushedKeys = [];
}
