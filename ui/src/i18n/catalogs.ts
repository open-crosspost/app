export const APP_LOCALES = ["en"] as const;
export type AppLocale = (typeof APP_LOCALES)[number];
export const DEFAULT_APP_LOCALE: AppLocale = "en";
export const APP_LOCALE_COOKIE = "app_locale";
export const APP_LOCALE_LABELS: Record<AppLocale, string> = {
  en: "English",
};

export function getAppMessages(_locale: AppLocale) {
  return {} as Record<string, string>;
}
