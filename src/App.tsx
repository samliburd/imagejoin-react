import { useState, useRef } from 'react';
import './App.scss';
import Controls from './components/controls/Controls';
import ImageCanvas from './components/imagecanvas/ImageCanvas';
import { type ImageItem, type Orientation } from './types'; // Adjust import based on where you put types

function App() {
    // --- Global Application State ---
    const [images, setImages] = useState<ImageItem[]>([]);
    const [orientation, setOrientation] = useState<Orientation>('portrait');
    const [scaleToLargest, setScaleToLargest] = useState<boolean>(true);
    const [filename, setFilename] = useState<string>('');

    // Ref to access the canvas for downloading
    const canvasRef = useRef<HTMLCanvasElement>(null);

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
            <h1 id="title">Photo Join</h1>
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
                    debug={true}
                />
                <ImageCanvas
                    canvasRef={canvasRef}
                    images={images}
                    orientation={orientation}
                    scaleToLargest={scaleToLargest}
                />
            </main>
        </>
    );
}

export default App;
