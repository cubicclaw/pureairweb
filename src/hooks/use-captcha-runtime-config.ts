"use client";

import { useState, useEffect, useCallback } from "react";
import { BASE_PATH } from "@/lib/base-path";
import {
  CAPTCHA_PUBLIC_FALLBACK,
  type CaptchaRuntimePublicConfig,
} from "@/data/captcha-config";

export type { CaptchaRuntimePublicConfig } from "@/data/captcha-config";

export function useCaptchaRuntimeConfig() {
  const [config, setConfig] = useState<CaptchaRuntimePublicConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`${BASE_PATH}/api/captcha/public-config`, { cache: "no-store" });
      if (!res.ok) throw new Error(`http_${res.status}`);
      const data = (await res.json()) as CaptchaRuntimePublicConfig;
      if (typeof data.randomTriggerRate !== "number") throw new Error("invalid_shape");
      setConfig(data);
    } catch {
      setConfig(CAPTCHA_PUBLIC_FALLBACK);
      setFetchError("fallback");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    config: config ?? CAPTCHA_PUBLIC_FALLBACK,
    loading,
    fetchError,
    refetch,
  };
}
