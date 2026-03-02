import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// ============================================================================
// English Translations (Base Language — always bundled)
// ============================================================================
import commonEn from './locales/en/common.json' with { type: 'json' };
import notificationsEn from './locales/en/notifications.json' with { type: 'json' };
import settingsEn from './locales/en/settings.json' with { type: 'json' };
import navEn from './locales/en/nav.json' with { type: 'json' };
import pagesEn from './locales/en/pages.json' with { type: 'json' };
import mobileEn from './locales/en/mobile.json' with { type: 'json' };

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

// English is always available statically
export const resources = {
  en: {
    common: commonEn,
    notifications: notificationsEn,
    settings: settingsEn,
    nav: navEn,
    pages: pagesEn,
    mobile: mobileEn,
  },
} as const;

export const supportedLanguages = [
  'en',
  'af',
  'ar',
  'ca',
  'cs',
  'da',
  'de',
  'el',
  'es',
  'fi',
  'fr',
  'he',
  'hu',
  'it',
  'ja',
  'ko',
  'nl',
  'no',
  'pl',
  'pt',
  'ro',
  'ru',
  'sr',
  'sv',
  'tr',
  'uk',
  'vi',
  'zh',
] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

// ============================================================================
// Lazy Locale Loaders
// Each locale is loaded on-demand via dynamic import. Vite creates separate
// chunks for each locale so only the active language is downloaded.
// ============================================================================

type LocaleData = Record<string, Record<string, unknown>>;
type LocaleLoader = () => Promise<LocaleData>;

// Module-scope loader map — each entry uses static import() strings so Vite can
// discover and chunk them at build time.
const localeLoaders: Record<string, LocaleLoader> = {
  af: () =>
    Promise.all([
      import('./locales/af/common.json'),
      import('./locales/af/notifications.json'),
      import('./locales/af/settings.json'),
      import('./locales/af/nav.json'),
      import('./locales/af/pages.json'),
      import('./locales/af/mobile.json'),
    ]).then(([common, notifications, settings, nav, pages, mobile]) => ({
      common: common.default,
      notifications: notifications.default,
      settings: settings.default,
      nav: nav.default,
      pages: pages.default,
      mobile: mobile.default,
    })),
  ar: () =>
    Promise.all([
      import('./locales/ar/common.json'),
      import('./locales/ar/notifications.json'),
      import('./locales/ar/settings.json'),
      import('./locales/ar/nav.json'),
      import('./locales/ar/pages.json'),
      import('./locales/ar/mobile.json'),
    ]).then(([common, notifications, settings, nav, pages, mobile]) => ({
      common: common.default,
      notifications: notifications.default,
      settings: settings.default,
      nav: nav.default,
      pages: pages.default,
      mobile: mobile.default,
    })),
  ca: () =>
    Promise.all([
      import('./locales/ca/common.json'),
      import('./locales/ca/notifications.json'),
      import('./locales/ca/settings.json'),
      import('./locales/ca/nav.json'),
      import('./locales/ca/pages.json'),
      import('./locales/ca/mobile.json'),
    ]).then(([common, notifications, settings, nav, pages, mobile]) => ({
      common: common.default,
      notifications: notifications.default,
      settings: settings.default,
      nav: nav.default,
      pages: pages.default,
      mobile: mobile.default,
    })),
  cs: () =>
    Promise.all([
      import('./locales/cs/common.json'),
      import('./locales/cs/notifications.json'),
      import('./locales/cs/settings.json'),
      import('./locales/cs/nav.json'),
      import('./locales/cs/pages.json'),
      import('./locales/cs/mobile.json'),
    ]).then(([common, notifications, settings, nav, pages, mobile]) => ({
      common: common.default,
      notifications: notifications.default,
      settings: settings.default,
      nav: nav.default,
      pages: pages.default,
      mobile: mobile.default,
    })),
  da: () =>
    Promise.all([
      import('./locales/da/common.json'),
      import('./locales/da/notifications.json'),
      import('./locales/da/settings.json'),
      import('./locales/da/nav.json'),
      import('./locales/da/pages.json'),
      import('./locales/da/mobile.json'),
    ]).then(([common, notifications, settings, nav, pages, mobile]) => ({
      common: common.default,
      notifications: notifications.default,
      settings: settings.default,
      nav: nav.default,
      pages: pages.default,
      mobile: mobile.default,
    })),
  de: () =>
    Promise.all([
      import('./locales/de/common.json'),
      import('./locales/de/notifications.json'),
      import('./locales/de/settings.json'),
      import('./locales/de/nav.json'),
      import('./locales/de/pages.json'),
      import('./locales/de/mobile.json'),
    ]).then(([common, notifications, settings, nav, pages, mobile]) => ({
      common: common.default,
      notifications: notifications.default,
      settings: settings.default,
      nav: nav.default,
      pages: pages.default,
      mobile: mobile.default,
    })),
  el: () =>
    Promise.all([
      import('./locales/el/common.json'),
      import('./locales/el/notifications.json'),
      import('./locales/el/settings.json'),
      import('./locales/el/nav.json'),
      import('./locales/el/pages.json'),
      import('./locales/el/mobile.json'),
    ]).then(([common, notifications, settings, nav, pages, mobile]) => ({
      common: common.default,
      notifications: notifications.default,
      settings: settings.default,
      nav: nav.default,
      pages: pages.default,
      mobile: mobile.default,
    })),
  es: () =>
    Promise.all([
      import('./locales/es/common.json'),
      import('./locales/es/notifications.json'),
      import('./locales/es/settings.json'),
      import('./locales/es/nav.json'),
      import('./locales/es/pages.json'),
      import('./locales/es/mobile.json'),
    ]).then(([common, notifications, settings, nav, pages, mobile]) => ({
      common: common.default,
      notifications: notifications.default,
      settings: settings.default,
      nav: nav.default,
      pages: pages.default,
      mobile: mobile.default,
    })),
  fi: () =>
    Promise.all([
      import('./locales/fi/common.json'),
      import('./locales/fi/notifications.json'),
      import('./locales/fi/settings.json'),
      import('./locales/fi/nav.json'),
      import('./locales/fi/pages.json'),
      import('./locales/fi/mobile.json'),
    ]).then(([common, notifications, settings, nav, pages, mobile]) => ({
      common: common.default,
      notifications: notifications.default,
      settings: settings.default,
      nav: nav.default,
      pages: pages.default,
      mobile: mobile.default,
    })),
  fr: () =>
    Promise.all([
      import('./locales/fr/common.json'),
      import('./locales/fr/notifications.json'),
      import('./locales/fr/settings.json'),
      import('./locales/fr/nav.json'),
      import('./locales/fr/pages.json'),
      import('./locales/fr/mobile.json'),
    ]).then(([common, notifications, settings, nav, pages, mobile]) => ({
      common: common.default,
      notifications: notifications.default,
      settings: settings.default,
      nav: nav.default,
      pages: pages.default,
      mobile: mobile.default,
    })),
  he: () =>
    Promise.all([
      import('./locales/he/common.json'),
      import('./locales/he/notifications.json'),
      import('./locales/he/settings.json'),
      import('./locales/he/nav.json'),
      import('./locales/he/pages.json'),
      import('./locales/he/mobile.json'),
    ]).then(([common, notifications, settings, nav, pages, mobile]) => ({
      common: common.default,
      notifications: notifications.default,
      settings: settings.default,
      nav: nav.default,
      pages: pages.default,
      mobile: mobile.default,
    })),
  hu: () =>
    Promise.all([
      import('./locales/hu/common.json'),
      import('./locales/hu/notifications.json'),
      import('./locales/hu/settings.json'),
      import('./locales/hu/nav.json'),
      import('./locales/hu/pages.json'),
      import('./locales/hu/mobile.json'),
    ]).then(([common, notifications, settings, nav, pages, mobile]) => ({
      common: common.default,
      notifications: notifications.default,
      settings: settings.default,
      nav: nav.default,
      pages: pages.default,
      mobile: mobile.default,
    })),
  it: () =>
    Promise.all([
      import('./locales/it/common.json'),
      import('./locales/it/notifications.json'),
      import('./locales/it/settings.json'),
      import('./locales/it/nav.json'),
      import('./locales/it/pages.json'),
      import('./locales/it/mobile.json'),
    ]).then(([common, notifications, settings, nav, pages, mobile]) => ({
      common: common.default,
      notifications: notifications.default,
      settings: settings.default,
      nav: nav.default,
      pages: pages.default,
      mobile: mobile.default,
    })),
  ja: () =>
    Promise.all([
      import('./locales/ja/common.json'),
      import('./locales/ja/notifications.json'),
      import('./locales/ja/settings.json'),
      import('./locales/ja/nav.json'),
      import('./locales/ja/pages.json'),
      import('./locales/ja/mobile.json'),
    ]).then(([common, notifications, settings, nav, pages, mobile]) => ({
      common: common.default,
      notifications: notifications.default,
      settings: settings.default,
      nav: nav.default,
      pages: pages.default,
      mobile: mobile.default,
    })),
  ko: () =>
    Promise.all([
      import('./locales/ko/common.json'),
      import('./locales/ko/notifications.json'),
      import('./locales/ko/settings.json'),
      import('./locales/ko/nav.json'),
      import('./locales/ko/pages.json'),
      import('./locales/ko/mobile.json'),
    ]).then(([common, notifications, settings, nav, pages, mobile]) => ({
      common: common.default,
      notifications: notifications.default,
      settings: settings.default,
      nav: nav.default,
      pages: pages.default,
      mobile: mobile.default,
    })),
  nl: () =>
    Promise.all([
      import('./locales/nl/common.json'),
      import('./locales/nl/notifications.json'),
      import('./locales/nl/settings.json'),
      import('./locales/nl/nav.json'),
      import('./locales/nl/pages.json'),
      import('./locales/nl/mobile.json'),
    ]).then(([common, notifications, settings, nav, pages, mobile]) => ({
      common: common.default,
      notifications: notifications.default,
      settings: settings.default,
      nav: nav.default,
      pages: pages.default,
      mobile: mobile.default,
    })),
  no: () =>
    Promise.all([
      import('./locales/no/common.json'),
      import('./locales/no/notifications.json'),
      import('./locales/no/settings.json'),
      import('./locales/no/nav.json'),
      import('./locales/no/pages.json'),
      import('./locales/no/mobile.json'),
    ]).then(([common, notifications, settings, nav, pages, mobile]) => ({
      common: common.default,
      notifications: notifications.default,
      settings: settings.default,
      nav: nav.default,
      pages: pages.default,
      mobile: mobile.default,
    })),
  pl: () =>
    Promise.all([
      import('./locales/pl/common.json'),
      import('./locales/pl/notifications.json'),
      import('./locales/pl/settings.json'),
      import('./locales/pl/nav.json'),
      import('./locales/pl/pages.json'),
      import('./locales/pl/mobile.json'),
    ]).then(([common, notifications, settings, nav, pages, mobile]) => ({
      common: common.default,
      notifications: notifications.default,
      settings: settings.default,
      nav: nav.default,
      pages: pages.default,
      mobile: mobile.default,
    })),
  pt: () =>
    Promise.all([
      import('./locales/pt/common.json'),
      import('./locales/pt/notifications.json'),
      import('./locales/pt/settings.json'),
      import('./locales/pt/nav.json'),
      import('./locales/pt/pages.json'),
      import('./locales/pt/mobile.json'),
    ]).then(([common, notifications, settings, nav, pages, mobile]) => ({
      common: common.default,
      notifications: notifications.default,
      settings: settings.default,
      nav: nav.default,
      pages: pages.default,
      mobile: mobile.default,
    })),
  ro: () =>
    Promise.all([
      import('./locales/ro/common.json'),
      import('./locales/ro/notifications.json'),
      import('./locales/ro/settings.json'),
      import('./locales/ro/nav.json'),
      import('./locales/ro/pages.json'),
      import('./locales/ro/mobile.json'),
    ]).then(([common, notifications, settings, nav, pages, mobile]) => ({
      common: common.default,
      notifications: notifications.default,
      settings: settings.default,
      nav: nav.default,
      pages: pages.default,
      mobile: mobile.default,
    })),
  ru: () =>
    Promise.all([
      import('./locales/ru/common.json'),
      import('./locales/ru/notifications.json'),
      import('./locales/ru/settings.json'),
      import('./locales/ru/nav.json'),
      import('./locales/ru/pages.json'),
      import('./locales/ru/mobile.json'),
    ]).then(([common, notifications, settings, nav, pages, mobile]) => ({
      common: common.default,
      notifications: notifications.default,
      settings: settings.default,
      nav: nav.default,
      pages: pages.default,
      mobile: mobile.default,
    })),
  sr: () =>
    Promise.all([
      import('./locales/sr/common.json'),
      import('./locales/sr/notifications.json'),
      import('./locales/sr/settings.json'),
      import('./locales/sr/nav.json'),
      import('./locales/sr/pages.json'),
      import('./locales/sr/mobile.json'),
    ]).then(([common, notifications, settings, nav, pages, mobile]) => ({
      common: common.default,
      notifications: notifications.default,
      settings: settings.default,
      nav: nav.default,
      pages: pages.default,
      mobile: mobile.default,
    })),
  sv: () =>
    Promise.all([
      import('./locales/sv/common.json'),
      import('./locales/sv/notifications.json'),
      import('./locales/sv/settings.json'),
      import('./locales/sv/nav.json'),
      import('./locales/sv/pages.json'),
      import('./locales/sv/mobile.json'),
    ]).then(([common, notifications, settings, nav, pages, mobile]) => ({
      common: common.default,
      notifications: notifications.default,
      settings: settings.default,
      nav: nav.default,
      pages: pages.default,
      mobile: mobile.default,
    })),
  tr: () =>
    Promise.all([
      import('./locales/tr/common.json'),
      import('./locales/tr/notifications.json'),
      import('./locales/tr/settings.json'),
      import('./locales/tr/nav.json'),
      import('./locales/tr/pages.json'),
      import('./locales/tr/mobile.json'),
    ]).then(([common, notifications, settings, nav, pages, mobile]) => ({
      common: common.default,
      notifications: notifications.default,
      settings: settings.default,
      nav: nav.default,
      pages: pages.default,
      mobile: mobile.default,
    })),
  uk: () =>
    Promise.all([
      import('./locales/uk/common.json'),
      import('./locales/uk/notifications.json'),
      import('./locales/uk/settings.json'),
      import('./locales/uk/nav.json'),
      import('./locales/uk/pages.json'),
      import('./locales/uk/mobile.json'),
    ]).then(([common, notifications, settings, nav, pages, mobile]) => ({
      common: common.default,
      notifications: notifications.default,
      settings: settings.default,
      nav: nav.default,
      pages: pages.default,
      mobile: mobile.default,
    })),
  vi: () =>
    Promise.all([
      import('./locales/vi/common.json'),
      import('./locales/vi/notifications.json'),
      import('./locales/vi/settings.json'),
      import('./locales/vi/nav.json'),
      import('./locales/vi/pages.json'),
      import('./locales/vi/mobile.json'),
    ]).then(([common, notifications, settings, nav, pages, mobile]) => ({
      common: common.default,
      notifications: notifications.default,
      settings: settings.default,
      nav: nav.default,
      pages: pages.default,
      mobile: mobile.default,
    })),
  zh: () =>
    Promise.all([
      import('./locales/zh/common.json'),
      import('./locales/zh/notifications.json'),
      import('./locales/zh/settings.json'),
      import('./locales/zh/nav.json'),
      import('./locales/zh/pages.json'),
      import('./locales/zh/mobile.json'),
    ]).then(([common, notifications, settings, nav, pages, mobile]) => ({
      common: common.default,
      notifications: notifications.default,
      settings: settings.default,
      nav: nav.default,
      pages: pages.default,
      mobile: mobile.default,
    })),
};

// ============================================================================
// Locale Loading
// ============================================================================

const loadedLocales = new Set<string>(['en']);

/**
 * Load a locale's translation data on-demand.
 * English is always available (statically bundled). Other locales are fetched
 * as separate chunks and registered with i18next via addResourceBundle.
 */
export async function loadLocale(lang: string): Promise<void> {
  if (loadedLocales.has(lang)) return;

  const loader = localeLoaders[lang];
  if (!loader) return;
  try {
    const bundles = await loader();
    for (const [ns, data] of Object.entries(bundles)) {
      i18n.addResourceBundle(lang, ns, data, true, true);
    }
    loadedLocales.add(lang);
  } catch (err) {
    console.error(`[i18n] Failed to load locale "${lang}", falling back to English`, err);
  }
}

// ============================================================================
// i18next Configuration
// ============================================================================

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
 *
 * For non-English languages, the locale is loaded on-demand after init
 * so only the active language's translations are downloaded.
 */
export interface InitI18nOptions {
  lng?: SupportedLanguage;
}

export async function initI18n(options?: InitI18nOptions): Promise<typeof i18n> {
  if (i18n.isInitialized) {
    // If already initialized but a different locale is requested, load it
    const targetLng = options?.lng || 'en';
    if (targetLng !== 'en') {
      await loadLocale(targetLng);
    }
    return i18n;
  }

  if (initPromise) {
    return initPromise;
  }

  const targetLng = options?.lng || 'en';

  initPromise = i18n
    .use(initReactI18next)
    .init({
      ...defaultI18nConfig,
      ...options,
    })
    .then(async () => {
      // Load non-English locale data after init
      if (targetLng !== 'en') {
        await loadLocale(targetLng);
      }
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
