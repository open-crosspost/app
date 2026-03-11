import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { ThemeToggle } from "../components/theme-toggle";
import { UserNav } from "../components/user-nav";

export const Route = createFileRoute("/_layout")({
  component: Layout,
});

function Layout() {
  return (
    <div className="min-h-screen w-full flex flex-col bg-background text-foreground">
      <header className="shrink-0 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center justify-center w-8 h-8">
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-7 h-7 text-foreground"
                >
                  <circle cx="12" cy="12" r="10" />
                </svg>
              </Link>
              <ThemeToggle />
            </div>
            <UserNav />
          </div>
        </div>
      </header>

      <main className="flex-1 w-full min-h-0 overflow-auto">
        <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
          <Outlet />
        </div>
      </main>

      <footer className="shrink-0 border-t border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <a
            href="/api"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            api
          </a>
        </div>
      </footer>
    </div>
  );
}
