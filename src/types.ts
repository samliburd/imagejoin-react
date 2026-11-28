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
    mimeType?: string;
    fileSize?: number;
}

export type Orientation = 'portrait' | 'landscape' | 'grid';

export type SizeMode = 'largest' | 'smallest' | 'original';

export type Alignment = 'start' | 'center' | 'end';

export type ExportFormat = 'image/jpeg' | 'image/png' | 'image/webp';

export type ExportFormatShort = 'jpeg' | 'png' | 'webp';

export type BackgroundType = 'transparent' | 'white' | 'black' | 'slate' | 'custom';

export type IngestMethod =
    | 'picker_replace'
    | 'picker_append'
    | 'drag_drop'
    | 'paste'
    | 'pwa_file_handler'
    | 'pwa_share_target'
    | 'debug_fixture';

export type OptionName =
    | 'columns'
    | 'custom_width'
    | 'size_mode'
    | 'alignment'
    | 'gap'
    | 'padding'
    | 'background'
    | 'export_format'
    | 'quality';

export type ImageListActionType =
    | 'drag_reorder'
    | 'move_up'
    | 'move_down'
    | 'rotate'
    | 'flip'
    | 'remove'
    | 'clear_all'
    | 'undo_clear';

export type FaqTopic = 'privacy' | 'supported_formats' | 'jpeg_transparency';

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

export interface ExportSettingsSnapshot {
    orientation: Orientation;
    grid_columns?: number;
    size_mode: SizeMode | 'custom_width';
    custom_width_px?: number;
    alignment: Alignment;
    gap_px: number;
    padding_px: number;
    background_type: BackgroundType;
    export_format: ExportFormatShort;
    export_quality?: number;
    image_count: number;
    file_types: string;
    rotated_image_count: number;
    flipped_image_count: number;
    canvas_width: number;
    canvas_height: number;
    exceeds_canvas_limits: boolean;
    has_custom_filename: boolean;
    output_size_kb?: number;
}

export interface ImagesAddedEvent {
    event: 'images_added';
    ingest_method: IngestMethod;
    added_count: number;
    image_count: number;
    file_types: string;
    total_input_kb?: number;
}

export interface OrientationChangeEvent {
    event: 'orientation_change';
    selected_orientation: Orientation;
    image_count?: number;
}

export interface OptionChangeEvent {
    event: 'option_change';
    option_name: OptionName;
    option_value: string | number;
    image_count: number;
}

export interface AdvancedOptionsToggleEvent {
    event: 'advanced_options_toggle';
    is_open: boolean;
    image_count: number;
}

export interface ImageListActionEvent {
    event: 'image_list_action';
    action_type: ImageListActionType;
    image_count: number;
    rotation_deg?: Rotation;
    is_flipped?: boolean;
}

export interface CanvasZoomToggleEvent {
    event: 'canvas_zoom_toggle';
    zoom_mode: 'fit' | 'actual';
    canvas_width: number;
    canvas_height: number;
}

export interface CanvasLimitWarningEvent {
    event: 'canvas_limit_warning';
    canvas_width: number;
    canvas_height: number;
    image_count: number;
    orientation: Orientation;
}

export interface HelpDialogToggleEvent {
    event: 'help_dialog_toggle';
    action: 'open' | 'close';
    image_count: number;
}

export interface FileIngestErrorEvent {
    event: 'file_ingest_error';
    ingest_method: IngestMethod;
    skipped_count: number;
    loaded_count: number;
}

export interface EmptyDropzoneBrowseEvent {
    event: 'empty_dropzone_browse';
    image_count: number;
}

export interface FaqToggleEvent {
    event: 'faq_toggle';
    faq_topic: FaqTopic;
    is_open: boolean;
}

export type CookieConsentStatus = 'granted' | 'denied';

export interface CookieConsentUpdateEvent {
    event: 'cookie_consent_update';
    consent_status: CookieConsentStatus;
    consent_analytics: CookieConsentStatus;
    consent_marketing: CookieConsentStatus;
}

export interface ImageExportEvent extends ExportSettingsSnapshot {
    event: 'image_export';
    export_method: 'download';
}

export interface ImageCopyEvent extends ExportSettingsSnapshot {
    event: 'image_copy';
    export_method: 'clipboard';
    copy_success: boolean;
}

export type AnalyticsEvent =
    | ImagesAddedEvent
    | OrientationChangeEvent
    | OptionChangeEvent
    | AdvancedOptionsToggleEvent
    | ImageListActionEvent
    | CanvasZoomToggleEvent
    | CanvasLimitWarningEvent
    | HelpDialogToggleEvent
    | FileIngestErrorEvent
    | EmptyDropzoneBrowseEvent
    | FaqToggleEvent
    | CookieConsentUpdateEvent
    | ImageExportEvent
    | ImageCopyEvent;

export type DataLayerEntry =
    | (AnalyticsEvent & { is_debug_mode?: boolean })
    | Record<string, unknown>;

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
        gtag?: (...args: unknown[]) => void;
        launchQueue?: {
            setConsumer: (consumer: (launchParams: LaunchParams) => void) => void;
        };
    }
}
