import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, FileText, Loader2, MoreHorizontal, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { toast } from "sonner";
import { useApiClient, useAuthClient } from "@/app";
import { AnonymousBanner } from "@/components/anonymous-banner";
import { DraftsModal } from "@/components/drafts-modal";
import { XpostGateGuard } from "@/components/gate/xpost-gate-guard";
import { MediaPreviewModal } from "@/components/media-preview-modal";
import { NearSocialFallbackDialog } from "@/components/near-social-fallback-dialog";
import { PlatformAccountsSelector } from "@/components/platform-accounts-selector";
import { PostEditorCore } from "@/components/post-editor-core";
import { PostInteractionSelector } from "@/components/post-interaction-selector";
import { PreviewModal } from "@/components/preview-modal";
import { SchedulePostModal } from "@/components/schedule-post-modal";
import { ScheduledPostsFeed } from "@/components/scheduled-posts-feed";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCampaign } from "@/hooks/use-campaigns";
import { useSubmitPost } from "@/hooks/use-submit-post";
import {
  CAMPAIGN_DESTINATION_PLATFORM,
  campaignDestinations,
  campaignPrefillPosts,
} from "@/lib/campaigns";
import {
  connectedAccountsQueryOptions,
  mergeConnectedAccounts,
  nearAccountIdQueryOptions,
  nearSocialAccountQueryOptions,
} from "@/lib/social";
import { useDebounce } from "@/lib/utils/debounce";
import type { EditorContent, EditorMedia } from "@/store/drafts-store";
import { useDraftsStore } from "@/store/drafts-store";
import { usePlatformAccountsStore } from "@/store/platform-accounts-store";
import {
  disabledPlatformsFor,
  editorReducer,
  initEditorState,
  isEditorEmpty,
  mimeTypeFromDataUrl,
} from "./-editor-state";

export const Route = createFileRoute("/_authenticated/editor/")({
  validateSearch: (search: Record<string, unknown>): { campaign?: string } => ({
    campaign: typeof search.campaign === "string" ? search.campaign : undefined,
  }),
  loader: async ({ context }) => {
    const { queryClient, authClient, apiClient } = context;
    // connectedAccounts is independent of nearAccountId — start both together
    const nearAccountIdQuery = queryClient.ensureQueryData(nearAccountIdQueryOptions(authClient));
    const connectedAccountsQuery = queryClient.ensureQueryData(
      connectedAccountsQueryOptions(apiClient),
    );
    const nearAccountId = await nearAccountIdQuery;
    // Preload best-effort: an unavailable API must not take the route down —
    // the selector's inline error state handles degradation with a retry.
    await Promise.allSettled([
      connectedAccountsQuery,
      nearAccountId
        ? queryClient.ensureQueryData(nearSocialAccountQueryOptions(authClient, nearAccountId))
        : Promise.resolve(null),
    ]);
    return { nearAccountId: nearAccountId ?? null };
  },
  component: EditorPage,
});

function EditorPage() {
  const apiClient = useApiClient();
  const authClient = useAuthClient();
  const navigate = useNavigate({ from: Route.fullPath });
  const { campaign: campaignId } = Route.useSearch();
  const campaign = useCampaign(campaignId);
  const { data: session } = authClient.useSession();
  const isEnabled = !!session?.user;
  const { data: nearAccountId } = useQuery(nearAccountIdQueryOptions(authClient, isEnabled));
  const selectedAccountIds = usePlatformAccountsStore((state) => state.selectedAccountIds);
  const selectAccount = usePlatformAccountsStore((state) => state.selectAccount);
  const { data: connectedAccounts = [] } = useQuery(
    connectedAccountsQueryOptions(apiClient, isEnabled),
  );
  const { data: nearSocialAccount } = useQuery(
    nearSocialAccountQueryOptions(authClient, nearAccountId),
  );
  const allAccounts = useMemo(
    () => mergeConnectedAccounts(connectedAccounts, nearSocialAccount ?? null),
    [connectedAccounts, nearSocialAccount],
  );
  const selectedAccounts = useMemo(
    () => allAccounts.filter((account) => selectedAccountIds.includes(account.userId)),
    [allAccounts, selectedAccountIds],
  );
  const { submitPost, isPosting, nearSocialFallbackReason, resolveNearSocialFallback } =
    useSubmitPost();
  const { setModalOpen, autosave, saveAutoSave, clearAutoSave, saveDraft, isModalOpen } =
    useDraftsStore();
  const [state, dispatch] = useReducer(editorReducer, undefined, () =>
    initEditorState(autosave?.posts),
  );
  const { posts, postType, targetUrl, activeTab } = state;

  const { debouncedFn: queueAutoSave, cleanup: cancelAutoSave } = useDebounce(saveAutoSave);
  useEffect(() => {
    queueAutoSave(posts);
  }, [posts, queueAutoSave]);
  useEffect(() => cancelAutoSave, [cancelAutoSave]);

  const prefillAppliedRef = useRef(false);
  useEffect(() => {
    if (!campaign || prefillAppliedRef.current) return;
    prefillAppliedRef.current = true;
    clearAutoSave();
    dispatch({ type: "posts_replaced", posts: campaignPrefillPosts(campaign) });
  }, [campaign, clearAutoSave]);

  useEffect(() => {
    if (!campaign || selectedAccountIds.length > 0 || allAccounts.length === 0) return;
    const destinationPlatforms = campaignDestinations(campaign).map(
      (destination) => CAMPAIGN_DESTINATION_PLATFORM[destination],
    );
    for (const account of allAccounts) {
      if (destinationPlatforms.includes(account.platform)) {
        selectAccount(account.userId);
      }
    }
  }, [campaign, allAccounts, selectedAccountIds, selectAccount]);

  const disabledPlatforms = useMemo(
    () => disabledPlatformsFor(postType, targetUrl),
    [postType, targetUrl],
  );

  const handleMediaUpload = useCallback(
    (index: number, file: File) => {
      if (!file) return;

      if (file.size > 10 * 1024 * 1024) {
        toast.error("File Too Large", { description: "Media files must be under 10MB" });
        return;
      }

      if (!file.type.match(/^(image|video)\//)) {
        toast.error("Invalid File Type", { description: "Only images and videos are supported" });
        return;
      }

      const post = posts[index];
      const existingMedia = post?.media || [];
      const hasImage = existingMedia.some((item) => item.mimeType?.startsWith("image/"));
      const hasVideo = existingMedia.some((item) => item.mimeType?.startsWith("video/"));

      if (file.type.startsWith("video/") && hasImage) {
        toast.error("Cannot Add Video", {
          description: "Videos cannot be added when multiple images are attached",
        });
        return;
      }
      if (file.type.startsWith("image/") && hasVideo) {
        toast.error("Cannot Add Image", {
          description: "Multiple images cannot be added when a video is attached",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const data = event.target?.result;
        if (typeof data === "string") {
          const item: EditorMedia = {
            data,
            mimeType: file.type,
            id: URL.createObjectURL(file),
            preview: data,
          };
          dispatch({ type: "media_added", index, item });
        }
      };
      reader.readAsDataURL(file);
    },
    [posts],
  );

  const handleMediaRemove = useCallback((index: number, mediaIndex: number) => {
    dispatch({ type: "media_removed", index, mediaIndex });
  }, []);

  const revokeRemovedMedia = useCallback(
    (index: number, mediaIndex: number) => {
      const mediaItem = posts[index]?.media?.[mediaIndex];
      if (mediaItem?.id && typeof mediaItem.id === "string" && mediaItem.id.startsWith("blob:")) {
        URL.revokeObjectURL(mediaItem.id);
      }
    },
    [posts],
  );

  const handleRemoveMedia = useCallback(
    (index: number, mediaIndex = 0) => {
      revokeRemovedMedia(index, mediaIndex);
      handleMediaRemove(index, mediaIndex);
    },
    [handleMediaRemove, revokeRemovedMedia],
  );

  const handlePostsReplaced = useCallback((newPosts: EditorContent[]) => {
    dispatch({ type: "posts_replaced", posts: newPosts });
  }, []);

  const handleSaveDraft = useCallback(() => {
    saveDraft(posts);
    toast("Draft Saved", { description: "Your draft has been saved successfully." });
    clearAutoSave();
    dispatch({ type: "editor_reset" });
  }, [saveDraft, posts, clearAutoSave]);

  const handleScheduled = useCallback(() => {
    clearAutoSave();
    dispatch({ type: "editor_reset" });
  }, [clearAutoSave]);

  const handleLoadDraft = useCallback(
    (draftPosts: EditorContent[]) => {
      if (draftPosts.length === 0) return;

      const formattedPosts = draftPosts.map((post) => ({
        text: post.text,
        media:
          post.media?.map((media) => ({
            id: null,
            preview: media.data,
            mimeType: media.mimeType,
          })) || [],
      })) as EditorContent[];

      handlePostsReplaced(formattedPosts);
    },
    [handlePostsReplaced],
  );

  const handleSubmit = useCallback(async () => {
    const editorContents: EditorContent[] = posts.map((post) => ({
      text: post.text || "",
      media:
        post.media && post.media.length > 0
          ? post.media.map((item) => ({
              data: item.preview || "",
              mimeType: item.mimeType || mimeTypeFromDataUrl(item.preview || ""),
              id: item.id,
              preview: item.preview,
            }))
          : [],
    }));

    const postStatus = await submitPost(editorContents, selectedAccounts, postType, targetUrl);

    if (postStatus === "success" && editorContents.length > 0) {
      clearAutoSave();
      dispatch({ type: "editor_reset" });
      if (campaign) {
        try {
          await apiClient.activity.campaignCompleted({ campaignId: campaign.id });
        } catch (error) {
          console.error("Campaign completion recording failed:", error);
        }
      }
    }
  }, [
    posts,
    selectedAccounts,
    postType,
    targetUrl,
    submitPost,
    clearAutoSave,
    campaign,
    apiClient,
  ]);

  const openMediaModal = useCallback((src: string, type: string) => {
    dispatch({ type: "media_modal_opened", media: { src, type } });
  }, []);

  return (
    <div className="h-full w-full min-w-0 px-4 pt-4 pb-6 sm:px-6 lg:px-6 lg:pt-6 lg:pb-6">
      <div className="mb-4">
        <AnonymousBanner />
      </div>
      <div className="mb-4 border-b border-border lg:hidden">
        <div className="flex">
          <button
            type="button"
            className={`flex-1 border-b-2 py-3 text-sm font-medium transition-colors ${
              activeTab === "editor"
                ? "border-primary bg-muted text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => dispatch({ type: "tab_changed", tab: "editor" })}
          >
            Editor
          </button>
          <button
            type="button"
            className={`flex-1 border-b-2 py-3 text-sm font-medium transition-colors ${
              activeTab === "scheduled"
                ? "border-primary bg-muted text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => dispatch({ type: "tab_changed", tab: "scheduled" })}
          >
            Scheduled
          </button>
        </div>
      </div>

      <div className="flex h-full w-full min-w-0 flex-col lg:flex-row lg:gap-8">
        <div
          className={`min-w-0 flex-1 lg:w-1/2 ${activeTab === "editor" ? "block" : "hidden lg:block"}`}
        >
          <div className="flex h-full min-w-0 flex-col">
            {campaign ? (
              <div className="mb-4 flex items-start justify-between gap-2 rounded-md border-2 border-primary bg-muted/40 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{campaign.name}</p>
                  <p className="text-sm text-muted-foreground">{campaign.description}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  aria-label="Exit campaign"
                  onClick={() => navigate({ to: "/editor" })}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
            <div className="mb-4 space-y-4">
              <XpostGateGuard redirectPath="/editor" />
              <PlatformAccountsSelector disabledPlatforms={disabledPlatforms} />
              <div className="mb-2 flex min-w-0 items-start gap-2">
                <div className="min-w-0 flex-1">
                  <PostInteractionSelector
                    postType={postType}
                    targetUrl={targetUrl}
                    onPostTypeChange={(next) =>
                      dispatch({ type: "post_type_changed", postType: next })
                    }
                    onTargetUrlChange={(url) => dispatch({ type: "target_url_changed", url })}
                  />
                </div>
                <div className="shrink-0 lg:hidden">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" className="h-9 w-9 px-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => dispatch({ type: "preview_opened" })}
                        disabled={isEditorEmpty(posts)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setModalOpen(true)}>
                        <FileText className="mr-2 h-4 w-4" />
                        Drafts
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="hidden shrink-0 gap-2 lg:flex">
                  <Button
                    onClick={() => dispatch({ type: "preview_opened" })}
                    disabled={isEditorEmpty(posts)}
                    size="sm"
                  >
                    Preview
                  </Button>
                  <Button onClick={() => setModalOpen(true)} size="sm">
                    Drafts
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
              <PostEditorCore
                posts={posts}
                onPostsChange={handlePostsReplaced}
                onTextChange={(index, text) => dispatch({ type: "text_changed", index, text })}
                onMediaUpload={handleMediaUpload}
                onMediaRemove={handleRemoveMedia}
                onAddThread={() => dispatch({ type: "thread_added" })}
                onRemoveThread={(index) => dispatch({ type: "thread_removed", index })}
                onOpenMediaModal={openMediaModal}
              />

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="order-2 text-left text-sm text-muted-foreground sm:order-1">
                  {`${posts.length} parts`}
                </span>
                <div className="order-1 grid grid-cols-3 gap-2 sm:order-2 sm:flex">
                  <Button
                    onClick={handleSaveDraft}
                    disabled={isEditorEmpty(posts)}
                    className="min-w-0 px-2 sm:px-4"
                  >
                    <span className="sm:hidden">Draft</span>
                    <span className="hidden sm:inline">Save Draft</span>
                  </Button>
                  <Button
                    onClick={() => dispatch({ type: "schedule_modal_opened" })}
                    disabled={isEditorEmpty(posts) || selectedAccounts.length === 0}
                    className="min-w-0 px-2 sm:px-4"
                  >
                    Schedule
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isPosting || isEditorEmpty(posts) || selectedAccounts.length === 0}
                    className="min-w-0 px-2 sm:px-4"
                  >
                    {isPosting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Posting…
                      </>
                    ) : (
                      "Post"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className={`min-w-0 flex-1 lg:w-1/2 ${activeTab === "scheduled" ? "block" : "hidden lg:block"}`}
        >
          <div className="h-full overflow-auto">
            <ScheduledPostsFeed />
          </div>
        </div>
      </div>

      {isModalOpen && <DraftsModal onSelect={handleLoadDraft} />}
      <MediaPreviewModal
        isOpen={state.isMediaModalOpen}
        onClose={() => dispatch({ type: "media_modal_closed" })}
        mediaSrc={state.modalMediaContent?.src || null}
        mediaType={state.modalMediaContent?.type || null}
      />
      <SchedulePostModal
        isOpen={state.isScheduleModalOpen}
        onClose={() => dispatch({ type: "schedule_modal_closed" })}
        posts={posts}
        selectedPlatforms={selectedAccounts.map((account) => account.platform)}
        onScheduled={handleScheduled}
      />
      <PreviewModal
        isOpen={state.isPreviewOpen}
        onClose={() => dispatch({ type: "preview_closed" })}
        posts={posts}
        selectedAccounts={selectedAccounts}
      />
      <NearSocialFallbackDialog
        reason={nearSocialFallbackReason}
        onChoice={resolveNearSocialFallback}
      />
    </div>
  );
}
