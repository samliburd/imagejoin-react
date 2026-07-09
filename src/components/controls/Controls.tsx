import type { ImageItem, Orientation } from '../../types';
import ImageList from "../imagelist/ImageList.tsx";
import FileControls from "../filecontrols/FileControls.tsx";

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
}

const Controls = (props: ControlsProps) => {
    return (
        <div id="controls" className="controls">
            {/* Handles UI inputs, uploading, and downloading */}
            <FileControls {...props} />

            {/* Handles drag/drop and array reordering */}
            <ImageList
                images={props.images}
                setImages={props.setImages}
            />
        </div>
    );
};

export default Controls;
