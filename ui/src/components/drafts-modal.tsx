import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import type * as React from "react";
import { ModalWindowControls } from "@/components/modal-window-controls";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EditorContent } from "@/store/drafts-store";
import { useDraftsStore } from "@/store/drafts-store";

interface DraftsModalProps {
  onSelect: (posts: EditorContent[]) => void;
}

export function DraftsModal({ onSelect }: DraftsModalProps): React.ReactElement {
  const { drafts, isModalOpen, setModalOpen, deleteDraft } = useDraftsStore();

  return (
    <Dialog open={isModalOpen} onOpenChange={setModalOpen}>
      <DialogContent className="border-none bg-transparent p-0 shadow-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="relative w-[calc(100%-0.5rem)] sm:w-full max-w-2xl mx-auto border-2 border-primary bg-background shadow-custom sm:shadow-custom-lg"
        >
          <ModalWindowControls onClose={() => setModalOpen(false)} />
          <div className="p-3 sm:p-6">
            <DialogHeader>
              <VisuallyHidden.Root>
                <DialogTitle className="font-mono text-2xl font-bold">Drafts</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  View and manage your saved draft posts
                </DialogDescription>
              </VisuallyHidden.Root>
            </DialogHeader>

            {drafts.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No drafts saved yet</p>
            ) : (
              <>
                <p className="text-muted-foreground mb-2">View and manage your saved draft posts</p>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                  {drafts.map((draft) => (
                    <div
                      key={draft.id}
                      className="border-2 border-primary bg-card p-3 shadow-custom hover:bg-muted sm:p-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(draft.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              onSelect(draft.posts);
                              setModalOpen(false);
                            }}
                            size="sm"
                          >
                            Load
                          </Button>
                          <Button
                            onClick={() => deleteDraft(draft.id)}
                            variant="destructive"
                            size="sm"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm text-foreground">
                        {draft.posts.map((post, i) => (
                          <div key={i} className="mb-2">
                            {post.text?.substring(0, 100)}
                            {post.text && post.text.length > 100 ? "..." : ""}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
