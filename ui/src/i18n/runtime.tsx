import "everything-dev/ui/i18n";
import { createContext, type ReactNode, useContext } from "react";

const AppLocaleContext = createContext<string | undefined>(undefined);

export function AppI18nProvider({
  children,
  preferredLocale,
}: {
  children: ReactNode;
  preferredLocale?: string | null;
}) {
  return (
    <AppLocaleContext.Provider value={preferredLocale ?? undefined}>
      {children}
    </AppLocaleContext.Provider>
  );
}

export const useAppLocale = (): string | undefined => useContext(AppLocaleContext);

export const useAppTranslation = () => ({
  t: (key: string) => key,
});
