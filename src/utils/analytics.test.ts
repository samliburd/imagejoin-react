import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockImageItem } from '../test/fixtures';
import {
  buildExportSnapshot,
  classifyBackground,
  extractFileTypes,
  formatExportType,
  isLocalDebugEnvironment,
  resetAnalyticsState,
  sumFileSizeKb,
  trackEvent,
} from './analytics';

describe('analytics utilities', () => {
  beforeEach(() => {
    window.dataLayer = [];
    resetAnalyticsState();
    window.history.replaceState({}, '', '/');
  });

  it('extractFileTypes deduplicates MIME subtypes and extensions without exposing filenames', () => {
    const items = [
      createMockImageItem({ originalName: 'Jane_Doe_Passport.jpg', mimeType: 'image/jpeg' }),
      createMockImageItem({ originalName: 'secret-invoice.png', mimeType: 'image/png' }),
      createMockImageItem({ originalName: 'avatar.WEBP' }),
      createMockImageItem({ originalName: 'second.JPG' }),
    ];

    const result = extractFileTypes(items);
    expect(result).toBe('jpeg,png,webp');
    expect(result).not.toContain('Jane');
    expect(result).not.toContain('secret');
  });

  it('sumFileSizeKb returns rounded kilobytes or undefined when sizes are absent', () => {
    expect(sumFileSizeKb([createMockImageItem()])).toBeUndefined();
    expect(
      sumFileSizeKb([
        createMockImageItem({ fileSize: 1500 }),
        createMockImageItem({ fileSize: 1600 }),
      ]),
    ).toBe(3);
  });

  it('classifyBackground and formatExportType normalize low-cardinality labels', () => {
    expect(classifyBackground('transparent')).toBe('transparent');
    expect(classifyBackground('#FFFFFF')).toBe('white');
    expect(classifyBackground('#000000')).toBe('black');
    expect(classifyBackground('#2f3b45')).toBe('slate');
    expect(classifyBackground('#1e293b')).toBe('custom');

    expect(formatExportType('image/jpeg')).toBe('jpeg');
    expect(formatExportType('image/png')).toBe('png');
    expect(formatExportType('image/webp')).toBe('webp');
  });

  it('buildExportSnapshot captures all layout, transform, and privacy-safe output fields', () => {
    const items = [
      createMockImageItem({
        originalName: 'my-private-photo.jpg',
        mimeType: 'image/jpeg',
        rotation: 90,
        flipH: true,
      }),
      createMockImageItem({
        originalName: 'receipt-123.png',
        mimeType: 'image/png',
        rotation: 0,
        flipH: false,
      }),
    ];

    const snapshot = buildExportSnapshot({
      images: items,
      orientation: 'grid',
      columns: 3,
      sizeMode: 'smallest',
      customWidth: '1800',
      alignment: 'start',
      gap: 12,
      padding: 20,
      backgroundColor: '#123456',
      exportFormat: 'image/webp',
      quality: 0.85,
      filename: 'confidential-export',
      canvasSize: { width: 1800, height: 1200 },
      outputBytes: 102400,
    });

    expect(snapshot).toEqual({
      orientation: 'grid',
      grid_columns: 3,
      size_mode: 'custom_width',
      custom_width_px: 1800,
      alignment: 'start',
      gap_px: 12,
      padding_px: 20,
      background_type: 'custom',
      export_format: 'webp',
      export_quality: 85,
      image_count: 2,
      file_types: 'jpeg,png',
      rotated_image_count: 1,
      flipped_image_count: 1,
      canvas_width: 1800,
      canvas_height: 1200,
      exceeds_canvas_limits: false,
      has_custom_filename: true,
      output_size_kb: 100,
    });

    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toContain('confidential-export');
    expect(serialized).not.toContain('my-private-photo');
    expect(serialized).not.toContain('receipt-123');
  });

  it('trackEvent fires on localhost with is_debug_mode: true and clears stale parameters between pushes', () => {
    expect(isLocalDebugEnvironment()).toBe(true);

    trackEvent({
      event: 'images_added',
      ingest_method: 'paste',
      added_count: 2,
      image_count: 2,
      file_types: 'jpeg,png',
      total_input_kb: 42,
    });

    trackEvent({
      event: 'orientation_change',
      selected_orientation: 'landscape',
      image_count: 2,
    });

    expect(window.dataLayer).toEqual([
      {
        event: 'images_added',
        ingest_method: 'paste',
        added_count: 2,
        image_count: 2,
        file_types: 'jpeg,png',
        total_input_kb: 42,
        is_debug_mode: true,
      },
      {
        ingest_method: undefined,
        added_count: undefined,
        file_types: undefined,
        total_input_kb: undefined,
      },
      {
        event: 'orientation_change',
        selected_orientation: 'landscape',
        image_count: 2,
        is_debug_mode: true,
      },
    ]);
  });

  it('supports resetting state cleanly across tests', () => {
    const spy = vi.spyOn(window.dataLayer!, 'push');
    trackEvent({
      event: 'help_dialog_toggle',
      action: 'open',
      image_count: 0,
    });
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
