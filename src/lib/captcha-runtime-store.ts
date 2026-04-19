import { readFile, writeFile } from "fs/promises";
import { unstable_noStore } from "next/cache";

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type SupabaseReadResult =
  | { kind: "ok"; config: CaptchaRuntimeFileConfig }
  | { kind: "empty" }
  | { kind: "error"; message: string };

/**
 * 单次读取；区分「无行/无 config」与「网络或 PostgREST 错误」。
 * 无行时返回 empty，不应回退到 /tmp（否则多实例会与 DB 随机打架）。
 * 仅在 `hasSupabaseForCaptcha()` 为 true 时调用。
 */
async function readFromSupabaseOnce(): Promise<SupabaseReadResult> {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from(CAPTCHA_CONFIG_TABLE)
      .select("config")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      return { kind: "error", message: error.message };
    }
    if (!data) {
      return { kind: "empty" };
    }
    if (!data.config || typeof data.config !== "object") {
      return { kind: "empty" };
    }
    return {
      kind: "ok",
      config: normalizeRuntimeConfig(data.config as Partial<CaptchaRuntimeFileConfig>),
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { kind: "error", message };
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
  unstable_noStore();

  if (hasSupabaseForCaptcha()) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const r = await readFromSupabaseOnce();
      if (r.kind === "ok") return r.config;
      if (r.kind === "empty") {
        return { ...DEFAULT_RUNTIME_CONFIG };
      }
      console.warn(`[captcha-runtime-store] Supabase read error (attempt ${attempt + 1}/3):`, r.message);
      if (attempt < 2) await sleep(100 * (attempt + 1));
    }
    console.error(
      "[captcha-runtime-store] Supabase read failed after retries; using default config (not falling back to /tmp — avoids per-instance random mode on Vercel).",
    );
    return { ...DEFAULT_RUNTIME_CONFIG };
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
