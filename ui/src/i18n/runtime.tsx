import { createContext, useContext, type ReactNode } from "react";

const AppLocaleContext = createContext<string | undefined>(undefined);

export function AppI18nProvider({
  children,
  preferredLocale,
}: {
  children: ReactNode;
  preferredLocale?: string | null;
}) {
  return (
    <AppLocaleContext.Provider value={preferredLocale}>{children}</AppLocaleContext.Provider>
  );
}

export const useAppLocale = (): string | undefined => useContext(AppLocaleContext);

export const useAppTranslation = () => ({
  t: (key: string) => key,
});
