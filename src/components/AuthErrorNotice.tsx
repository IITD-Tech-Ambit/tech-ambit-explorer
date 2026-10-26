import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const MESSAGES: Record<string, string> = {
  invalid_state: "That sign-in link was already used or opened in a different browser. Try again.",
  missing_params: "IITD did not return a complete sign-in response. Try again.",
  oauth_failed: "IITD sign-in could not be completed. Try again in a moment.",
};

/** Shows the auth-service callback error and removes it from the address bar. */
export function AuthErrorNotice() {
  const [params, setParams] = useSearchParams();
  const { toast } = useToast();
  const reason = params.get("auth_error");

  useEffect(() => {
    if (!reason) return;
    toast({
      title: "Sign-in failed",
      description: MESSAGES[reason] || "Sign-in failed. Try again.",
      variant: "destructive",
    });
    const next = new URLSearchParams(params);
    next.delete("auth_error");
    setParams(next, { replace: true });
  }, [reason, params, setParams, toast]);

  return null;
}
