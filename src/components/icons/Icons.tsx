import { type SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

export const PortraitStackIcon = (props: IconProps) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" {...props}>
        <rect x="3.5" y="1.75" width="9" height="5" rx="1" />
        <rect x="3.5" y="9.25" width="9" height="5" rx="1" />
    </svg>
);

export const LandscapeRowIcon = (props: IconProps) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" {...props}>
        <rect x="1.75" y="3.5" width="5" height="9" rx="1" />
        <rect x="9.25" y="3.5" width="5" height="9" rx="1" />
    </svg>
);

export const GridCollageIcon = (props: IconProps) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" {...props}>
        <rect x="2" y="2" width="5" height="5" rx="1" />
        <rect x="9" y="2" width="5" height="5" rx="1" />
        <rect x="2" y="9" width="5" height="5" rx="1" />
        <rect x="9" y="9" width="5" height="5" rx="1" />
    </svg>
);

export const ArrowUpIcon = (props: IconProps) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        <path d="M8 12.5V3.5M4 7l4-4 4 4" />
    </svg>
);

export const ArrowDownIcon = (props: IconProps) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        <path d="M8 3.5v9M4 9l4 4 4-4" />
    </svg>
);

export const RotateCwIcon = (props: IconProps) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        <path d="M13.5 8a5.5 5.5 0 1 1-1.45-3.72" />
        <path d="M13.5 2.5v3h-3" />
    </svg>
);

export const FlipHorizontalIcon = (props: IconProps) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        <path d="M8 2v12" strokeDasharray="2 2" />
        <path d="M5.5 4.5 2 8l3.5 3.5V4.5Z" />
        <path d="M10.5 4.5 14 8l-3.5 3.5V4.5Z" />
    </svg>
);

export const CloseIcon = (props: IconProps) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true" {...props}>
        <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
);

export const UploadDropIcon = (props: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        <path d="M12 15V4m0 0-4 4m4-4 4 4" />
        <path d="M4 16.5v1.75A1.75 1.75 0 0 0 5.75 20h12.5A1.75 1.75 0 0 0 20 18.25V16.5" />
    </svg>
);
