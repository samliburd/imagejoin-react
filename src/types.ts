// types.ts (or add to the top of App.tsx)
export interface ImageItem {
    id: string;
    src: string;          // The full, original high-res string
    thumbnailSrc: string; // NEW: The tiny, compressed string for the UI
    originalName: string;
    width: number;
    height: number;
    imgElement: HTMLImageElement;
}

export type Orientation = 'portrait' | 'landscape';
