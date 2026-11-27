import { useRef, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import './App.scss';
import Controls from './components/controls/Controls';
import FileControls from './components/filecontrols/FileControls';
import ImageCanvas from './components/imagecanvas/ImageCanvas';
import ImageList from './components/imagelist/ImageList';
import { type ImageItem, type Orientation } from './types';
import { revokeImageUrls } from './utils/imageLoader';

function triggerDownload(href: string, downloadName: string): void {
    const link = document.createElement('a');
    link.href = href;
    link.download = downloadName;
    link.click();
}

function App() {
    const searchParams = new URLSearchParams(window.location.search);
    const debugQuery = searchParams.get('debug');
    const showDebug =
        (import.meta.env.DEV && debugQuery !== 'false') ||
        (!window.location.href.includes('vercel') && debugQuery === 'true');

    const [images, setImages] = useState<ImageItem[]>([]);
    const [orientation, setOrientation] = useState<Orientation>('portrait');
    const [scaleToLargest, setScaleToLargest] = useState<boolean>(true);
    const [filename, setFilename] = useState<string>('');
    const [canvasWidth, setCanvasWidth] = useState<number>(0);
    const [customWidth, setCustomWidth] = useState<string>('');

    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const replaceImages = (nextImages: ImageItem[]) => {
        setImages((prev) => {
            revokeImageUrls(prev);
            return nextImages;
        });
    };

    const handleDownload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const downloadName = `${filename.trim() || 'joinedimage'}.jpg`;

        if (typeof canvas.toBlob === 'function') {
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        const blobUrl = URL.createObjectURL(blob);
                        triggerDownload(blobUrl, downloadName);
                        setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
                    } else {
                        triggerDownload(canvas.toDataURL('image/jpeg', 0.92), downloadName);
                    }
                },
                'image/jpeg',
                0.92,
            );
            return;
        }

        triggerDownload(canvas.toDataURL('image/jpeg', 0.92), downloadName);
    };

    return (
        <>
            <h1 id="title">Image Join</h1>
            <main>
                <Controls>
                    <FileControls
                        images={images}
                        onReplaceImages={replaceImages}
                        orientation={orientation}
                        setOrientation={setOrientation}
                        scaleToLargest={scaleToLargest}
                        setScaleToLargest={setScaleToLargest}
                        filename={filename}
                        setFilename={setFilename}
                        onDownload={handleDownload}
                        debug={showDebug}
                        customWidth={customWidth}
                        setCustomWidth={setCustomWidth}
                        canvasWidth={canvasWidth}
                    />
                    <ImageList images={images} setImages={setImages} />
                </Controls>
                <ImageCanvas
                    canvasRef={canvasRef}
                    images={images}
                    orientation={orientation}
                    scaleToLargest={scaleToLargest}
                    customWidth={customWidth}
                    setCanvasWidth={setCanvasWidth}
                />
            </main>
            <Analytics />
        </>
    );
}

export default App;
