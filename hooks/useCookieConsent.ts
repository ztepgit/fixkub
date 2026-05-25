//hooks/useCookieConsent.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import Cookies from "js-cookie"

export const CURRENT_CONSENT_VERSION = 1;

export interface ConsentState {
    functional: boolean;
    analytics: boolean;
}

export interface CookieConsentData {
    v: number;
    consent: ConsentState;
    ts: number;
}

const COOKIE_NAME = "fw_cookie_consent";
const COOKIE_OPTIONS = { expires: 365, sameSite: "Lax" as const };

const DEFAULT_CONSENT: ConsentState = {
    functional: false,
    analytics: false,
};

export function useCookieConsent() {
    const [showBanner, setShowBanner] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [consent, setConsent] = useState<ConsentState>(DEFAULT_CONSENT);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load & Validate
    useEffect(() => {
        const rawCookie = Cookies.get(COOKIE_NAME);
        if (!rawCookie) {
            setShowBanner(true);
            setIsLoaded(true);
            return;
        }

        try {
            const data: CookieConsentData = JSON.parse(rawCookie);

            if (data.v !== CURRENT_CONSENT_VERSION) {
                // Version mismatch - force new consent
                Cookies.remove(COOKIE_NAME);
                setShowBanner(true);
            } else {
                // Valid consent
                setConsent(data.consent);
            }
        } catch (e) {
            // Invalid JSON - wipe and force new consent
            Cookies.remove(COOKIE_NAME);
            setShowBanner(true);
        }

        setIsLoaded(true);
    }, []);

    // Application Logic
    useEffect(() => {
        if (!isLoaded || showBanner) return;

        if (consent.analytics) {
            // TODO: Initialize Google Analytics / PostHog etc.
            console.log("🟢 Analytics Enabled");
        } else {
            // TODO: Disable/Remove Tracking scripts
            console.log("🔴 Analytics Disabled");
        }

        if (consent.functional) {
            // TODO: Apply functional storage (e.g. remember filters)
            console.log("🟢 Functional Storage Enabled");
        } else {
            // TODO: Clear non-essential local storage
            console.log("🔴 Functional Storage Disabled");
        }
    }, [consent, isLoaded, showBanner]);

    const saveConsent = useCallback((newConsent: ConsentState) => {
        const data: CookieConsentData = {
            v: CURRENT_CONSENT_VERSION,
            consent: newConsent,
            ts: Date.now(),
        };

        Cookies.set(COOKIE_NAME, JSON.stringify(data), COOKIE_OPTIONS);
        setConsent(newConsent);
        setShowBanner(false);
        setShowSettings(false);
    }, []);

    const acceptAll = useCallback(() => {
        saveConsent({ functional: true, analytics: true });
    }, [saveConsent]);

    const rejectAll = useCallback(() => {
        saveConsent({ functional: false, analytics: false });
    }, [saveConsent]);

    return {
        isLoaded,
        showBanner,
        showSettings,
        consent,
        setShowSettings,
        acceptAll,
        rejectAll,
        saveConsent,
    };
}