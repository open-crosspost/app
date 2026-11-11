import type {
  ConnectedAccount,
  ErrorDetail,
  MultiStatusSummary,
  SuccessDetail,
} from "@crosspost/plugin/types";
import { create } from "zustand";
import type { PostType } from "@/components/post-interaction-selector";
import type { EditorContent } from "@/store/drafts-store";

export interface SubmissionRequest {
  posts: EditorContent[];
  selectedAccounts: ConnectedAccount[];
  postType: PostType;
  targetUrl?: string;
}

export interface SubmissionResultsState {
  summary: MultiStatusSummary | null;
  results: SuccessDetail[];
  errors: ErrorDetail[];
  request: SubmissionRequest | null;
  updatedAt: number;
  setSubmissionOutcome: (data: {
    summary: MultiStatusSummary;
    results: SuccessDetail[];
    errors: ErrorDetail[];
    request: SubmissionRequest;
  }) => void;
  clearSubmissionOutcome: () => void;
}

const initialState: Omit<
  SubmissionResultsState,
  "setSubmissionOutcome" | "clearSubmissionOutcome"
> = {
  summary: null,
  results: [],
  errors: [],
  request: null,
  updatedAt: 0,
};

export const useSubmissionResultsStore = create<SubmissionResultsState>((set) => ({
  ...initialState,
  setSubmissionOutcome: (data) =>
    set({
      summary: data.summary,
      results: data.results,
      errors: data.errors,
      request: data.request,
      updatedAt: Date.now(),
    }),
  clearSubmissionOutcome: () => set(initialState),
}));
