import { type RenderOptions, render } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { AppI18nProvider } from "@/i18n/runtime";

function Wrapper({ children }: { children: ReactNode }) {
  return <AppI18nProvider preferredLocale="en">{children}</AppI18nProvider>;
}

export function renderWithI18n(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, { wrapper: Wrapper, ...options });
}
