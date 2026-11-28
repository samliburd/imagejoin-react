import { type CookieConsentStatus } from '../types';

export const CONSENT_STORAGE_KEY = 'ij_cookie_consent';
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24; // 24 hours

export function getConsentCookie(): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(/(^|;\s*)ij_cookie_consent=([^;]+)/);
    return match ? match[2] : null;
}

export function setConsentCookie(value: CookieConsentStatus): void {
    document.cookie = `${CONSENT_STORAGE_KEY}=${value}; path=/; max-age=${CONSENT_MAX_AGE_SECONDS}; SameSite=Lax`;
}
