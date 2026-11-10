import { createLocaleRuntime, createMessageCatalogs } from "everything-dev/ui/i18n";
import type { ReactNode } from "react";

export const APP_LOCALES = ["en"] as const;
export type AppLocale = (typeof APP_LOCALES)[number];

export const APP_MESSAGES = {
  "buddy.celebrate": ["LETS GOOO!"],
  "buddy.sad": ["Oops! Something went wrong. Don't worry, let's try again!"],
  "buddy.tip.editor": ["Ready to share something awesome?"],
  "buddy.tip.campaigns": ["Let's make this campaign a success!"],
  "buddy.tip.leaderboard": ["Keep going! You're climbing the ranks!"],
  "buddy.tip.sponsored": [
    "Psst — your X posts publish through the app's sponsored key. No keys, no deposits from you; the app pays per post.",
  ],
} as const;

export const messageCatalogs = createMessageCatalogs([...APP_LOCALES], APP_MESSAGES);

const { LocaleProvider, useLocale, useTranslation } = createLocaleRuntime({
  locales: [...APP_LOCALES],
  defaultLocale: "en",
  cookieName: "locale",
});

export function AppI18nProvider({
  children,
  preferredLocale,
}: {
  children: ReactNode;
  preferredLocale?: string | null;
}) {
  return (
    <LocaleProvider
      preferredLocale={preferredLocale ?? undefined}
      messages={(locale) => messageCatalogs[locale as AppLocale] ?? messageCatalogs.en}
    >
      {children}
    </LocaleProvider>
  );
}

export const useAppLocale = (): string => useLocale().locale;

export const useAppTranslation = () => {
  const t = useTranslation();
  return { t };
};
