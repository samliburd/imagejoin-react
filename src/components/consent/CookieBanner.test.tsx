import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import indexHtml from '../../../index.html?raw';
import { CONSENT_STORAGE_KEY } from '../../utils/consent';
import CookieBanner from './CookieBanner';

function clearConsentCookie(): void {
  document.cookie = `${CONSENT_STORAGE_KEY}=; path=/; max-age=0; SameSite=Lax`;
}

describe('index.html Google Consent Mode v2 initialization', () => {
  it('initializes gtag consent default to denied before GTM loads', () => {
    const consentIdx = indexHtml.indexOf("gtag('consent', 'default'");
    const gtmIdx = indexHtml.indexOf('https://go.imagejoin.app/cEwszCUvNx36/');
    expect(consentIdx).toBeGreaterThan(-1);
    expect(gtmIdx).toBeGreaterThan(consentIdx);
    expect(indexHtml).toContain('wait_for_update: 500');
  });
});

describe('CookieBanner', () => {
  beforeEach(() => {
    clearConsentCookie();
    localStorage.clear();
  });

  it('shows banner when no consent cookie exists and clears stale localStorage', () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, 'granted');

    render(<CookieBanner />);

    const banner = screen.getByRole('region', { name: 'Cookie consent' });
    expect(banner).toHaveAttribute('id', 'cookie-banner');
    expect(banner).not.toHaveClass('hidden');
    expect(screen.getByText('Can I set cookies?')).toBeInTheDocument();
    expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBeNull();
  });

  it('stays hidden when a consent cookie is already present', () => {
    document.cookie = `${CONSENT_STORAGE_KEY}=granted; path=/; max-age=86400; SameSite=Lax`;

    render(<CookieBanner />);

    const banner = screen.getByRole('region', { name: 'Cookie consent' });
    expect(banner).toHaveClass('hidden');
  });

  it('grants consent, updates gtag and dataLayer, persists 24h cookie, and hides banner on Yes', async () => {
    const user = userEvent.setup();
    const gtagSpy = vi.fn();
    window.gtag = gtagSpy;

    render(<CookieBanner />);
    await user.click(screen.getByRole('button', { name: 'Yes' }));

    expect(document.cookie).toContain(`${CONSENT_STORAGE_KEY}=granted`);
    expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBe('granted');
    expect(gtagSpy).toHaveBeenCalledWith('consent', 'update', {
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      analytics_storage: 'granted',
    });
    expect(window.dataLayer).toContainEqual(
      expect.objectContaining({
        event: 'cookie_consent_update',
        consent_status: 'granted',
        consent_analytics: 'granted',
        consent_marketing: 'granted',
      }),
    );
    expect(screen.getByRole('region', { name: 'Cookie consent' })).toHaveClass('hidden');
  });

  it('denies consent, updates gtag and dataLayer, and hides banner on No', async () => {
    const user = userEvent.setup();
    const gtagSpy = vi.fn();
    window.gtag = gtagSpy;

    render(<CookieBanner />);
    await user.click(screen.getByRole('button', { name: 'No' }));

    expect(document.cookie).toContain(`${CONSENT_STORAGE_KEY}=denied`);
    expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBe('denied');
    expect(gtagSpy).toHaveBeenCalledWith('consent', 'update', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
    });
    expect(window.dataLayer).toContainEqual(
      expect.objectContaining({
        event: 'cookie_consent_update',
        consent_status: 'denied',
        consent_analytics: 'denied',
        consent_marketing: 'denied',
      }),
    );
    expect(screen.getByRole('region', { name: 'Cookie consent' })).toHaveClass('hidden');
  });

  it('handles localStorage errors gracefully without breaking consent flow', async () => {
    const user = userEvent.setup();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    render(<CookieBanner />);
    await user.click(screen.getByRole('button', { name: 'Yes' }));

    expect(warnSpy).toHaveBeenCalled();
    expect(document.cookie).toContain(`${CONSENT_STORAGE_KEY}=granted`);
    expect(screen.getByRole('region', { name: 'Cookie consent' })).toHaveClass('hidden');
    warnSpy.mockRestore();
  });
});
