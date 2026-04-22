import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Users } from "lucide-react";
import type * as React from "react";
import { useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { sessionQueryOptions } from "@/lib/session";
import { Button } from "./ui/button";

export function ManageAccountsButton(): React.ReactElement {
  const navigate = useNavigate();
  const { data: session } = useQuery(sessionQueryOptions());

  const handleClick = useCallback(() => {
    if (!session?.user) {
      toast({
        title: "Connect Wallet",
        description: "Please connect your NEAR wallet first.",
        variant: "destructive",
      });
      return;
    }
    navigate({ to: "/manage" });
  }, [navigate, session?.user]);

  return (
    <Button onClick={handleClick} className="text-sm sm:text-base">
      <Users size={18} className="mr-2" />
      <span className="sm:inline">Manage Accounts</span>
    </Button>
  );
}
