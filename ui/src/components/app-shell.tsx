import type { ReactNode } from "react";
import { Header } from "./header";

/**
 * The app frame — the bordered, hard-shadowed surface every page renders on.
 * The outer gutter (p-2) leaves room for the shadow; min-h keeps the frame
 * full-height even on short pages.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col p-2">
      <div
        data-testid="app-frame"
        className="mx-auto flex min-h-[calc(100dvh-1rem)] w-full flex-1 flex-col overflow-hidden border-2 border-primary bg-white shadow-[4px_4px_0_rgba(0,0,0,1)] dark:bg-black dark:shadow-[4px_4px_0_rgba(255,255,255,0.3)]"
      >
        {children}
      </div>
    </div>
  );
}

interface AppShellProps {
  children: ReactNode;
  footer?: ReactNode;
  focused?: boolean;
}

export function AppShell({ children, footer, focused = false }: AppShellProps) {
  if (focused) {
    return (
      <AppFrame>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden" data-testid="app-shell">
          <Header />
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
        </div>
      </AppFrame>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AppFrame>
        <div className="flex min-h-0 flex-1 flex-col" data-testid="app-shell">
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <Header />
            <div className="flex flex-1 flex-col">{children}</div>
          </div>
        </div>
      </AppFrame>
      {footer && <div className="shrink-0">{footer}</div>}
    </div>
  );
}
