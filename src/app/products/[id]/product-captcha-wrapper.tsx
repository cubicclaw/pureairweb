"use client";

import { CaptchaGate } from "@/components/captcha/captcha-gate";
import { MathCaptcha } from "@/components/captcha/math-captcha";

interface ProductCaptchaWrapperProps {
  children: React.ReactNode;
}

export function ProductCaptchaWrapper({
  children,
}: ProductCaptchaWrapperProps) {
  return (
    <CaptchaGate probability={0.2}>
      {({ showCaptcha, onVerified }) => (
        <>
          {showCaptcha && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="mx-4 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                <h2 className="mb-4 text-center text-lg font-semibold text-slate-900 dark:text-white">
                  請完成驗證
                </h2>
                <MathCaptcha onVerified={onVerified} />
              </div>
            </div>
          )}
          {children}
        </>
      )}
    </CaptchaGate>
  );
}
