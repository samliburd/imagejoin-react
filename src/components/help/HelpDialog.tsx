import { useEffect, useRef } from 'react';

interface HelpDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

const HelpDialog = ({ isOpen, onClose }: HelpDialogProps) => {
    const dialogRef = useRef<HTMLDialogElement | null>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        if (isOpen && !dialog.open) {
            dialog.showModal();
        } else if (!isOpen && dialog.open) {
            dialog.close();
        }
    }, [isOpen]);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        const handleClose = () => {
            dialog.returnValue = '';
            onClose();
        };

        dialog.addEventListener('close', handleClose);

        // Progressive-enhancement light-dismiss fallback for browsers lacking closedBy (e.g. Safari)
        let cleanupFallback: (() => void) | undefined;
        if (!('closedBy' in HTMLDialogElement.prototype)) {
            let pressedOutside = false;
            const isOutside = (e: PointerEvent): boolean => {
                const r = dialog.getBoundingClientRect();
                return (
                    e.clientX < r.left ||
                    e.clientX > r.right ||
                    e.clientY < r.top ||
                    e.clientY > r.bottom
                );
            };
            const handlePointerDown = (e: PointerEvent) => {
                pressedOutside = isOutside(e);
            };
            const handlePointerUp = (e: PointerEvent) => {
                if (pressedOutside && isOutside(e)) {
                    dialog.close();
                }
                pressedOutside = false;
            };
            dialog.addEventListener('pointerdown', handlePointerDown);
            dialog.addEventListener('pointerup', handlePointerUp);
            cleanupFallback = () => {
                dialog.removeEventListener('pointerdown', handlePointerDown);
                dialog.removeEventListener('pointerup', handlePointerUp);
            };
        }

        return () => {
            dialog.removeEventListener('close', handleClose);
            cleanupFallback?.();
        };
    }, [onClose]);

    return (
        <dialog
            ref={dialogRef}
            id="helpDialog"
            aria-labelledby="help-dialog-title"
            {...({ closedby: 'any' } as Record<string, string>)}
        >
            <div className="help-dialog-content">
                <h1 id="help-dialog-title">ImageJoin Guide &amp; Shortcuts</h1>
                <p className="help-privacy">
                    <strong>100% client-side:</strong> All image decoding, resizing, and export
                    happen locally inside your browser. Your files are never uploaded to a server.
                </p>

                <section aria-labelledby="help-input-heading">
                    <h2 id="help-input-heading">Adding &amp; Arranging Images</h2>
                    <ul>
                        <li>
                            <strong>Drag &amp; drop</strong> image files anywhere onto the page, or{' '}
                            <strong>paste</strong> screenshots with <kbd>Ctrl+V</kbd> /{' '}
                            <kbd>Cmd+V</kbd>.
                        </li>
                        <li>
                            Use <strong>Choose Files</strong> to replace the queue, or{' '}
                            <strong>+ Add</strong> to append more images.
                        </li>
                        <li>
                            Reorder items by dragging thumbnails or using the <strong>↑</strong> /{' '}
                            <strong>↓</strong> buttons. Rotate (<kbd>↻</kbd>), flip (<kbd>⇄</kbd>),
                            or remove (<kbd>×</kbd>) individual items.
                        </li>
                    </ul>
                </section>

                <section aria-labelledby="help-layout-heading">
                    <h2 id="help-layout-heading">Layout &amp; Export Options</h2>
                    <ul>
                        <li>
                            <strong>Orientation:</strong> Vertical stack (Portrait), horizontal row
                            (Landscape), or multi-column collage (Grid).
                        </li>
                        <li>
                            <strong>Width:</strong> Type a target pixel width and press{' '}
                            <kbd>Enter</kbd> or click <strong>Go</strong> to apply.
                        </li>
                        <li>
                            <strong>Format &amp; Background:</strong> Use <strong>PNG</strong> or{' '}
                            <strong>WebP</strong> to preserve transparency; <strong>JPEG</strong>{' '}
                            automatically fills transparent backgrounds with white unless another
                            color is chosen.
                        </li>
                        <li>
                            <strong>Canvas Limits:</strong> Browsers cap canvases around 16,384 px
                            per side (~268 MP). If a warning appears, set a lower{' '}
                            <strong>Width</strong>.
                        </li>
                    </ul>
                </section>

                <div className="help-dialog-actions">
                    <button
                        type="button"
                        autoFocus
                        onClick={() => dialogRef.current?.close()}
                    >
                        Close
                    </button>
                </div>
            </div>
        </dialog>
    );
};

export default HelpDialog;
