import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_layout/")({
  head: () => ({
    meta: [
      { title: "everything.dev | A pursuit for the open web" },
      { name: "description", content: "everything.dev - A pursuit for the open web" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-6">
      <div className="max-w-2xl text-center space-y-8">
        <h1 className="text-3xl sm:text-4xl font-semibold">
          everything.dev
        </h1>
        <p className="text-base text-muted-foreground">
          a pursuit for the open web
        </p>
        
        <div className="pt-8 space-y-4">
          <Button asChild>
            <Link to="/login">
              get started →
            </Link>
          </Button>
        </div>
        
        <div className="pt-8">
          <a
            href="/about"
            className="text-sm text-link hover:underline"
          >
            about
          </a>
        </div>
      </div>
    </div>
  );
}
