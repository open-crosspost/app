import type { PlatformName } from "@crosspost/plugin/types";
import { SUPPORTED_PLATFORMS } from "@crosspost/plugin/types";
import type { PostType } from "@/components/post-interaction-selector";
import { detectPlatformFromUrl } from "@/lib/utils/url-utils";
import type { EditorContent, EditorMedia } from "@/store/drafts-store";

export const DEFAULT_EMPTY_POST: EditorContent = {
  text: "",
  media: [] as EditorMedia[],
};

export type EditorTab = "editor" | "scheduled";

export type ModalMedia = { src: string; type: string };

export type EditorState = {
  posts: EditorContent[];
  postType: PostType;
  targetUrl: string;
  isPreviewOpen: boolean;
  isMediaModalOpen: boolean;
  modalMediaContent: ModalMedia | null;
  isScheduleModalOpen: boolean;
  activeTab: EditorTab;
};

export type EditorAction =
  | { type: "text_changed"; index: number; text: string }
  | { type: "thread_added" }
  | { type: "thread_removed"; index: number }
  | { type: "posts_replaced"; posts: EditorContent[] }
  | { type: "media_added"; index: number; item: EditorMedia }
  | { type: "media_removed"; index: number; mediaIndex: number }
  | { type: "post_type_changed"; postType: PostType }
  | { type: "target_url_changed"; url: string }
  | { type: "editor_reset" }
  | { type: "preview_opened" }
  | { type: "preview_closed" }
  | { type: "media_modal_opened"; media: ModalMedia }
  | { type: "media_modal_closed" }
  | { type: "schedule_modal_opened" }
  | { type: "schedule_modal_closed" }
  | { type: "tab_changed"; tab: EditorTab };

export function initEditorState(autosavedPosts?: EditorContent[] | null): EditorState {
  return {
    posts: autosavedPosts?.length ? autosavedPosts : [DEFAULT_EMPTY_POST],
    postType: "post",
    targetUrl: "",
    isPreviewOpen: false,
    isMediaModalOpen: false,
    modalMediaContent: null,
    isScheduleModalOpen: false,
    activeTab: "editor",
  };
}

function replacePostAt(
  posts: EditorContent[],
  index: number,
  patch: Partial<EditorContent>,
): EditorContent[] {
  const next = [...posts];
  next[index] = { ...next[index], ...patch };
  return next;
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "text_changed":
      return { ...state, posts: replacePostAt(state.posts, action.index, { text: action.text }) };
    case "thread_added":
      return { ...state, posts: [...state.posts, DEFAULT_EMPTY_POST] };
    case "thread_removed":
      return { ...state, posts: state.posts.filter((_, i) => i !== action.index) };
    case "posts_replaced":
      return { ...state, posts: action.posts };
    case "media_added": {
      const post = state.posts[action.index];
      if (!post) {
        return state;
      }
      return {
        ...state,
        posts: replacePostAt(state.posts, action.index, {
          media: [...(post.media || []), action.item],
        }),
      };
    }
    case "media_removed": {
      const post = state.posts[action.index];
      if (!post) {
        return state;
      }
      return {
        ...state,
        posts: replacePostAt(state.posts, action.index, {
          media: (post.media || []).filter((_, i) => i !== action.mediaIndex),
        }),
      };
    }
    case "post_type_changed":
      return { ...state, postType: action.postType };
    case "target_url_changed":
      return { ...state, targetUrl: action.url };
    case "editor_reset":
      return { ...state, posts: [DEFAULT_EMPTY_POST] };
    case "preview_opened":
      return { ...state, isPreviewOpen: true };
    case "preview_closed":
      return { ...state, isPreviewOpen: false };
    case "media_modal_opened":
      return { ...state, isMediaModalOpen: true, modalMediaContent: action.media };
    case "media_modal_closed":
      return { ...state, isMediaModalOpen: false, modalMediaContent: null };
    case "schedule_modal_opened":
      return { ...state, isScheduleModalOpen: true };
    case "schedule_modal_closed":
      return { ...state, isScheduleModalOpen: false };
    case "tab_changed":
      return { ...state, activeTab: action.tab };
    default:
      return state;
  }
}

export function isEditorEmpty(posts: EditorContent[]): boolean {
  return posts.every((post) => !(post.text || "").trim());
}

export function disabledPlatformsFor(postType: PostType, targetUrl: string): PlatformName[] {
  if (postType === "post") {
    return [];
  }
  const detectedPlatform = detectPlatformFromUrl(targetUrl);
  if (!detectedPlatform) {
    return [];
  }
  return Object.values(SUPPORTED_PLATFORMS).filter(
    (platform) => platform !== detectedPlatform,
  ) as PlatformName[];
}

export function mimeTypeFromDataUrl(dataUrl: string): string {
  if (!dataUrl?.startsWith("data:")) return "application/octet-stream";
  const match = dataUrl.match(/^data:([^;]+);/);
  return match ? match[1] : "application/octet-stream";
}
