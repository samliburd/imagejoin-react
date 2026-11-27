import { useRef } from 'react';
import { type FaqTopic } from '../../types';
import { trackEvent } from '../../utils/analytics';

const SeoInfoSection = () => {
    const openStatesRef = useRef<Record<FaqTopic, boolean>>({
        privacy: false,
        supported_formats: false,
        jpeg_transparency: false,
    });

    const handleFaqToggle = (topic: FaqTopic, isOpen: boolean) => {
        if (openStatesRef.current[topic] === isOpen) return;
        openStatesRef.current[topic] = isOpen;
        trackEvent({
            event: 'faq_toggle',
            faq_topic: topic,
            is_open: isOpen,
        });
    };

    return (
        <section className="seo-info" aria-labelledby="seo-overview-heading">
            <div className="seo-info-intro">
                <h2 id="seo-overview-heading">Combine, Stack &amp; Arrange Images Privately</h2>
                <p>
                    ImageJoin is a free browser-based tool to stitch screenshots vertically, place
                    photos side by side, or build custom multi-column collages. Every image is
                    decoded, resized, and exported locally using HTML5 Canvas — your files are
                    never uploaded to any server.
                </p>
            </div>

            <div className="seo-highlights">
                <div className="seo-block">
                    <h3>Flexible Layout Modes</h3>
                    <p>
                        Switch between <strong>Vertical</strong> stacking, <strong>Horizontal</strong>{' '}
                        rows, or custom <strong>Grid</strong> columns. Match the largest or smallest
                        image automatically, or set an exact output pixel width with custom gap,
                        padding, and background fill.
                    </p>
                </div>

                <div className="seo-block">
                    <h3>Quick Edits &amp; Export</h3>
                    <p>
                        Reorder thumbnails by dragging or using keyboard/arrow buttons, rotate 90°
                        or flip horizontally per image, and export in <strong>JPEG</strong>,{' '}
                        <strong>PNG</strong> (with transparency), or <strong>WebP</strong> — or copy
                        straight to your clipboard.
                    </p>
                </div>
            </div>

            <div className="seo-faq" aria-labelledby="seo-faq-heading">
                <h3 id="seo-faq-heading">Frequently Asked Questions</h3>
                <details onToggle={(e) => handleFaqToggle('privacy', e.currentTarget.open)}>
                    <summary>Are my images uploaded to a server?</summary>
                    <p>
                        No. All file reading, resizing, and canvas compositing happen 100% locally in
                        your browser sandbox. ImageJoin even works offline after installation as a
                        PWA.
                    </p>
                </details>
                <details onToggle={(e) => handleFaqToggle('supported_formats', e.currentTarget.open)}>
                    <summary>Which image formats are supported?</summary>
                    <p>
                        You can import PNG, JPEG, WebP, GIF, BMP, SVG, and AVIF images (depending
                        on your browser&apos;s built-in codec support) and export the joined result
                        as JPEG, PNG, or WebP.
                    </p>
                </details>
                <details onToggle={(e) => handleFaqToggle('jpeg_transparency', e.currentTarget.open)}>
                    <summary>How do I preserve a transparent background?</summary>
                    <p>
                        Keep Background set to <strong>Transparent</strong> and choose{' '}
                        <strong>PNG</strong> or <strong>WebP</strong> under Layout &amp; Export
                        Options. JPEG does not support alpha transparency, so transparent areas are
                        filled with white automatically when exporting as JPEG.
                    </p>
                </details>
            </div>
        </section>
    );
};

export default SeoInfoSection;
