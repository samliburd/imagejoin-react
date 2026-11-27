export type Rotation = 0 | 90 | 180 | 270;

export interface ImageItem {
    id: string;
    src: string;          // Object URL (blob:) or asset path for full-res canvas compositing
    thumbnailSrc: string; // Downsampled 100px JPEG Data URL for sortable list rendering
    originalName: string;
    width: number;
    height: number;
    imgElement: HTMLImageElement;
    rotation?: Rotation;
    flipH?: boolean;
}

export type Orientation = 'portrait' | 'landscape' | 'grid';

export type SizeMode = 'largest' | 'smallest' | 'original';

export type Alignment = 'start' | 'center' | 'end';

export type ExportFormat = 'image/jpeg' | 'image/png' | 'image/webp';

export interface LayoutOptions {
    orientation: Orientation;
    sizeMode: SizeMode;
    alignment: Alignment;
    customWidth: string;
    columns: number;
    gap: number;
    padding: number;
}

export interface CanvasSize {
    width: number;
    height: number;
}

export interface OrientationChangeEvent {
    event: 'orientation_change';
    selected_orientation: Orientation;
}

export type DataLayerEntry = OrientationChangeEvent | Record<string, unknown>;

export interface LaunchFileHandle {
    kind: 'file';
    name: string;
    getFile: () => Promise<File>;
}

export interface LaunchParams {
    files: LaunchFileHandle[];
}

declare global {
    interface Window {
        dataLayer?: DataLayerEntry[];
        launchQueue?: {
            setConsumer: (consumer: (launchParams: LaunchParams) => void) => void;
        };
    }
}
