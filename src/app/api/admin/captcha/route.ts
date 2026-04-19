import { NextRequest, NextResponse } from "next/server";
import {
  readCaptchaRuntimeConfig,
  writeCaptchaRuntimeConfig,
  type CaptchaRuntimeFileConfig,
  type CaptchaMode,
} from "@/lib/captcha-runtime-store";

function authorize(request: NextRequest): boolean {
  const token = request.nextUrl.searchParams.get("token");
  const adminToken = process.env.CAPTCHA_ADMIN_TOKEN;
  if (!adminToken || !token) return false;
  return token === adminToken;
}

function isCaptchaMode(v: unknown): v is CaptchaMode {
  return v === "math" || v === "slider";
}

export async function GET(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const config = await readCaptchaRuntimeConfig();
    return NextResponse.json(config);
  } catch (err) {
    console.error("[admin/captcha] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const current = await readCaptchaRuntimeConfig();

    const updated: CaptchaRuntimeFileConfig = {
      enabled: typeof body.enabled === "boolean" ? body.enabled : current.enabled,
      login_captcha: typeof body.login_captcha === "boolean" ? body.login_captcha : current.login_captcha,
      order_captcha: typeof body.order_captcha === "boolean" ? body.order_captcha : current.order_captcha,
      random_trigger_rate:
        typeof body.random_trigger_rate === "number" ? body.random_trigger_rate : current.random_trigger_rate,
      cooldown_minutes:
        typeof body.cooldown_minutes === "number" ? body.cooldown_minutes : current.cooldown_minutes,
      captcha_mode: isCaptchaMode(body.captcha_mode) ? body.captcha_mode : current.captcha_mode,
    };

    await writeCaptchaRuntimeConfig(updated);
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[admin/captcha] POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
