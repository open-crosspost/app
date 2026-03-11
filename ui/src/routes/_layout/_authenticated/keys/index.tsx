import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { apiClient } from "@/remote/orpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_layout/_authenticated/keys/")({
  head: () => ({
    meta: [
      { title: "KV Store | demo.everything" },
      { name: "description", content: "Key-value store for testing." },
    ],
  }),
  component: KeysList,
});

function KeysList() {
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const keysQuery = useQuery({
    queryKey: ["kv-keys"],
    queryFn: () => apiClient.listKeys({ limit: 50 }),
  });

  const createMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      apiClient.setValue({ key, value }),
    onSuccess: async (data) => {
      toast.success(`Key "${data.key}" ${data.created ? "created" : "updated"}`);
      await queryClient.invalidateQueries({ queryKey: ["kv-keys"] });
      setNewKey("");
      setNewValue("");
      setShowCreateForm(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create key");
    },
  });

  const generateSampleKeys = useMutation({
    mutationFn: async () => {
      const sampleKeys = Array.from({ length: 25 }, (_, i) => ({
        key: `sample-key-${String(i + 1).padStart(3, "0")}`,
        value: `Sample value for key ${i + 1} - ${new Date().toISOString()}`,
      }));

      await Promise.all(sampleKeys.map(({ key, value }) => apiClient.setValue({ key, value })));
      return sampleKeys.length;
    },
    onSuccess: async (count) => {
      toast.success(`Created ${count} sample keys`);
      await queryClient.invalidateQueries({ queryKey: ["kv-keys"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to generate sample keys");
    },
  });

  const keys = keysQuery.data?.keys || [];
  const total = keysQuery.data?.total || 0;
  const hasMore = keysQuery.data?.hasMore || false;

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-mono">KV Store</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {total} key{total !== 1 ? "s" : ""} stored
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              variant="outline"
              size="sm"
            >
              {showCreateForm ? "cancel" : "new key"}
            </Button>
            {keys.length < 10 && (
              <Button
                onClick={() => generateSampleKeys.mutate()}
                disabled={generateSampleKeys.isPending}
                variant="outline"
                size="sm"
              >
                {generateSampleKeys.isPending ? "creating..." : "generate samples"}
              </Button>
            )}
          </div>
        </div>
      </section>

      {showCreateForm && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <Input
              type="text"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="key name"
            />
            <Input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="value"
            />
            <Button
              onClick={() => createMutation.mutate({ key: newKey, value: newValue })}
              disabled={createMutation.isPending || !newKey || !newValue}
              variant="outline"
              size="sm"
              className="w-full"
            >
              {createMutation.isPending ? "creating..." : "create key"}
            </Button>
          </CardContent>
        </Card>
      )}

      {keysQuery.isLoading ? (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground text-center">Loading...</p>
          </CardContent>
        </Card>
      ) : keys.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-xs text-muted-foreground">No keys yet</p>
            <p className="text-xs text-muted-foreground mt-2">Create your first key or generate sample data</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            {keys.map((item, index) => (
              <Link
                key={item.key}
                to="/keys/$key"
                params={{ key: item.key }}
                className={`block p-4 hover:bg-muted/20 transition-colors ${
                  index !== keys.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground font-mono w-6 text-right">
                      {index + 1}
                    </span>
                    <span className="text-xs font-mono">{item.key}</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    {new Date(item.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {hasMore && (
        <div className="text-center">
          <p className="text-xs text-muted-foreground font-mono">
            Showing {keys.length} of {total} keys
          </p>
        </div>
      )}
    </div>
  );
}
