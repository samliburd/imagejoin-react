import { type ImageItem } from '../types';

const IMAGE_EXTENSION_RE = /\.(png|jpe?g|webp|gif|bmp|svg|avif)$/i;

/**
 * Filters a file collection down to image files by MIME type or filename extension.
 */
export function filterImageFiles(files: FileList | readonly File[]): File[] {
    return Array.from(files).filter(
        (file) => file.type.startsWith('image/') || IMAGE_EXTENSION_RE.test(file.name),
    );
}

/**
 * Renders a downsampled JPEG thumbnail (default 100px max width, quality 0.5)
 * on an ephemeral canvas so the sortable list avoids full-resolution DOM paints.
 */
export function generateThumbnail(img: HTMLImageElement, maxWidth = 100): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return img.src;

    const scale = Math.min(maxWidth / img.width, 1);
    const newWidth = img.width * scale;
    const newHeight = img.height * scale;
    canvas.width = newWidth;
    canvas.height = newHeight;
    ctx.drawImage(img, 0, 0, newWidth, newHeight);
    return canvas.toDataURL('image/jpeg', 0.5);
}

export interface ImageFileMeta {
    mimeType?: string;
    fileSize?: number;
}

/**
 * Decodes an image source into an HTMLImageElement and generates its thumbnail.
 */
export function loadImage(
    src: string,
    name: string,
    meta?: ImageFileMeta,
): Promise<ImageItem> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const tinySrc = generateThumbnail(img, 100);
            resolve({
                id: crypto.randomUUID(),
                src,
                thumbnailSrc: tinySrc,
                originalName: name,
                width: img.width,
                height: img.height,
                imgElement: img,
                rotation: 0,
                flipH: false,
                ...(meta?.mimeType ? { mimeType: meta.mimeType } : {}),
                ...(meta?.fileSize !== undefined ? { fileSize: meta.fileSize } : {}),
            });
        };
        img.onerror = () => reject(new Error(`Failed to load: ${name}`));
        img.src = src;
    });
}

/**
 * Loads user-selected Files locally via Object URLs, revoking all created URLs
 * in the batch if any file fails to decode.
 */
export async function loadImageFiles(files: FileList | readonly File[]): Promise<ImageItem[]> {
    const fileList = filterImageFiles(files);
    if (fileList.length === 0) return [];

    const objectUrls = fileList.map((file) => URL.createObjectURL(file));

    try {
        return await Promise.all(
            fileList.map((file, index) =>
                loadImage(objectUrls[index], file.name, {
                    mimeType: file.type || undefined,
                    fileSize: file.size,
                }),
            ),
        );
    } catch (error) {
        objectUrls.forEach((url) => URL.revokeObjectURL(url));
        throw error;
    }
}

/**
 * Revokes Object URLs owned by an ImageItem array while leaving static asset paths intact.
 */
export function revokeImageUrls(images: readonly ImageItem[]): void {
    for (const img of images) {
        if (img.src.startsWith('blob:')) {
            URL.revokeObjectURL(img.src);
        }
    }
}
