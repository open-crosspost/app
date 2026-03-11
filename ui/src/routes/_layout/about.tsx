import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_layout/about")({
  head: () => ({
    meta: [
      { title: "About | everything.dev" },
      { name: "description", content: "About everything.dev" },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <Link
          to="/"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
        >
          ← back
        </Link>
        <h1 className="text-lg font-mono">About</h1>
      </section>
      
      <section className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-sm font-mono mb-4">everything.dev</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              A pursuit for the open web.
            </p>
          </CardContent>
        </Card>
      </section>
      
      <section className="space-y-4">
        <h2 className="text-xs font-mono text-muted-foreground border-b border-border pb-2">
          features
        </h2>
        <ul className="text-xs text-muted-foreground space-y-2">
          <li>• NEAR wallet authentication</li>
          <li>• Email & phone authentication</li>
          <li>• Passkey support</li>
          <li>• Organization management</li>
          <li>• API keys for developers</li>
        </ul>
      </section>
    </div>
  );
}
