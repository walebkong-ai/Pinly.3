"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { triggerMediumImpact } from "@/lib/native-haptics";
import { PINLY_PUSH_UNREGISTER_EVENT } from "@/lib/push-notifications";

export function SignOutButton() {
  return (
    <Button
      variant="ghost"
      className="justify-start gap-2 rounded-2xl px-3"
      onClick={async () => {
        window.dispatchEvent(new CustomEvent(PINLY_PUSH_UNREGISTER_EVENT));
        void triggerMediumImpact();
        await signOut({ callbackUrl: "/" });
      }}
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </Button>
  );
}
