import type { AccountPost, PlatformName } from "@crosspost/plugin/types";
import { Platform } from "@crosspost/plugin/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { Link as LinkIcon, Trash2, X } from "lucide-react";
import type React from "react";
import { toast } from "sonner";
import { useApiClient, useAuthClient } from "@/app";
import farcasterSvg from "@/assets/platforms/farcaster.svg";
import { InlineBadges } from "@/components/badges/inline-badges";
import { RoutePending } from "@/components/route-pending";
import { Button } from "@/components/ui/button";
import { fetchSocialAccountPosts, socialAccountPostsQueryKey } from "@/lib/social";
import { getProfile } from "@/lib/utils/near-social-node";

export const Route = createFileRoute("/_authenticated/profile/$accountId")({
  loader: async ({ params }) => {
    try {
      const profile = await getProfile(params.accountId);
      return {
        accountId: params.accountId,
        profile,
      };
    } catch (_error) {
      // Return null to indicate profile fetch failed
      return null;
    }
  },
  component: ProfilePage,
  pendingComponent: RoutePending,
  pendingMs: 100,
});

export function ProfilePage() {
  const data = Route.useLoaderData();
  const accountId = useParams({
    from: "/_authenticated/profile/$accountId",
    select: (params) => params.accountId,
  });

  if (data === null) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-lg font-semibold mb-2">Profile Not Found</h2>
        <p>Profile for {accountId} not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6">
      <div className="p-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span>{accountId}</span>
          <InlineBadges accountId={accountId} />
        </h1>
      </div>
      <AccountPostsList accountId={accountId || "Anonymous"} />
    </div>
  );
}

const PlatformIcon: React.FC<{ platform: string; className?: string }> = ({
  platform,
  className,
}) => {
  switch (platform?.toLowerCase()) {
    case Platform.TWITTER:
      return <X className={className} />;
    case Platform.FARCASTER:
      return (
        <img
          src={farcasterSvg}
          alt="Farcaster Logo"
          className={`text-muted-foreground ${className}`}
        />
      );
    default:
      return <LinkIcon className={className} />; // Default icon
  }
};

const AccountPostsList: React.FC<{ accountId: string }> = ({ accountId }) => {
  const apiClient = useApiClient();
  const { data: session } = useAuthClient().useSession();
  const currentAccountId = session?.user?.id ?? null;
  const {
    data: posts,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<AccountPost[], Error>({
    queryKey: socialAccountPostsQueryKey(accountId),
    queryFn: () => fetchSocialAccountPosts(apiClient, accountId),
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  const queryClient = useQueryClient();
  const deletePostMutation = useMutation({
    mutationKey: ["delete-social-post", accountId],
    mutationFn: async (variables: {
      postId: string;
      platform: PlatformName;
      platformUserId: string;
    }) => {
      return apiClient.social.posts.delete({
        targets: [{ platform: variables.platform, userId: variables.platformUserId }],
        posts: [
          {
            platform: variables.platform,
            userId: variables.platformUserId,
            postId: variables.postId,
          },
        ],
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: socialAccountPostsQueryKey(accountId) });
    },
  });

  const handleDeletePost = async (
    postId: string,
    platform: PlatformName,
    platformUserId: string,
  ) => {
    if (!window.confirm(`Are you sure you want to delete this post from ${platform}?`)) {
      return;
    }

    try {
      await deletePostMutation.mutateAsync({ postId, platform, platformUserId });
      toast.success("Post Deleted", { description: "The post has been successfully deleted." });
    } catch (err) {
      toast.error("Error Deleting Post", {
        description: err instanceof Error ? err.message : "An unexpected error occurred.",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-semibold mb-4">Posts for {accountId}</h2>
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-semibold mb-4">Posts for {accountId}</h2>
        <div className="p-4 text-center text-destructive">
          <p>{error?.message || "An unknown error occurred."}</p>
          <Button onClick={() => refetch()} className="mt-2">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-semibold mb-4">Posts for {accountId}</h2>
        <p className="text-center text-muted-foreground py-8">No posts found for this account.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Posts for {accountId}</h2>
      <div className="space-y-3">
        {posts.map((post) => (
          <div
            key={post.id}
            className="p-3 hover:bg-muted transition-colors base-component rounded-md"
          >
            <div className="flex justify-between items-center mb-2 text-sm">
              <div className="flex items-center space-x-1.5">
                <PlatformIcon platform={post.platform} className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium capitalize text-foreground">{post.platform}</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground capitalize">{post.type ?? "post"}</span>
              </div>
              <span className="text-muted-foreground text-xs">
                {new Date(post.createdAt).toLocaleDateString()} •{" "}
                {new Date(post.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              {accountId === currentAccountId && (
                <Button
                  size="sm"
                  onClick={() => handleDeletePost(post.id, post.platform, post.userId)}
                  disabled={deletePostMutation.isPending}
                  title="Delete post"
                  className="text-destructive hover:text-destructive/80"
                >
                  <Trash2 size={16} />
                </Button>
              )}
            </div>

            {post.url && (
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 transition-colors"
                title={`View on ${post.platform}`}
              >
                view post
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
