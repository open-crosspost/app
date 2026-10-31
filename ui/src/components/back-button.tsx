import { useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";

export function BackButton({ cleanup }: { cleanup?: () => void }) {
  const router = useRouter();

  return (
    <Button
      size="sm"
      className="mr-2"
      onClick={() => {
        cleanup?.();
        const historyIndex = (window.history.state as { idx?: number } | null)?.idx ?? 0;
        if (historyIndex > 0) {
          router.history.back();
        } else {
          void router.navigate({ to: "/editor" });
        }
      }}
    >
      <ArrowLeft size={16} className="mr-1" />
      Back
    </Button>
  );
}
