import type { PlatformName } from "@crosspost/plugin/types";
import { SUPPORTED_PLATFORMS } from "@crosspost/plugin/types";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Eye, FileText, MoreHorizontal } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useApiClient, useAuthClient } from "@/app";
import { DraftsModal } from "@/components/drafts-modal";
import { MediaPreviewModal } from "@/components/media-preview-modal";
import { PlatformAccountsSelector } from "@/components/platform-accounts-selector";
import { PostEditorCore } from "@/components/post-editor-core";
import { PostInteractionSelector, type PostType } from "@/components/post-interaction-selector";
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
import { usePostManagement } from "@/hooks/use-post-management";
import { usePostMedia } from "@/hooks/use-post-media";
import { useSubmitPost } from "@/hooks/use-submit-post";
import { toast } from "@/hooks/use-toast";
import {
  getNearSocialAccount,
  listConnectedAccounts,
  mergeConnectedAccounts,
  nearSocialAccountQueryKey,
  socialAccountsQueryKey,
} from "@/lib/social";
import { detectPlatformFromUrl } from "@/lib/utils/url-utils";
import type { EditorContent, EditorMedia } from "@/store/drafts-store";
import { useDraftsStore } from "@/store/drafts-store";
import { usePlatformAccountsStore } from "@/store/platform-accounts-store";

export const Route = createFileRoute("/_layout/_authenticated/editor/")({
  component: EditorPage,
});

function EditorPage() {
  const apiClient = useApiClient();
  const authClient = useAuthClient();
  const { data: session } = authClient.useSession();
  const { data: nearAccountId } = useQuery({
    queryKey: ["near", "accountId"] as const,
    queryFn: () => authClient.near.getAccountId(),
    enabled: !!session?.user,
    staleTime: 60 * 1000,
  });
  const selectedAccountIds = usePlatformAccountsStore((state) => state.selectedAccountIds);
  const { data: connectedAccounts = [] } = useQuery({
    queryKey: socialAccountsQueryKey,
    queryFn: () => listConnectedAccounts(apiClient),
    enabled: !!session?.user,
  });
  const { data: nearSocialAccount } = useQuery({
    queryKey: nearSocialAccountQueryKey(nearAccountId),
    queryFn: () => getNearSocialAccount(authClient, nearAccountId),
    enabled: !!nearAccountId,
  });
  const allAccounts = useMemo(
    () => mergeConnectedAccounts(connectedAccounts, nearSocialAccount ?? null),
    [connectedAccounts, nearSocialAccount],
  );
  const selectedAccounts = useMemo(
    () => allAccounts.filter((account) => selectedAccountIds.includes(account.userId)),
    [allAccounts, selectedAccountIds],
  );
  const { submitPost, isPosting } = useSubmitPost();
  const { setModalOpen, autosave, saveAutoSave, clearAutoSave, saveDraft, isModalOpen } =
    useDraftsStore();

  const [posts, setPosts] = useState<EditorContent[]>([DEFAULT_EMPTY_POST]);
  const [postType, setPostType] = useState<PostType>("post");
  const [targetUrl, setTargetUrl] = useState("");
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [modalMediaContent, setModalMediaContent] = useState<{
    src: string;
    type: string;
  } | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"editor" | "scheduled">("editor");

  // Detect platform from URL and determine which platforms to disable
  const disabledPlatforms = useMemo<PlatformName[]>(() => {
    if (postType === "post") {
      return []; // No platforms disabled for regular posts
    }

    const detectedPlatform = detectPlatformFromUrl(targetUrl);
    if (!detectedPlatform) {
      return []; // If no platform detected, don't disable any yet
    }

    // Return all platforms except the detected one
    return Object.values(SUPPORTED_PLATFORMS).filter(
      (platform) => platform !== detectedPlatform,
    ) as PlatformName[];
  }, [postType, targetUrl]);

  const { handleMediaUpload, removeMedia } = usePostMedia(setPosts, toast, saveAutoSave);

  const { handleTextChange, addThread, removeThread, cleanup } = usePostManagement(
    posts,
    setPosts,
    saveAutoSave,
  );

  const handleTextFocus = useCallback(
    (index: number) => {
      if (posts[index]?.text === "ㅤ") {
        handleTextChange(index, "");
      }
    },
    [posts, handleTextChange],
  );

  const handleTextBlur = useCallback(
    (index: number) => {
      if (posts[index]?.text === "") {
        handleTextChange(index, "ㅤ");
      }
    },
    [posts, handleTextChange],
  );

  // Load auto-saved content on mount and handle cleanup
  useEffect(() => {
    if (autosave?.posts && autosave.posts.length > 0) {
      setPosts(autosave.posts);
    }

    return () => {
      if (cleanup) cleanup();
    };
  }, [autosave, cleanup]);

  // Memoized draft save handler
  const handleSaveDraft = useCallback(() => {
    saveDraft(posts);
    toast({
      title: "Draft Saved",
      description: "Your draft has been saved successfully.",
    });
    clearAutoSave();
    setPosts([DEFAULT_EMPTY_POST]);
  }, [saveDraft, posts, toast, setPosts, clearAutoSave]);

  const handleSchedulePost = useCallback(() => {
    setPosts([DEFAULT_EMPTY_POST]);
    clearAutoSave();
  }, [clearAutoSave]);

  // Helper function to extract MIME type from data URL
  function getMimeTypeFromDataUrl(dataUrl: string): string {
    if (!dataUrl?.startsWith("data:")) return "application/octet-stream";
    const match = dataUrl.match(/^data:([^;]+);/);
    return match ? match[1] : "application/octet-stream";
  }

  // Handle posts change (e.g., after drag and drop)
  const handlePostsChange = useCallback(
    (newPosts: EditorContent[]) => {
      setPosts(newPosts);
      saveAutoSave(newPosts);
    },
    [saveAutoSave],
  );

  // Handle post submission
  const handleSubmit = useCallback(async () => {
    // Convert posts to EditorContent format
    const editorContents: EditorContent[] = posts.map((post) => {
      // Handle multiple media items
      const media =
        post.media && post.media.length > 0
          ? post.media.map((item) => ({
              data: item.preview || "",
              mimeType: item.mimeType || getMimeTypeFromDataUrl(item.preview || ""),
              id: item.id,
              preview: item.preview,
            }))
          : [];

      return {
        text: post.text || "",
        media,
      };
    });

    // Submit the post
    const postStatus = await submitPost(editorContents, selectedAccounts, postType, targetUrl);

    // Only clear form on complete success
    if (postStatus === "success" && editorContents.length > 0) {
      setPosts([DEFAULT_EMPTY_POST]);
      clearAutoSave();
    }
    // Keep the editor content for partial success or failure
  }, [posts, selectedAccounts, postType, targetUrl, submitPost, setPosts, clearAutoSave]);

  // Handle load draft
  const handleLoadDraft = useCallback(
    (draftPosts: EditorContent[]) => {
      if (draftPosts.length > 0) {
        // Convert to the format expected by the editor
        const formattedPosts = draftPosts.map((post) => {
          const media =
            post.media?.map((media) => ({
              id: null,
              preview: media.data,
              mimeType: media.mimeType,
            })) || [];

          return {
            text: post.text,
            media: media,
          } as EditorContent;
        });

        setPosts(formattedPosts);
      }
    },
    [setPosts],
  );

  const openMediaModal = useCallback((src: string, type: string) => {
    setModalMediaContent({ src, type });
    setIsMediaModalOpen(true);
  }, []);

  const closeMediaModal = useCallback(() => {
    setIsMediaModalOpen(false);
    setModalMediaContent(null);
  }, []);

  return (
    <div className="h-full w-full min-w-0 lg:px-6 lg:pb-6">
      <div className="mb-4 border-b border-border lg:hidden">
        <div className="flex">
          <button
            type="button"
            className={`flex-1 border-b-2 py-3 text-sm font-medium transition-colors ${
              activeTab === "editor"
                ? "border-primary bg-muted text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("editor")}
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
            onClick={() => setActiveTab("scheduled")}
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
            <div className="mb-4 space-y-4">
              <PlatformAccountsSelector disabledPlatforms={disabledPlatforms} />
              <div className="mb-2 flex min-w-0 items-start gap-2">
                <div className="min-w-0 flex-1">
                  <PostInteractionSelector
                    postType={postType}
                    targetUrl={targetUrl}
                    onPostTypeChange={setPostType}
                    onTargetUrlChange={setTargetUrl}
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
                        onClick={() => setIsPreviewOpen(true)}
                        disabled={posts.every((p) => !(p.text || "").trim() || p.text === "ㅤ")}
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
                    onClick={() => setIsPreviewOpen(true)}
                    disabled={posts.every((p) => !(p.text || "").trim() || p.text === "ㅤ")}
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
                onPostsChange={handlePostsChange}
                onTextChange={handleTextChange}
                onMediaUpload={handleMediaUpload}
                onMediaRemove={removeMedia}
                onAddThread={addThread}
                onRemoveThread={removeThread}
                onOpenMediaModal={openMediaModal}
                onTextFocus={handleTextFocus}
                onTextBlur={handleTextBlur}
              />

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="order-2 text-left text-sm text-muted-foreground sm:order-1">
                  {`${posts.length} parts`}
                </span>
                <div className="order-1 grid grid-cols-3 gap-2 sm:order-2 sm:flex">
                  <Button
                    onClick={handleSaveDraft}
                    disabled={posts.every((p) => !(p.text || "").trim())}
                    className="min-w-0 px-2 sm:px-4"
                  >
                    <span className="sm:hidden">Draft</span>
                    <span className="hidden sm:inline">Save Draft</span>
                  </Button>
                  <Button
                    onClick={() => setIsScheduleModalOpen(true)}
                    disabled={
                      posts.every((p) => !(p.text || "").trim()) || selectedAccounts.length === 0
                    }
                    className="min-w-0 px-2 sm:px-4"
                  >
                    Schedule
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={
                      isPosting ||
                      posts.every((p) => !(p.text || "").trim()) ||
                      selectedAccounts.length === 0
                    }
                    className="min-w-0 px-2 sm:px-4"
                  >
                    {isPosting ? "…" : "Post"}
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
        isOpen={isMediaModalOpen}
        onClose={closeMediaModal}
        mediaSrc={modalMediaContent?.src || null}
        mediaType={modalMediaContent?.type || null}
      />
      <SchedulePostModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        posts={posts}
        selectedPlatforms={selectedAccounts.map((account) => account.platform)}
        onScheduled={handleSchedulePost}
      />
      <PreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        posts={posts}
        selectedAccounts={selectedAccounts}
      />
    </div>
  );
}

const DEFAULT_EMPTY_POST: EditorContent = {
  text: "ㅤ",
  media: [] as EditorMedia[],
};
