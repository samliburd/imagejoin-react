// types.ts (or add to the top of App.tsx)
export interface ImageItem {
  id: string; // Unique key for React mapping
  src: string; // Base64 data or URL
  originalName: string;
  width: number;
  height: number;
  imgElement: HTMLImageElement; // Kept in memory for canvas ctx.drawImage
}

export type Orientation = 'portrait' | 'landscape';