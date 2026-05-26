"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { Role } from "@centercrm/shared-types";
import { checkApiHealth, fetchOAuthStatus, getGoogleOAuthStartUrl, login } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { cn, getApiOrigin } from "@/lib/utils";
import { getPortalTheme } from "./rolePortalTheme";

export function RoleLoginForm({ expectedRole }: { expectedRole: Role }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const setAuth = useAuthStore((s) => s.setAuth);
  const theme = getPortalTheme(expectedRole);
  const Icon = theme.icon;

  const [email, setEmail] = useState(theme.demoEmail);
  const [password, setPassword] = useState("Admin@123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    checkApiHealth().then(setApiOnline);
    fetchOAuthStatus()
      .then((status) => setGoogleEnabled(status.google_enabled))
      .catch(() => setGoogleEnabled(false));
  }, []);

  useEffect(() => {
    if (!user || !accessToken) return;
    router.replace(getPortalTheme(user.role).dashboard);
  }, [user, accessToken, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await login(email, password);
      if (res.user.role !== expectedRole) {
        setError(
          `This account is a ${res.user.role.replace("_", " ").toLowerCase()}. Redirecting to the correct portal…`
        );
        setAuth(res.access_token, res.user);
        setTimeout(() => router.push(getPortalTheme(res.user.role).dashboard), 1500);
        return;
      }
      setAuth(res.access_token, res.user);
      router.push(theme.dashboard);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left brand panel */}
      <div
        className={cn(
          "portal-slide-left relative flex min-h-[40vh] flex-col justify-between overflow-hidden p-8 lg:min-h-screen lg:w-1/2 lg:p-12",
          "bg-gradient-to-br",
          theme.gradient,
          theme.gradientDark,
          mounted && "portal-visible"
        )}
      >
        <div className="absolute inset-0 opacity-30">
          <Image
            src={theme.heroImage}
            alt=""
            fill
            className="object-cover"
            priority
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-black/10 via-transparent to-black/30" />

        <Link
          href="/login"
          className="portal-fade-in relative z-10 inline-flex items-center gap-2 text-sm text-white/90 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          All portals
        </Link>

        <div className="relative z-10 portal-fade-in my-auto max-w-md">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md ring-1 ring-white/30">
            <Icon className="h-7 w-7 text-white" />
          </div>
          <p className="text-sm font-medium uppercase tracking-widest text-white/80">
            {theme.subtitle}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">{theme.title}</h1>
          <p className="mt-4 text-lg leading-relaxed text-white/85">{theme.description}</p>
        </div>

        <p className="relative z-10 text-xs text-white/60">CenterCRM · Secure role-based access</p>
      </div>

      {/* Right login form */}
      <div
        className={cn(
          "portal-slide-right flex flex-1 flex-col justify-center px-6 py-10 sm:px-12 lg:px-16",
          mounted && "portal-visible"
        )}
      >
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-2xl font-bold">Sign in</h2>
            <p className="mt-1 text-sm text-[rgb(var(--muted))]">
              Enter your {theme.title.toLowerCase()} credentials
            </p>
          </div>

          {apiOnline === false && (
            <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              Backend API is unreachable. For production, deploy the API (see{" "}
              <code className="text-xs">docs/DEPLOYMENT.md</code>) and rebuild the frontend with{" "}
              <code className="text-xs">NEXT_PUBLIC_API_URL</code>.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="text-sm font-medium">Email</label>
              <input
                className="input transition-shadow duration-200 focus:shadow-md"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Password</label>
              <input
                className="input transition-shadow duration-200 focus:shadow-md"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              className={cn(
                "btn-primary w-full py-3 transition-all duration-300",
                "bg-gradient-to-r",
                theme.gradient,
                "hover:opacity-90 hover:shadow-lg"
              )}
              disabled={loading}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </span>
              ) : (
                `Sign in as ${theme.title}`
              )}
            </button>
          </form>

          {googleEnabled && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[rgb(var(--border))]" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[rgb(var(--background))] px-2 text-[rgb(var(--muted))]">or sign in with Google</span>
                </div>
              </div>

              <a
                href={getGoogleOAuthStartUrl(expectedRole)}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-[rgb(var(--border))] bg-white px-4 py-3 text-sm font-medium shadow-sm transition hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign in with Google
              </a>
            </>
          )}

          <p className="mt-8 rounded-xl bg-slate-50 px-4 py-3 text-center text-xs text-[rgb(var(--muted))] dark:bg-slate-800/50">
            Demo: <span className="font-mono text-[rgb(var(--foreground))]">{theme.demoEmail}</span> /{" "}
            <span className="font-mono">Admin@123</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export function loginPathForRole(role: Role) {
  return getPortalTheme(role).href;
}

export async function logout(role?: Role) {
  try {
    await fetch(`${getApiOrigin()}/api/v1/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // ignore
  }
  useAuthStore.getState().clearAuth();
  if (typeof window !== "undefined") {
    window.location.href = role ? loginPathForRole(role) : "/login";
  }
}
