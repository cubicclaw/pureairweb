"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef } from "react";

import { BASE_PATH } from "@/lib/base-path";

// @ts-ignore - slider-captcha-js/react has no type declarations
const SliderCaptchaComponent = dynamic(() => import("slider-captcha-js/react"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center rounded-xl bg-slate-50 p-8 dark:bg-slate-700/50">
      <p className="text-sm text-slate-500 dark:text-slate-400">載入驗證元件中…</p>
    </div>
  ),
});

/** 与 `slider-captcha-js` request() 默认底图尺寸及 `POST /api/captcha/slider/issue` 输出一致 */
const SLIDER_W = 320;
const SLIDER_H = 160;

interface SliderCaptchaProps {
  onVerified: () => void;
  onError?: (error: unknown) => void;
  theme?: "light" | "dark";
}

/**
 * 服务端出题：`request` 拉取 SVG 底图/拼块 + HMAC token；`onVerify` 将 `x`/`trail` 等 POST 到
 * `/api/captcha/verify` 比对签名中的 `snapDx`（容差与库默认一致）。
 */
export function SliderCaptcha({ onVerified, onError, theme = "light" }: SliderCaptchaProps) {
  const tokenRef = useRef<string | null>(null);

  const request = useCallback(async () => {
    const res = await fetch(`${BASE_PATH}/api/captcha/slider/issue`, { method: "POST" });
    const data = (await res.json()) as {
      bgUrl?: string;
      puzzleUrl?: string;
      token?: string;
      error?: string;
    };
    if (!res.ok || !data.bgUrl || !data.puzzleUrl || !data.token) {
      throw new Error(data.error || "無法載入滑塊驗證");
    }
    tokenRef.current = data.token;
    return { bgUrl: data.bgUrl, puzzleUrl: data.puzzleUrl };
  }, []);

  const onVerify = useCallback(
    async (payload: { x: number; duration: number; trail: [number, number][]; targetType?: string }) => {
      const res = await fetch(`${BASE_PATH}/api/captcha/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          captchaType: "slider",
          token: tokenRef.current,
          x: payload.x,
          duration: payload.duration,
          trail: payload.trail,
          targetType: payload.targetType,
        }),
      });
      const result = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !result.success) {
        throw new Error(result.error || "驗證失敗");
      }
    },
    [],
  );

  return (
    <div className="w-full max-w-sm">
      <SliderCaptchaComponent
        // @ts-ignore
        root={null}
        width={SLIDER_W}
        height={SLIDER_H}
        theme={theme}
        request={request}
        onVerify={onVerify}
        onSuccess={onVerified}
        onFail={onError}
      />
    </div>
  );
}
