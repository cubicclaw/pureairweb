"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { BASE_PATH } from "@/lib/base-path";

interface CaptchaConfig {
  enabled: boolean;
  login_captcha: boolean;
  order_captcha: boolean;
  random_trigger_rate: number;
  cooldown_minutes: number;
  captcha_mode: "math" | "slider";
}

function AdminCaptchaDashboard() {
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? "";

  const [authState, setAuthState] = useState<"loading" | "unauthorized" | "authorized">("loading");
  const [config, setConfig] = useState<CaptchaConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Manual token input for login form
  const [manualToken, setManualToken] = useState("");

  const apiUrl = useCallback(
    (t: string) => `${BASE_PATH}/api/admin/captcha?token=${encodeURIComponent(t)}`,
    []
  );

  const fetchConfig = useCallback(
    async (t: string) => {
      try {
        const res = await fetch(apiUrl(t));
        if (res.status === 401) {
          setAuthState("unauthorized");
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch config");
        const data: CaptchaConfig = await res.json();
        setConfig(data);
        setAuthState("authorized");
        setError(null);
      } catch (err) {
        console.error("[admin/captcha] fetch error:", err);
        setError("無法載入配置");
        setAuthState("unauthorized");
      }
    },
    [apiUrl]
  );

  useEffect(() => {
    if (!token) {
      setAuthState("unauthorized");
      return;
    }
    fetchConfig(token);
  }, [token, fetchConfig]);

  const saveConfig = useCallback(
    async (updated: CaptchaConfig) => {
      setSaving(true);
      setError(null);
      try {
        const res = await fetch(apiUrl(token), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updated),
        });
        if (!res.ok) throw new Error("Save failed");
        const data: CaptchaConfig = await res.json();
        setConfig(data);
        setLastSaved(new Date().toLocaleTimeString());
      } catch (err) {
        console.error("[admin/captcha] save error:", err);
        setError("儲存失敗，請重試");
      } finally {
        setSaving(false);
      }
    },
    [apiUrl, token]
  );

  function handleToggle(key: "enabled" | "login_captcha" | "order_captcha") {
    if (!config) return;
    const updated = { ...config, [key]: !config[key] };
    setConfig(updated);
    saveConfig(updated);
  }

  function handleSlider(key: "random_trigger_rate" | "cooldown_minutes", value: number) {
    if (!config) return;
    const updated = { ...config, [key]: value };
    setConfig(updated);
    saveConfig(updated);
  }

  function handleModeChange(mode: "math" | "slider") {
    if (!config) return;
    const updated = { ...config, captcha_mode: mode };
    setConfig(updated);
    saveConfig(updated);
  }

  function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualToken.trim()) return;
    const url = new URL(window.location.href);
    url.searchParams.set("token", manualToken.trim());
    window.location.href = url.toString();
  }

  if (authState === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-slate-500 dark:text-slate-400">載入中...</div>
      </div>
    );
  }

  if (authState === "unauthorized") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-900">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-xl dark:bg-red-900/30">
              🔒
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              管理員驗證
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              請輸入管理員 Token 以存取 Captcha 設定
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-token"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Admin Token
              </label>
              <input
                id="admin-token"
                type="password"
                required
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="輸入您的管理員 Token"
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <button
              type="submit"
              className="w-full rounded-lg bg-sky-600 px-4 py-2.5 font-medium text-white hover:bg-sky-700"
            >
              登入
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
            <Link href="/" className="text-sky-600 hover:underline dark:text-sky-400">
              ← 返回首頁
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 dark:bg-slate-900">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-lg dark:bg-sky-900/30">
              ⚙️
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Captcha 管理面板
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                即時控制驗證碼設定，變更自動儲存
              </p>
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div className="mb-6 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-2 text-sm">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                config.enabled ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="text-slate-600 dark:text-slate-300">
              系統狀態：{config.enabled ? "已啟用" : "已停用"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            {saving && <span className="text-amber-500">儲存中...</span>}
            {lastSaved && !saving && <span>上次儲存：{lastSaved}</span>}
            {error && <span className="text-red-500">{error}</span>}
          </div>
        </div>

        {/* Toggle cards */}
        <div className="space-y-4">
          {/* Master toggle */}
          <ToggleCard
            title="總開關"
            description="啟用或停用整個 Captcha 驗證系統"
            checked={config.enabled}
            onChange={() => handleToggle("enabled")}
            accent="sky"
          />

          {/* Login captcha */}
          <ToggleCard
            title="登入驗證碼"
            description="登入頁面 (/login) 提交前是否可能觸發驗證（題型見下方）"
            checked={config.login_captcha}
            onChange={() => handleToggle("login_captcha")}
            disabled={!config.enabled}
            accent="violet"
          />

          {/* Order captcha */}
          <ToggleCard
            title="下單驗證碼"
            description="下單頁面 (/order/new) 提交前是否可能觸發驗證（題型見下方）"
            checked={config.order_captcha}
            onChange={() => handleToggle("order_captcha")}
            disabled={!config.enabled}
            accent="amber"
          />

          {/* Captcha mode */}
          <div
            className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 ${
              !config.enabled ? "opacity-50" : ""
            }`}
          >
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">驗證題型</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  登入、下單、產品頁彈窗皆使用此題型（數學後端簽發；滑塊為啟發式後端）
                </p>
              </div>
            </div>
            <select
              id="captcha-mode"
              value={config.captcha_mode}
              disabled={!config.enabled}
              onChange={(e) =>
                handleModeChange(e.target.value === "slider" ? "slider" : "math")
              }
              className="mt-1 block w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            >
              <option value="math">數學驗證 (Math)</option>
              <option value="slider">滑塊驗證 (Slider)</option>
            </select>
          </div>

          {/* Random trigger rate */}
          <SliderCard
            title="隨機觸發機率"
            description="產品頁面和購物車隨機觸發驗證碼的概率"
            value={config.random_trigger_rate}
            min={0}
            max={1}
            step={0.05}
            displayValue={`${Math.round(config.random_trigger_rate * 100)}%`}
            onChange={(v) => handleSlider("random_trigger_rate", v)}
            disabled={!config.enabled}
            accent="emerald"
          />

          {/* Cooldown */}
          <SliderCard
            title="冷卻時間"
            description="驗證通過後免驗時間（分鐘）"
            value={config.cooldown_minutes}
            min={1}
            max={60}
            step={1}
            displayValue={`${config.cooldown_minutes} 分鐘`}
            onChange={(v) => handleSlider("cooldown_minutes", v)}
            disabled={!config.enabled}
            accent="rose"
          />
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-400 dark:text-slate-500">
          <Link href="/" className="text-sky-600 hover:underline dark:text-sky-400">
            ← 返回首頁
          </Link>
        </div>
      </div>
    </div>
  );
}

function ToggleCard({
  title,
  description,
  checked,
  onChange,
  disabled = false,
  accent,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  accent: string;
}) {
  const accentMap: Record<string, string> = {
    sky: "bg-sky-100 dark:bg-sky-900/30",
    violet: "bg-violet-100 dark:bg-violet-900/30",
    amber: "bg-amber-100 dark:bg-amber-900/30",
    emerald: "bg-emerald-100 dark:bg-emerald-900/30",
    rose: "bg-rose-100 dark:bg-rose-900/30",
  };

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition dark:border-slate-700 dark:bg-slate-800 ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold ${
              accentMap[accent] ?? accentMap.sky
            }`}
          >
            {checked ? "ON" : "OFF"}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {description}
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={onChange}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:cursor-not-allowed ${
            checked ? "bg-sky-600" : "bg-slate-300 dark:bg-slate-600"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
              checked ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

function SliderCard({
  title,
  description,
  value,
  min,
  max,
  step,
  displayValue,
  onChange,
  disabled = false,
  accent,
}: {
  title: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  onChange: (value: number) => void;
  disabled?: boolean;
  accent: string;
}) {
  const accentMap: Record<string, string> = {
    sky: "bg-sky-100 dark:bg-sky-900/30",
    violet: "bg-violet-100 dark:bg-violet-900/30",
    amber: "bg-amber-100 dark:bg-amber-900/30",
    emerald: "bg-emerald-100 dark:bg-emerald-900/30",
    rose: "bg-rose-100 dark:bg-rose-900/30",
  };

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition dark:border-slate-700 dark:bg-slate-800 ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold ${
              accentMap[accent] ?? accentMap.sky
            }`}
          >
            {displayValue}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {description}
            </p>
          </div>
        </div>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {displayValue}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-sky-600 disabled:cursor-not-allowed dark:bg-slate-600"
      />
      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        <span>{min}{step < 1 ? "%" : ""}</span>
        <span>{max}{step < 1 ? "%" : ""}</span>
      </div>
    </div>
  );
}

export default function AdminCaptchaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
          <div className="text-slate-500 dark:text-slate-400">載入中...</div>
        </div>
      }
    >
      <AdminCaptchaDashboard />
    </Suspense>
  );
}
