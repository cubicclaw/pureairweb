"use client";

import dynamic from "next/dynamic";

// @ts-ignore - slider-captcha-js/react has no type declarations
const SliderCaptchaComponent = dynamic(() => import("slider-captcha-js/react"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center rounded-xl bg-slate-50 p-8 dark:bg-slate-700/50">
      <p className="text-sm text-slate-500 dark:text-slate-400">載入驗證元件中…</p>
    </div>
  ),
});

interface SliderCaptchaProps {
  onVerified: () => void;
  onError?: (error: unknown) => void;
  width?: number;
  height?: number;
  theme?: "light" | "dark";
}

export function SliderCaptcha({
  onVerified,
  onError,
  width = 320,
  height = 200,
  theme = "light",
}: SliderCaptchaProps) {
  return (
    <div className="w-full max-w-sm">
      <SliderCaptchaComponent
        // @ts-ignore
        root={null}
        // @ts-ignore
        width={width}
        // @ts-ignore
        height={height}
        // @ts-ignore
        theme={theme}
        // @ts-ignore
        onSuccess={onVerified}
        // @ts-ignore
        onFail={onError}
      />
    </div>
  );
}
