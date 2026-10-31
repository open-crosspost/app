import { createFileRoute, Link } from "@tanstack/react-router";
import { pluginPath } from "@/app";
import { LandingPage } from "@/components/landing-page";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_public/")({
  component: LandingRoute,
});

function LandingRoute() {
  const { session } = Route.useRouteContext();
  const isSignedIn = !!session?.user;

  return (
    <LandingPage
      cta={
        <Button asChild size="lg">
          <Link to={isSignedIn ? "/editor" : pluginPath("/login")}>
            {isSignedIn ? "Post" : "Connect"}
          </Link>
        </Button>
      }
    />
  );
}
