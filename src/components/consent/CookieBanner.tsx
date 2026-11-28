import { useEffect, useState } from 'react';
import { type CookieConsentStatus } from '../../types';
import { trackEvent } from '../../utils/analytics';
import {
    CONSENT_STORAGE_KEY,
    getConsentCookie,
    setConsentCookie,
} from '../../utils/consent';

/**
 * Lightweight cookie consent banner wired to Google Consent Mode v2 and GTM dataLayer.
 * Starts hidden for returning visitors who already have a valid consent cookie.
 */
const CookieBanner = () => {
    const [isVisible, setIsVisible] = useState(() => !getConsentCookie());

    useEffect(() => {
        if (!getConsentCookie()) {
            try {
                localStorage.removeItem(CONSENT_STORAGE_KEY);
            } catch {
                // Ignore storage errors in restricted browsing modes
            }
        }
    }, []);

    const handleConsentUpdate = (granted: boolean) => {
        const status: CookieConsentStatus = granted ? 'granted' : 'denied';
        setConsentCookie(status);

        try {
            localStorage.setItem(CONSENT_STORAGE_KEY, status);
        } catch (err) {
            console.warn('Unable to save consent preference to localStorage', err);
        }

        if (typeof window.gtag === 'function') {
            window.gtag('consent', 'update', {
                ad_storage: status,
                ad_user_data: status,
                ad_personalization: status,
                analytics_storage: status,
            });
        }

        trackEvent({
            event: 'cookie_consent_update',
            consent_status: status,
            consent_analytics: status,
            consent_marketing: status,
        });

        setIsVisible(false);
    };

    return (
        <aside
            id="cookie-banner"
            className={`cookie-banner${isVisible ? '' : ' hidden'}`}
            role="region"
            aria-label="Cookie consent"
        >
            <span className="cookie-banner-text">Can I set cookies?</span>
            <div className="cookie-banner-actions">
                <button
                    id="consent-no-btn"
                    type="button"
                    className="cookie-btn cookie-btn-no"
                    onClick={() => handleConsentUpdate(false)}
                >
                    No
                </button>
                <button
                    id="consent-yes-btn"
                    type="button"
                    className="cookie-btn cookie-btn-yes"
                    onClick={() => handleConsentUpdate(true)}
                >
                    Yes
                </button>
            </div>
        </aside>
    );
};

export default CookieBanner;
