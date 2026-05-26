"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { exchangeOAuthCode } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { getPortalTheme } from "@/components/auth/rolePortalTheme";

function OAuthCallbackContent() {
  const router = useRouter();
  const params = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [message, setMessage] = useState("Completing Google sign-in…");

  useEffect(() => {
    const error = params.get("error");
    const code = params.get("code");

    if (error) {
      setMessage(decodeURIComponent(error));
      return;
    }

    if (!code) {
      setMessage("Missing OAuth login code.");
      return;
    }

    exchangeOAuthCode(code)
      .then((res) => {
        setAuth(res.access_token, res.user);
        router.replace(getPortalTheme(res.user.role).dashboard);
      })
      .catch((err) => {
        setMessage(err instanceof Error ? err.message : "Google sign-in failed.");
      });
  }, [params, router, setAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <p className="text-sm text-[rgb(var(--muted))]">{message}</p>
        {message !== "Completing Google sign-in…" && (
          <button type="button" className="btn-primary mt-6" onClick={() => router.replace("/login/")}>
            Back to login
          </button>
        )}
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      }
    >
      <OAuthCallbackContent />
    </Suspense>
  );
}
