import { initI18n, type SupportedLanguage, supportedLanguages } from '@tracearr/translations';

// Initialize i18n with browser language detection
const userLanguage = navigator.language.split('-')[0] as SupportedLanguage;
const language: SupportedLanguage = supportedLanguages.includes(userLanguage) ? userLanguage : 'en';

// Export the ready promise so main.tsx can await before rendering.
// This ensures non-English locale data is loaded before the first paint.
export const i18nReady = initI18n({ lng: language });

export { i18n } from '@tracearr/translations';
