"use client";

import { CaptchaGate } from "@/components/captcha/captcha-gate";
import { MathCaptcha } from "@/components/captcha/math-captcha";
import { SliderCaptcha } from "@/components/captcha/slider-captcha";
import { useCaptchaRuntimeConfig } from "@/hooks/use-captcha-runtime-config";

interface ProductCaptchaWrapperProps {
  children: React.ReactNode;
}

export function ProductCaptchaWrapper({
  children,
}: ProductCaptchaWrapperProps) {
  const { config, loading } = useCaptchaRuntimeConfig();

  if (loading) {
    return <>{children}</>;
  }

  return (
    <CaptchaGate
      key={`${config.enabled}-${config.mode}-${config.randomTriggerRate}-${config.cooldownMinutes}`}
      enabled={config.enabled}
      probability={config.randomTriggerRate}
      cooldownMinutes={config.cooldownMinutes}
    >
      {({ showCaptcha, onVerified }) => (
        <>
          {showCaptcha && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="mx-4 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                <h2 className="mb-4 text-center text-lg font-semibold text-slate-900 dark:text-white">
                  請完成驗證
                </h2>
                {config.mode === "slider" ? (
                  <SliderCaptcha onVerified={onVerified} />
                ) : (
                  <MathCaptcha onVerified={onVerified} />
                )}
              </div>
            </div>
          )}
          {children}
        </>
      )}
    </CaptchaGate>
  );
}
