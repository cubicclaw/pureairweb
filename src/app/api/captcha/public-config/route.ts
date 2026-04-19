import { NextResponse } from "next/server";
import { readCaptchaRuntimeConfig } from "@/lib/captcha-runtime-store";

export const dynamic = "force-dynamic";

/** Unauthenticated read of captcha UX flags (no admin token). */
export async function GET() {
  try {
    const c = await readCaptchaRuntimeConfig();
    return NextResponse.json({
      enabled: c.enabled,
      loginCaptcha: c.login_captcha,
      orderCaptcha: c.order_captcha,
      randomTriggerRate: c.random_trigger_rate,
      cooldownMinutes: c.cooldown_minutes,
      mode: c.captcha_mode,
    });
  } catch (err) {
    console.error("[captcha/public-config]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
