import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// ============================================================================
// English Translations (Base Language)
// ============================================================================
import commonEn from './locales/en/common.json' with { type: 'json' };
import notificationsEn from './locales/en/notifications.json' with { type: 'json' };
import settingsEn from './locales/en/settings.json' with { type: 'json' };
import navEn from './locales/en/nav.json' with { type: 'json' };
import pagesEn from './locales/en/pages.json' with { type: 'json' };
import mobileEn from './locales/en/mobile.json' with { type: 'json' };

// ============================================================================
// German Translations
// ============================================================================
import commonDe from './locales/de/common.json' with { type: 'json' };
import notificationsDe from './locales/de/notifications.json' with { type: 'json' };
import settingsDe from './locales/de/settings.json' with { type: 'json' };
import navDe from './locales/de/nav.json' with { type: 'json' };
import pagesDe from './locales/de/pages.json' with { type: 'json' };
import mobileDe from './locales/de/mobile.json' with { type: 'json' };

// ============================================================================
// Portuguese Translations
// ============================================================================
import commonPt from './locales/pt/common.json' with { type: 'json' };
import notificationsPt from './locales/pt/notifications.json' with { type: 'json' };
import settingsPt from './locales/pt/settings.json' with { type: 'json' };
import navPt from './locales/pt/nav.json' with { type: 'json' };
import pagesPt from './locales/pt/pages.json' with { type: 'json' };
import mobilePt from './locales/pt/mobile.json' with { type: 'json' };

// ============================================================================
// French Translations
// ============================================================================
import commonFr from './locales/fr/common.json' with { type: 'json' };
import notificationsFr from './locales/fr/notifications.json' with { type: 'json' };
import settingsFr from './locales/fr/settings.json' with { type: 'json' };
import navFr from './locales/fr/nav.json' with { type: 'json' };
import pagesFr from './locales/fr/pages.json' with { type: 'json' };
import mobileFr from './locales/fr/mobile.json' with { type: 'json' };

// ============================================================================
// Dutch Translations
// ============================================================================
import commonNl from './locales/nl/common.json' with { type: 'json' };
import notificationsNl from './locales/nl/notifications.json' with { type: 'json' };
import settingsNl from './locales/nl/settings.json' with { type: 'json' };
import navNl from './locales/nl/nav.json' with { type: 'json' };
import pagesNl from './locales/nl/pages.json' with { type: 'json' };
import mobileNl from './locales/nl/mobile.json' with { type: 'json' };

// ============================================================================
// Polish Translations
// ============================================================================
import commonPl from './locales/pl/common.json' with { type: 'json' };
import notificationsPl from './locales/pl/notifications.json' with { type: 'json' };
import settingsPl from './locales/pl/settings.json' with { type: 'json' };
import navPl from './locales/pl/nav.json' with { type: 'json' };
import pagesPl from './locales/pl/pages.json' with { type: 'json' };
import mobilePl from './locales/pl/mobile.json' with { type: 'json' };

// ============================================================================
// Spanish Translations
// ============================================================================
import commonEs from './locales/es/common.json' with { type: 'json' };
import notificationsEs from './locales/es/notifications.json' with { type: 'json' };
import settingsEs from './locales/es/settings.json' with { type: 'json' };
import navEs from './locales/es/nav.json' with { type: 'json' };
import pagesEs from './locales/es/pages.json' with { type: 'json' };
import mobileEs from './locales/es/mobile.json' with { type: 'json' };

// ============================================================================
// Ukrainian Translations
// ============================================================================
import commonUk from './locales/uk/common.json' with { type: 'json' };
import notificationsUk from './locales/uk/notifications.json' with { type: 'json' };
import settingsUk from './locales/uk/settings.json' with { type: 'json' };
import navUk from './locales/uk/nav.json' with { type: 'json' };
import pagesUk from './locales/uk/pages.json' with { type: 'json' };
import mobileUk from './locales/uk/mobile.json' with { type: 'json' };

export const defaultNS = 'common';
export const namespaces = [
  'common',
  'notifications',
  'settings',
  'nav',
  'pages',
  'mobile',
] as const;
export type Namespace = (typeof namespaces)[number];

export const resources = {
  en: {
    common: commonEn,
    notifications: notificationsEn,
    settings: settingsEn,
    nav: navEn,
    pages: pagesEn,
    mobile: mobileEn,
  },
  de: {
    common: commonDe,
    notifications: notificationsDe,
    settings: settingsDe,
    nav: navDe,
    pages: pagesDe,
    mobile: mobileDe,
  },
  pt: {
    common: commonPt,
    notifications: notificationsPt,
    settings: settingsPt,
    nav: navPt,
    pages: pagesPt,
    mobile: mobilePt,
  },
  fr: {
    common: commonFr,
    notifications: notificationsFr,
    settings: settingsFr,
    nav: navFr,
    pages: pagesFr,
    mobile: mobileFr,
  },
  es: {
    common: commonEs,
    notifications: notificationsEs,
    settings: settingsEs,
    nav: navEs,
    pages: pagesEs,
    mobile: mobileEs,
  },
  nl: {
    common: commonNl,
    notifications: notificationsNl,
    settings: settingsNl,
    nav: navNl,
    pages: pagesNl,
    mobile: mobileNl,
  },
  pl: {
    common: commonPl,
    notifications: notificationsPl,
    settings: settingsPl,
    nav: navPl,
    pages: pagesPl,
    mobile: mobilePl,
  },
  uk: {
    common: commonUk,
    notifications: notificationsUk,
    settings: settingsUk,
    nav: navUk,
    pages: pagesUk,
    mobile: mobileUk,
  },
} as const;

export const supportedLanguages = Object.keys(resources) as (keyof typeof resources)[];
export type SupportedLanguage = keyof typeof resources;

export const defaultI18nConfig = {
  lng: 'en',
  fallbackLng: 'en',
  defaultNS,
  ns: namespaces,
  resources,
  interpolation: {
    escapeValue: false, // React already escapes values
  },
  // Returning the key is better than empty string for debugging
  returnNull: false,
  returnEmptyString: false,
} as const;

// Prevents race conditions when initI18n is called concurrently
let initPromise: Promise<typeof i18n> | null = null;

/**
 * Initialize i18next. Call once at app startup before rendering.
 * Safe to call concurrently - multiple calls share the same initialization.
 */
export interface InitI18nOptions {
  lng?: SupportedLanguage;
}

export async function initI18n(options?: InitI18nOptions): Promise<typeof i18n> {
  if (i18n.isInitialized) {
    return i18n;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = i18n
    .use(initReactI18next)
    .init({
      ...defaultI18nConfig,
      ...options,
    })
    .then(() => {
      initPromise = null;
      return i18n;
    })
    .catch((error: unknown) => {
      initPromise = null;
      throw error;
    });

  return initPromise;
}

export { i18n };
