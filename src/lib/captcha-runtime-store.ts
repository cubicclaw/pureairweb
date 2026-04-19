import { readFile, writeFile } from "fs/promises";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const CAPTCHA_RUNTIME_CONFIG_PATH = "/tmp/captcha-config.json";

const CAPTCHA_CONFIG_TABLE = "captcha_runtime_config";

export type CaptchaMode = "math" | "slider";

/** Persisted JSON shape (snake_case, matches admin API). */
export interface CaptchaRuntimeFileConfig {
  enabled: boolean;
  login_captcha: boolean;
  order_captcha: boolean;
  random_trigger_rate: number;
  cooldown_minutes: number;
  captcha_mode: CaptchaMode;
}

export const DEFAULT_RUNTIME_CONFIG: CaptchaRuntimeFileConfig = {
  enabled: true,
  login_captcha: true,
  order_captcha: true,
  random_trigger_rate: 0.3,
  cooldown_minutes: 5,
  captcha_mode: "math",
};

function hasSupabaseForCaptcha(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

async function readFromSupabase(): Promise<CaptchaRuntimeFileConfig | null> {
  if (!hasSupabaseForCaptcha()) return null;
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from(CAPTCHA_CONFIG_TABLE)
      .select("config")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.warn("[captcha-runtime-store] Supabase read:", error.message);
      return null;
    }
    if (!data?.config || typeof data.config !== "object") {
      return null;
    }
    return normalizeRuntimeConfig(data.config as Partial<CaptchaRuntimeFileConfig>);
  } catch (e) {
    console.warn("[captcha-runtime-store] Supabase read failed:", e);
    return null;
  }
}

async function writeToSupabase(config: CaptchaRuntimeFileConfig): Promise<boolean> {
  if (!hasSupabaseForCaptcha()) return false;
  try {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from(CAPTCHA_CONFIG_TABLE).upsert(
      {
        id: 1,
        config,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    if (error) {
      console.error("[captcha-runtime-store] Supabase write:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[captcha-runtime-store] Supabase write failed:", e);
    return false;
  }
}

export async function readCaptchaRuntimeConfig(): Promise<CaptchaRuntimeFileConfig> {
  const fromDb = await readFromSupabase();
  if (fromDb) {
    return fromDb;
  }

  try {
    const raw = await readFile(CAPTCHA_RUNTIME_CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<CaptchaRuntimeFileConfig>;
    return normalizeRuntimeConfig(parsed);
  } catch {
    return { ...DEFAULT_RUNTIME_CONFIG };
  }
}

function coerceFiniteNumber(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function coerceCaptchaMode(v: unknown): CaptchaMode {
  if (v === "math" || v === "slider") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "math" || s === "slider") return s;
  }
  return "math";
}

function normalizeRuntimeConfig(
  parsed: Partial<CaptchaRuntimeFileConfig> & {
    captchaMode?: unknown;
    mode?: unknown;
  },
): CaptchaRuntimeFileConfig {
  const modeSource = parsed.captcha_mode ?? parsed.captchaMode ?? parsed.mode;
  const merged: CaptchaRuntimeFileConfig = {
    ...DEFAULT_RUNTIME_CONFIG,
    ...parsed,
    enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : DEFAULT_RUNTIME_CONFIG.enabled,
    login_captcha:
      typeof parsed.login_captcha === "boolean" ? parsed.login_captcha : DEFAULT_RUNTIME_CONFIG.login_captcha,
    order_captcha:
      typeof parsed.order_captcha === "boolean" ? parsed.order_captcha : DEFAULT_RUNTIME_CONFIG.order_captcha,
    random_trigger_rate: coerceFiniteNumber(
      parsed.random_trigger_rate,
      DEFAULT_RUNTIME_CONFIG.random_trigger_rate,
    ),
    cooldown_minutes: Math.round(
      coerceFiniteNumber(parsed.cooldown_minutes, DEFAULT_RUNTIME_CONFIG.cooldown_minutes),
    ),
    captcha_mode: coerceCaptchaMode(modeSource),
  };
  merged.random_trigger_rate = Math.min(1, Math.max(0, merged.random_trigger_rate));
  merged.cooldown_minutes = Math.min(120, Math.max(1, merged.cooldown_minutes));
  return merged;
}

export async function writeCaptchaRuntimeConfig(config: CaptchaRuntimeFileConfig): Promise<void> {
  await writeToSupabase(config);
  try {
    await writeFile(CAPTCHA_RUNTIME_CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
  } catch {
    // e.g. serverless without writable /tmp — Supabase may still have succeeded
  }
}
