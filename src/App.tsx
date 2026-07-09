import { useRef, useState } from 'react';
import './App.scss';
import Controls from './components/controls/Controls';
import ImageCanvas from './components/imagecanvas/ImageCanvas';
import { type ImageItem, type Orientation } from './types';
import { Analytics } from '@vercel/analytics/react';

function App() {
    // --- Debug logic ---
    const searchParams = new URLSearchParams(window.location.search);
    const debugQuery = searchParams.get('debug');
    const showDebug = (import.meta.env.DEV && debugQuery !== "false") || (!window.location.href.includes("vercel") && debugQuery === 'true');

    // --- Global Application State ---
    const [images, setImages] = useState<ImageItem[]>([]);
    const [orientation, setOrientation] = useState<Orientation>('portrait');
    const [scaleToLargest, setScaleToLargest] = useState<boolean>(true);
    const [filename, setFilename] = useState<string>('');

    // NEW: States for width management
    const [canvasWidth, setCanvasWidth] = useState<number>(0);
    const [customWidth, setCustomWidth] = useState<string>('');

    const canvasRef = useRef<HTMLCanvasElement>(null!);

    const handleDownload = () => {
        if (!canvasRef.current) return;
        const finalFilename = filename.trim() || 'joinedimage';
        const imageData = canvasRef.current.toDataURL('image/jpeg', 0.92);

        const link = document.createElement('a');
        link.href = imageData;
        link.download = `${finalFilename}.jpg`;
        link.click();
    };

    return (
        <>
            <h1 id="title">Image Join</h1>
            <main>
                <Controls
                    images={images}
                    setImages={setImages}
                    orientation={orientation}
                    setOrientation={setOrientation}
                    scaleToLargest={scaleToLargest}
                    setScaleToLargest={setScaleToLargest}
                    filename={filename}
                    setFilename={setFilename}
                    onDownload={handleDownload}
                    debug={showDebug}
                    // NEW: Pass width props to Controls
                    customWidth={customWidth}
                    setCustomWidth={setCustomWidth}
                    canvasWidth={canvasWidth}
                />
                <ImageCanvas
                    canvasRef={canvasRef}
                    images={images}
                    orientation={orientation}
                    scaleToLargest={scaleToLargest}
                    // NEW: Pass width props to Canvas
                    customWidth={customWidth}
                    setCanvasWidth={setCanvasWidth}
                    canvasWidth={canvasWidth}
                />
            </main>
            <Analytics />
        </>
    );
}

export default App;
