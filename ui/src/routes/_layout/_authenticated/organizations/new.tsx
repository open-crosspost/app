import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "../../../../lib/auth-client";

export const Route = createFileRoute("/_layout/_authenticated/organizations/new")({
  head: () => ({
    meta: [
      { title: "New Organization | demo.everything" },
      { name: "description", content: "Create a new organization." },
      { property: "og:title", content: "New Organization | demo.everything" },
      { property: "og:description", content: "Create a new organization." },
    ],
  }),
  component: NewOrganization,
});

function NewOrganization() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const handleBack = () => {
    if (router.history.canGoBack()) {
      router.history.back();
    } else {
      router.navigate({ to: "/organizations" });
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await authClient.organization.create({
        name,
        slug,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: async (data) => {
      toast.success(`Organization "${data?.name}" created successfully`);
      // Navigate to the new org
      if (data?.id) {
        router.navigate({ to: "/organizations/$id", params: { id: data.id } });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create organization");
    },
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slug || slug === generateSlug(name.slice(0, -1))) {
      setSlug(generateSlug(value));
    }
  };

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-border/50">
        <button
          type="button"
          onClick={handleBack}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
        >
          ← back to organizations
        </button>
        <h1 className="text-lg font-mono mt-2">New Organization</h1>
        <p className="text-xs text-muted-foreground mt-1">Create a new workspace for your team</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          createMutation.mutate();
        }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <label className="text-xs font-mono text-muted-foreground">Organization Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="w-full px-3 py-2 text-sm font-mono bg-background border border-border focus:border-ring rounded-md outline-none transition-colors"
            placeholder="My Team"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-mono text-muted-foreground">Slug</label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">@</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.replace(/[^a-z0-9-]/g, ""))}
              className="flex-1 px-3 py-2 text-sm font-mono bg-background border border-border focus:border-ring rounded-md outline-none transition-colors"
              placeholder="my-team"
              pattern="[a-z0-9-]+"
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">Only lowercase letters, numbers, and hyphens</p>
        </div>

        <div className="pt-4 flex gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="px-4 py-2 text-sm font-mono border border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40 transition-all rounded-md"
          >
            cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending || !name || !slug}
            className="flex-1 px-4 py-2 text-sm font-mono bg-primary text-primary-foreground hover:bg-primary/90 rounded-md disabled:opacity-50 transition-colors"
          >
            {createMutation.isPending ? "creating..." : "create organization"}
          </button>
        </div>
      </form>

      <div className="p-4 bg-muted/20 rounded-lg border border-border/50">
        <h3 className="text-xs font-mono font-medium mb-2">What happens next?</h3>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          <li>Your organization will be created immediately</li>
          <li>You&apos;ll be the owner with full permissions</li>
          <li>You can invite team members from the organization settings</li>
          <li>You can switch between organizations anytime</li>
        </ul>
      </div>
    </div>
  );
}
