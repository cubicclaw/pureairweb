"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { BASE_PATH } from "@/lib/base-path";

interface CaptchaConfig {
  enabled: boolean;
  login_captcha: boolean;
  order_captcha: boolean;
  random_trigger_rate: number;
  cooldown_minutes: number;
}

function CaptchaToggle() {
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? "";

  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [enabled, setEnabled] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = useCallback(
    (t: string) => `${BASE_PATH}/api/admin/captcha?token=${encodeURIComponent(t)}`,
    []
  );

  const fetchStatus = useCallback(async () => {
    if (!token) {
      setError("Missing token. Add ?token=YOUR_TOKEN to the URL.");
      setStatus("error");
      return;
    }

    try {
      const res = await fetch(apiUrl(token));
      if (res.status === 401) {
        setError("Unauthorized. Check your admin token.");
        setStatus("error");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch");
      const data: CaptchaConfig = await res.json();
      setEnabled(data.enabled);
      setStatus("ready");
      setError(null);
    } catch {
      setError("Failed to load captcha status.");
      setStatus("error");
    }
  }, [token, apiUrl]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  async function handleToggle() {
    if (!token) return;
    setToggling(true);
    setError(null);
    try {
      const res = await fetch(apiUrl(token), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      });
      if (!res.ok) throw new Error("Toggle failed");
      const data: CaptchaConfig = await res.json();
      setEnabled(data.enabled);
    } catch {
      setError("Failed to toggle. Please try again.");
    } finally {
      setToggling(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-sky-600" />
      </div>
    );
  }

  if (status === "error" && !enabled && error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-900">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-800 dark:bg-slate-800">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-2xl dark:bg-red-900/30">
            !
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Connection Error
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {error}
          </p>
          <button
            onClick={fetchStatus}
            className="mt-6 rounded-lg bg-sky-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-sky-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-900">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Captcha System
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Toggle the captcha verification system on or off
            </p>
          </div>

          {/* Big toggle */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={handleToggle}
              disabled={toggling}
              aria-label={enabled ? "Disable captcha" : "Enable captcha"}
              className={`relative flex h-40 w-40 items-center justify-center rounded-full border-4 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-offset-2 disabled:cursor-wait ${
                enabled
                  ? "border-green-400 bg-green-500 text-white shadow-lg shadow-green-500/30 hover:bg-green-600 focus:ring-green-300"
                  : "border-red-400 bg-red-500 text-white shadow-lg shadow-red-500/30 hover:bg-red-600 focus:ring-red-300"
              }`}
            >
              {toggling ? (
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-12 w-12"
                  >
                    {enabled ? (
                      <path
                        fillRule="evenodd"
                        d="M12.963 2.286a.75.75 0 00-1.071-.136 9.742 9.742 0 00-3.539 6.177A7.547 7.547 0 016.648 6.61a.75.75 0 00-1.152.082A9 9 0 1015.68 4.534a7.46 7.46 0 01-2.717-2.248zM15.75 14.25a3.75 3.75 0 11-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 011.925-3.545 3.75 3.75 0 013.255 3.717z"
                        clipRule="evenodd"
                      />
                    ) : (
                      <path
                        fillRule="evenodd"
                        d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z"
                        clipRule="evenodd"
                      />
                    )}
                  </svg>
                  <span className="text-lg font-bold tracking-wider">
                    {enabled ? "ON" : "OFF"}
                  </span>
                </div>
              )}
            </button>

            {/* Status label */}
            <div className="mt-6 flex items-center gap-2">
              <span
                className={`inline-block h-3 w-3 rounded-full ${
                  enabled ? "bg-green-500 animate-pulse" : "bg-red-500"
                }`}
              />
              <span
                className={`text-sm font-semibold ${
                  enabled
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {enabled ? "Captcha Enabled" : "Captcha Disabled"}
              </span>
            </div>

            {/* Error message */}
            {error && (
              <p className="mt-4 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="my-8 border-t border-slate-200 dark:border-slate-700" />

          {/* Link to full admin panel */}
          <div className="text-center">
            <Link
              href={`/admin/captcha${token ? `?token=${encodeURIComponent(token)}` : ""}`}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path
                  fillRule="evenodd"
                  d="M8.34 1.804A1 1 0 019.32 1h1.36a1 1 0 01.98.804l.295 1.473c.497.144.971.342 1.416.587l1.25-.834a1 1 0 011.262.125l.962.962a1 1 0 01.125 1.262l-.834 1.25c.245.445.443.919.587 1.416l1.473.295a1 1 0 01.804.98v1.36a1 1 0 01-.804.98l-1.473.295a6.95 6.95 0 01-.587 1.416l.834 1.25a1 1 0 01-.125 1.262l-.962.962a1 1 0 01-1.262.125l-1.25-.834a6.953 6.953 0 01-1.416.587l-.295 1.473a1 1 0 01-.98.804H9.32a1 1 0 01-.98-.804l-.295-1.473a6.957 6.957 0 01-1.416-.587l-1.25.834a1 1 0 01-1.262-.125l-.962-.962a1 1 0 01-.125-1.262l.834-1.25a6.957 6.957 0 01-.587-1.416l-1.473-.295A1 1 0 011 11.36V10a1 1 0 01.804-.98l1.473-.295c.144-.497.342-.971.587-1.416l-.834-1.25a1 1 0 01.125-1.262l.962-.962A1 1 0 015.38 3.71l1.25.834a6.957 6.957 0 011.416-.587l.295-1.473zM13 10a3 3 0 11-6 0 3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
              Full Admin Panel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CaptchaTogglePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-sky-600" />
        </div>
      }
    >
      <CaptchaToggle />
    </Suspense>
  );
}
