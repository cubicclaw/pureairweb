import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";

const CONFIG_PATH = "/tmp/captcha-config.json";

interface CaptchaConfig {
  enabled: boolean;
  login_captcha: boolean;
  order_captcha: boolean;
  random_trigger_rate: number;
  cooldown_minutes: number;
}

const DEFAULT_CONFIG: CaptchaConfig = {
  enabled: true,
  login_captcha: true,
  order_captcha: false,
  random_trigger_rate: 0.3,
  cooldown_minutes: 30,
};

function authorize(request: NextRequest): boolean {
  const token = request.nextUrl.searchParams.get("token");
  const adminToken = process.env.CAPTCHA_ADMIN_TOKEN;
  if (!adminToken || !token) return false;
  return token === adminToken;
}

async function loadConfig(): Promise<CaptchaConfig> {
  try {
    const raw = await readFile(CONFIG_PATH, "utf-8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

async function saveConfig(config: CaptchaConfig): Promise<void> {
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

export async function GET(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const config = await loadConfig();
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
    const current = await loadConfig();

    const updated: CaptchaConfig = {
      enabled: typeof body.enabled === "boolean" ? body.enabled : current.enabled,
      login_captcha: typeof body.login_captcha === "boolean" ? body.login_captcha : current.login_captcha,
      order_captcha: typeof body.order_captcha === "boolean" ? body.order_captcha : current.order_captcha,
      random_trigger_rate: typeof body.random_trigger_rate === "number" ? body.random_trigger_rate : current.random_trigger_rate,
      cooldown_minutes: typeof body.cooldown_minutes === "number" ? body.cooldown_minutes : current.cooldown_minutes,
    };

    await saveConfig(updated);
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[admin/captcha] POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
