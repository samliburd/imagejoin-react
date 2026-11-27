export interface ImageItem {
    id: string;
    src: string;          // Object URL (blob:) or asset path for full-res canvas compositing
    thumbnailSrc: string; // Downsampled 100px JPEG Data URL for sortable list rendering
    originalName: string;
    width: number;
    height: number;
    imgElement: HTMLImageElement;
}

export type Orientation = 'portrait' | 'landscape';

export interface OrientationChangeEvent {
    event: 'orientation_change';
    selected_orientation: Orientation;
}

export type DataLayerEntry = OrientationChangeEvent | Record<string, unknown>;

declare global {
    interface Window {
        dataLayer?: DataLayerEntry[];
    }
}
