import type { ImageItem, Orientation } from '../../types';
import ImageList from "../imagelist/ImageList";
import FileControls from "../filecontrols/FileControls";

interface ControlsProps {
    images: ImageItem[];
    setImages: React.Dispatch<React.SetStateAction<ImageItem[]>>;
    orientation: Orientation;
    setOrientation: (val: Orientation) => void;
    scaleToLargest: boolean;
    setScaleToLargest: (val: boolean) => void;
    filename: string;
    setFilename: (val: string) => void;
    onDownload: () => void;
    debug: boolean;
    // NEW Props
    customWidth: string;
    setCustomWidth: (val: string) => void;
    canvasWidth: number;
}

const Controls = (props: ControlsProps) => {
    return (
        <div id="controls" className="controls">
            <FileControls {...props} />
            <ImageList
                images={props.images}
                setImages={props.setImages}
            />
        </div>
    );
};

export default Controls;
