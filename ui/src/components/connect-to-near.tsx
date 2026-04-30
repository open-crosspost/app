import { Wallet } from "lucide-react";
import type { ReactElement } from "react";
import { Button } from "@/components/ui/button";

export function ConnectToNearButton(): ReactElement {
  return (
    <Button disabled className="text-sm sm:text-base opacity-50 cursor-not-allowed">
      <Wallet size={18} className="mr-2" />
      Connect NEAR
    </Button>
  );
}
