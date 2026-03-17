import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Building2, Code, Globe, Home, Key, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import builtOn from "@/assets/built_on.png";
import builtOnRev from "@/assets/built_on_rev.png";
import { useClientValue } from "@/hooks/use-client";
import { ThemeToggle } from "../components/theme-toggle";
import { UserNav } from "../components/user-nav";
import { sessionQueryOptions } from "../lib/session";

export const Route = createFileRoute("/_layout")({
  component: Layout,
});

const authenticatedSidebarItems = [
  { icon: Home, label: "home", to: "/" as const },
  { icon: Globe, label: "apps", to: "/apps" as const },
  { icon: Building2, label: "organizations", to: "/organizations" as const },
  { icon: Settings, label: "settings", to: "/settings" as const },
  { icon: Key, label: "keys", to: "/keys" as const },
  { icon: BookOpen, label: "about", to: "/about" as const },
  { icon: Code, label: "api", href: "/api" },
];

const HAS_AUTHENTICATED_KEY = "everything.dev.has-authenticated";

function Layout() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const { data: session } = useQuery(sessionQueryOptions());
  const isAuthenticated = !!session?.user;
  const isHomepage = pathname === "/";
  const hasAuthenticatedBefore = useClientValue(
    () => localStorage.getItem(HAS_AUTHENTICATED_KEY) === "1",
    false,
  );
  const showIntro = !isAuthenticated && isHomepage && !hasAuthenticatedBefore;
  const [introVisible, setIntroVisible] = useState(showIntro);

  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem(HAS_AUTHENTICATED_KEY, "1");
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!showIntro) {
      setIntroVisible(false);
      return;
    }

    setIntroVisible(true);
  }, [showIntro]);

  const dismissIntro = () => setIntroVisible(false);

  const isActive = (item: (typeof authenticatedSidebarItems)[number]) => {
    if (item.to) {
      return pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
    }

    if (item.href) {
      return pathname.startsWith(item.href);
    }

    return false;
  };

  return (
    <div className="min-h-screen w-full flex bg-background text-foreground">
      {isAuthenticated && (
        <aside className="hidden sm:flex shrink-0 w-16 flex-col items-center border-r border-border bg-card py-4 gap-1.5 overflow-y-auto animate-fade-in">
          <Link
            to="/"
            aria-label="everything.dev home"
            className="mb-3 flex items-center justify-center w-10 h-10 border-2 border-outset border-[rgb(51,51,51)] dark:border-[rgb(100,100,100)] bg-card shadow-sm transition-shadow duration-200 hover:shadow-md"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-foreground">
              <title>everything.dev</title>
              <circle cx="12" cy="12" r="10" />
            </svg>
          </Link>

          {authenticatedSidebarItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            const className = `flex items-center justify-center w-10 h-10 border-2 border-outset border-[rgb(51,51,51)] dark:border-[rgb(100,100,100)] shadow-sm transition-all duration-200 ease-out hover:shadow-md ${active ? "bg-foreground text-background" : "bg-card text-foreground hover:bg-muted"}`;

            if (item.to) {
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  preload="intent"
                  className={className}
                  title={item.label}
                >
                  <Icon className="w-4 h-4" />
                </Link>
              );
            }

            return (
              <a key={item.label} href={item.href} className={className} title={item.label}>
                <Icon className="w-4 h-4" />
              </a>
            );
          })}

          <div className="mt-auto pt-4">
            <ThemeToggle />
          </div>
        </aside>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header
          className={`shrink-0 bg-card/50 ${isAuthenticated ? "border-b border-border animate-fade-in" : ""}`}
        >
          <div className="flex items-center justify-between px-4 sm:px-6 h-12">
            {isAuthenticated ? (
              <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground font-mono min-w-0">
                <span>everything.dev</span>
                <span>/</span>
                <span className="truncate">
                  {pathname === "/" ? "home" : pathname.slice(1).split("/").join(" / ")}
                </span>
              </div>
            ) : (
              <Link to="/" className="text-sm font-medium tracking-tight">
                everything.dev
              </Link>
            )}

            <div className="flex items-center gap-2">
              {!isAuthenticated && (
                <div className="sm:hidden">
                  <ThemeToggle />
                </div>
              )}
              <UserNav />
            </div>
          </div>
        </header>

        <main className="flex-1 w-full min-h-0 overflow-auto scroll-smooth">
          <div
            className={`w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-fade-in-up ${isAuthenticated ? "max-w-5xl" : "max-w-4xl"}`}
          >
            <Outlet />
          </div>
        </main>

        <footer className="shrink-0 flex justify-center py-6">
          <a
            href="https://near.org"
            target="_blank"
            rel="noopener noreferrer"
            className="relative h-6 w-[100px]"
          >
            <img
              src={builtOn}
              alt="Built on NEAR"
              className="absolute inset-0 h-full w-full object-contain dark:hidden"
            />
            <img
              src={builtOnRev}
              alt="Built on NEAR"
              className="absolute inset-0 hidden h-full w-full object-contain dark:block"
            />
          </a>
        </footer>

        {isAuthenticated && (
          <nav className="sm:hidden shrink-0 border-t border-border bg-card animate-fade-in">
            <div className="flex items-center justify-around px-2 py-2">
              {authenticatedSidebarItems.slice(0, 5).map((item) => {
                const Icon = item.icon;
                const active = isActive(item);
                const className = `flex flex-col items-center justify-center gap-0.5 p-1.5 transition-colors duration-200 ${active ? "text-foreground" : "text-muted-foreground"}`;

                if (item.to) {
                  return (
                    <Link key={item.label} to={item.to} preload="intent" className={className}>
                      <Icon className="w-4 h-4" />
                      <span className="text-[10px]">{item.label}</span>
                    </Link>
                  );
                }

                return (
                  <a key={item.label} href={item.href} className={className}>
                    <Icon className="w-4 h-4" />
                    <span className="text-[10px]">{item.label}</span>
                  </a>
                );
              })}
            </div>
          </nav>
        )}
      </div>

      <AnimatePresence>
        {introVisible && (
          <motion.div
            key="legacy-intro"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background cursor-pointer"
            onClick={dismissIntro}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="flex flex-col items-center justify-center gap-6 px-4 pb-[8vh] text-center sm:px-6"
            >
              <h1
                className="text-5xl font-semibold tracking-tight sm:text-7xl"
                style={{
                  textShadow: "rgba(0,0,0,0.08) 1px 1px 1px, rgba(0,0,0,0.06) 3px 3px 3px",
                }}
              >
                everything.dev
              </h1>
              <img
                src="https://ipfs.near.social/ipfs/bafkreidhy7zo33wqjxhqsv2dd6dp2wzloitaa4lmj3rzq5zvcdtp2smeaa"
                alt="under construction"
                className="h-auto w-full max-w-xl"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
