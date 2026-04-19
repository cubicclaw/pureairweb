import { readFile, writeFile } from "fs/promises";

export const CAPTCHA_RUNTIME_CONFIG_PATH = "/tmp/captcha-config.json";

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

export async function readCaptchaRuntimeConfig(): Promise<CaptchaRuntimeFileConfig> {
  try {
    const raw = await readFile(CAPTCHA_RUNTIME_CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<CaptchaRuntimeFileConfig>;
    return normalizeRuntimeConfig(parsed);
  } catch {
    return { ...DEFAULT_RUNTIME_CONFIG };
  }
}

function normalizeRuntimeConfig(
  parsed: Partial<CaptchaRuntimeFileConfig>,
): CaptchaRuntimeFileConfig {
  const merged = { ...DEFAULT_RUNTIME_CONFIG, ...parsed };
  if (merged.captcha_mode !== "math" && merged.captcha_mode !== "slider") {
    merged.captcha_mode = "math";
  }
  return merged;
}

export async function writeCaptchaRuntimeConfig(config: CaptchaRuntimeFileConfig): Promise<void> {
  await writeFile(CAPTCHA_RUNTIME_CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}
