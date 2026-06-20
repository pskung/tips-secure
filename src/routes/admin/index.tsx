// src/routes/admin/index.tsx
import {
  createSignal,
  createMemo,
  onMount,
  createEffect,
  For,
  Show,
} from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { Title, Link } from "@solidjs/meta";
import defaultTheme from "~/lib/config/theme.json";

function parseDirectImageUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  const imgHtmlRegex = /<img[^>]+src=["']([^"']+)["']/i;
  const htmlMatch = trimmed.match(imgHtmlRegex);
  if (htmlMatch && htmlMatch[1]) return htmlMatch[1];

  const bbcodeRegex = /\[img\](.*?)\[\/img\]/i;
  const bbMatch = trimmed.match(bbcodeRegex);
  if (bbMatch && bbMatch[1]) return bbMatch[1];

  const urlRegex = /(https?:\/\/[^\s"'<>]+)/;
  const urlMatch = trimmed.match(urlRegex);
  if (urlMatch && urlMatch[1]) return urlMatch[1];

  return trimmed;
}

export default function Admin() {
  const [config, setConfig] = createStore<any>({
    presetAmounts: [100, 300, 500, 1000],
    youtubeUrl: "",
    twitchUrl: "",
    discordUrl: "",
    xUrl: "",
    facebookUrl: "",
    instagramUrl: "",
    tiktokUrl: "",
    avatarUrl: "",
    bannerUrl: "",
    bgUrl: "",
    mainFontFamily: "Kanit",
    minDonationAmount: 10,
  });

  const [isAuthenticated, setIsAuthenticated] = createSignal(false);
  const [password, setPassword] = createSignal("");
  const [loginError, setLoginError] = createSignal("");
  const [loginLoading, setLoginLoading] = createSignal(false);
  const [saveLoading, setSaveLoading] = createSignal(false);
  const [pageLoading, setPageLoading] = createSignal(true);

  // ส่วนของการดึงระบบรักษาความปลอดภัย Turnstile มาสแกนแอดมิน
  const [turnstileSiteKey, setTurnstileSiteKey] = createSignal<string>("");
  const [turnstileToken, setTurnstileToken] = createSignal("");
  const [turnstileReady, setTurnstileReady] = createSignal(false);
  let turnstileWidgetId: string | null = null;

  const uniqueFonts = createMemo(() => {
    return [
      ...new Set(
        [config.mainFontFamily || "Kanit"].filter(
          (f) => f && f.trim() !== "" && f.toLowerCase() !== "sans-serif",
        ),
      ),
    ];
  });

  onMount(async () => {
    const storedToken = sessionStorage.getItem("admin_token");
    if (storedToken) {
      setIsAuthenticated(true);
    }

    try {
      const res = await fetch("/api/theme");
      if (res.ok) {
        const payload = await res.json();
        setConfig(reconcile(payload.theme));
        setTurnstileSiteKey(payload.turnstileSiteKey);
      } else {
        setConfig(reconcile(defaultTheme));
      }
    } catch {
      setConfig(reconcile(defaultTheme));
    } finally {
      setPageLoading(false);
    }

    // จับตามองไลบรารี Turnstile สกัดสแปม
    const checkInterval = setInterval(() => {
      if ((window as any).turnstile) {
        clearInterval(checkInterval);
        setTurnstileReady(true);
      }
    }, 100);
  });

  const initTurnstile = () => {
    if (typeof window === "undefined" || !(window as any).turnstile) return;
    const siteKey = turnstileSiteKey();
    if (!siteKey || !document.getElementById("admin-turnstile-container"))
      return;

    try {
      if (turnstileWidgetId) {
        (window as any).turnstile.remove(turnstileWidgetId);
      }

      turnstileWidgetId = (window as any).turnstile.render(
        "#admin-turnstile-container",
        {
          sitekey: siteKey,
          theme: "light",
          size: "flexible",
          callback: (token: string) => {
            setTurnstileToken(token);
          },
          "expired-callback": () => {
            setTurnstileToken("");
          },
          "error-callback": () => {
            setTurnstileToken("");
          },
        },
      );
    } catch (err) {
      console.error("Failed to initialize Turnstile on admin login:", err);
    }
  };

  createEffect(() => {
    const siteKey = turnstileSiteKey();
    if (siteKey && turnstileReady() && !isAuthenticated()) {
      initTurnstile();
    }
  });

  const handleLogin = async (e: Event) => {
    e.preventDefault();
    if (turnstileSiteKey() && !turnstileToken()) {
      alert("Please complete the security challenge first 🔒");
      return;
    }

    setLoginLoading(true);
    setLoginError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: password(),
          turnstile_token: turnstileToken(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        sessionStorage.setItem("admin_token", data.token);
        setIsAuthenticated(true);
      } else {
        setLoginError(data.error || "Incorrect Password.");
        if (
          typeof (window as any).turnstile !== "undefined" &&
          turnstileWidgetId
        ) {
          (window as any).turnstile.reset(turnstileWidgetId);
          setTurnstileToken("");
        }
      }
    } catch {
      setLoginError("Cannot connect to authorization server.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSave = async () => {
    setSaveLoading(true);
    try {
      const rawConfig = JSON.parse(JSON.stringify(config));
      const res = await fetch("/api/admin/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionStorage.getItem("admin_token") || ""}`,
        },
        body: JSON.stringify({ config: rawConfig }),
      });

      if (res.status === 401 || res.status === 403) {
        sessionStorage.removeItem("admin_token");
        setIsAuthenticated(false);
        alert("Session expired. Please log in again.");
        return;
      }

      const resData = await res.json();
      if (res.ok && resData.success) {
        alert("Configuration saved successfully.");
      } else {
        alert(resData.error || "Save failed.");
      }
    } catch {
      alert("Server connection failed.");
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <Show
      when={!pageLoading()}
      fallback={
        <div class="flex items-center justify-center min-h-screen bg-[#FFFDF6] text-slate-800">
          Loading Configuration... 🎨
        </div>
      }
    >
      <Title>Admin Dashboard</Title>

      <For each={uniqueFonts()}>
        {(font) => (
          <Link
            rel="stylesheet"
            href={`https://fonts.googleapis.com/css2?family=${font.trim().replace(/\s+/g, "+")}:wght@400;500;700&display=swap`}
          />
        )}
      </For>

      <style>
        {`
          .admin-font-root,
          .admin-font-root input,
          .admin-font-root textarea,
          .admin-font-root button,
          .admin-font-root select {
            font-family: var(--admin-font-family), sans-serif !important;
          }
        `}
      </style>
      <script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        async
        defer
      ></script>

      <Show when={!isAuthenticated()}>
        <div class="fixed inset-0 bg-[#FAF6ED]/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div class="w-full max-w-sm p-8 bg-white border border-[#EBE3D5] rounded-3xl space-y-6 shadow-xl text-center">
            <div>
              <span class="text-4xl">🔐</span>
              <h1 class="text-xl font-black mt-3 text-[#2C2520]">
                Admin Dashboard
              </h1>
              <p class="text-xs text-[#7C6E65] mt-1">
                Please complete security verification and enter password.
              </p>
            </div>

            <Show when={loginError()}>
              <div class="p-3 bg-red-50 border border-red-200 text-red-600 text-xs text-center rounded-xl font-bold">
                {loginError()}
              </div>
            </Show>

            <form onSubmit={handleLogin} class="space-y-4">
              <input
                type="password"
                placeholder="Enter password..."
                value={password()}
                onInput={(e) => setPassword(e.currentTarget.value)}
                class="w-full px-4 py-3 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-center font-bold focus:outline-none focus:ring-1 focus:ring-[#E87A5D]"
                required
              />

              <Show when={turnstileSiteKey()}>
                <div
                  id="admin-turnstile-container"
                  class="w-full flex justify-center py-1 min-h-[65px]"
                  style={{
                    display: turnstileToken() ? "none" : "flex",
                  }}
                ></div>
              </Show>

              <button
                type="submit"
                disabled={
                  loginLoading() ||
                  (turnstileSiteKey() !== "" && !turnstileToken())
                }
                class="w-full py-3 bg-[#FFDD00] text-black font-black rounded-xl cursor-pointer hover:bg-[#FFE54D] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loginLoading() ? "Checking... ⏳" : "🔓 Login"}
              </button>
            </form>
          </div>
        </div>
      </Show>

      <div
        class="admin-font-root min-h-screen bg-[#FFFDF6] text-[#2C2520] flex flex-col"
        style={{
          "--admin-font-family": `'${config.mainFontFamily || "Kanit"}'`,
        }}
      >
        <header class="border-b border-[#F0EAE1] bg-[#FAF6ED] px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-30">
          <div class="flex items-center gap-3">
            <span class="text-2xl">🎨</span>
            <div>
              <h1 class="font-black text-sm sm:text-base text-[#1F160E] tracking-tight">
                Secure Support Portal Administration
              </h1>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saveLoading()}
            class="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl cursor-pointer transition disabled:opacity-50 text-xs tracking-wider"
          >
            {saveLoading() ? "Saving... ⏳" : "💾 Save Changes"}
          </button>
        </header>

        <div class="flex-1 max-w-7xl w-full mx-auto p-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div class="bg-white border border-[#F0EAE1] rounded-3xl p-6 space-y-5 shadow-xs">
              <h2 class="text-xs font-black uppercase text-[#1F160E] border-b border-[#F0EAE1] pb-2 tracking-widest flex items-center gap-2">
                <span>👤</span> Profile & Content Configuration
              </h2>

              <div class="space-y-4">
                <div>
                  <label class="block text-xs font-bold text-[#5C4F45] mb-1">
                    Main Font Family
                  </label>
                  <select
                    class="w-full px-3 py-2.5 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-[#2C2520] text-sm font-bold focus:outline-none focus:ring-1 focus:ring-[#E87A5D]"
                    value={config.mainFontFamily || "Kanit"}
                    onChange={(e) =>
                      setConfig("mainFontFamily", e.currentTarget.value)
                    }
                  >
                    <option value="Kanit">Kanit</option>
                    <option value="IBM Plex Sans Thai">
                      IBM Plex Sans Thai
                    </option>
                    <option value="Noto Sans Thai">Noto Sans Thai</option>
                    <option value="Mali">Mali</option>
                    <option value="Chonburi">Chonburi</option>
                    <option value="Pattaya">Pattaya</option>
                    <option value="Mitr">Mitr</option>
                    <option value="Prompt">Prompt</option>
                    <option value="Athiti">Athiti</option>
                    <option value="Sriracha">Sriracha</option>
                  </select>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-bold text-[#5C4F45] mb-1">
                      Streamer / Brand Name
                    </label>
                    <input
                      type="text"
                      class="w-full px-3 py-2.5 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-[#2C2520] text-sm font-bold"
                      value={config.vtuberName || ""}
                      onInput={(e) =>
                        setConfig("vtuberName", e.currentTarget.value)
                      }
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-[#5C4F45] mb-1">
                      Name Text Color
                    </label>
                    <div class="flex gap-2">
                      <input
                        type="color"
                        class="w-10 h-10 border-0 rounded-lg cursor-pointer"
                        value={config.nameColor || ""}
                        onInput={(e) =>
                          setConfig("nameColor", e.currentTarget.value)
                        }
                      />
                      <input
                        type="text"
                        class="flex-1 px-3 py-2.5 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-[#2C2520] text-xs uppercase font-mono"
                        value={config.nameColor || ""}
                        onInput={(e) =>
                          setConfig("nameColor", e.currentTarget.value)
                        }
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-bold text-[#5C4F45] mb-1">
                    Welcome Text
                  </label>
                  <textarea
                    class="w-full px-3 py-2.5 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-[#2C2520] text-sm"
                    rows={4}
                    value={config.welcomeText || ""}
                    onInput={(e) =>
                      setConfig("welcomeText", e.currentTarget.value)
                    }
                  ></textarea>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-bold text-[#5C4F45] mb-1">
                      Profile Image URL (Avatar)
                    </label>
                    <input
                      type="text"
                      placeholder="Enter image URL, e.g., https://i.ibb.co/..."
                      class="w-full px-3 py-2.5 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-xs font-bold"
                      value={config.avatarUrl || ""}
                      onInput={(e) => {
                        const parsed = parseDirectImageUrl(
                          e.currentTarget.value,
                        );
                        setConfig("avatarUrl", parsed);
                      }}
                    />
                    <Show when={config.avatarUrl}>
                      <div class="mt-2 flex items-center gap-2 bg-[#FAF8F3] p-1.5 rounded-xl border border-[#F0EAE1]">
                        <span class="text-[10px] text-emerald-600 font-bold">
                          ✓ Active
                        </span>
                        <img
                          src={config.avatarUrl}
                          class="w-10 h-10 rounded-full object-cover border"
                        />
                      </div>
                    </Show>
                  </div>

                  <div>
                    <label class="block text-xs font-bold text-[#5C4F45] mb-1">
                      Banner Image URL (1200x480)
                    </label>
                    <input
                      type="text"
                      placeholder="Enter image URL, e.g., https://i.ibb.co/..."
                      class="w-full px-3 py-2.5 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-xs font-bold"
                      value={config.bannerUrl || ""}
                      onInput={(e) => {
                        const parsed = parseDirectImageUrl(
                          e.currentTarget.value,
                        );
                        setConfig("bannerUrl", parsed);
                      }}
                    />
                    <Show when={config.bannerUrl}>
                      <div class="mt-2 flex items-center gap-2 bg-[#FAF8F3] p-1.5 rounded-xl border border-[#F0EAE1]">
                        <span class="text-[10px] text-emerald-600 font-bold">
                          ✓ Active
                        </span>
                        <img
                          src={config.bannerUrl}
                          class="w-16 h-8 rounded-lg object-cover border"
                        />
                      </div>
                    </Show>
                  </div>
                </div>

                <div class="border-t border-[#F0EAE1] pt-4 space-y-3">
                  <h3 class="text-xs font-black text-[#E87A5D] uppercase tracking-wider">
                    🔗 Social Media Links
                  </h3>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label class="block text-xs font-bold text-[#5C4F45] mb-1">
                        YouTube
                      </label>
                      <input
                        type="text"
                        placeholder="https://youtube.com/..."
                        class="w-full px-3 py-2 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-xs"
                        value={config.youtubeUrl || ""}
                        onInput={(e) =>
                          setConfig("youtubeUrl", e.currentTarget.value)
                        }
                      />
                    </div>
                    <div>
                      <label class="block text-xs font-bold text-[#5C4F45] mb-1">
                        Twitch
                      </label>
                      <input
                        type="text"
                        placeholder="https://twitch.tv/..."
                        class="w-full px-3 py-2 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-xs"
                        value={config.twitchUrl || ""}
                        onInput={(e) =>
                          setConfig("twitchUrl", e.currentTarget.value)
                        }
                      />
                    </div>
                    <div>
                      <label class="block text-xs font-bold text-[#5C4F45] mb-1">
                        Discord
                      </label>
                      <input
                        type="text"
                        placeholder="https://discord.gg/..."
                        class="w-full px-3 py-2 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-xs"
                        value={config.discordUrl || ""}
                        onInput={(e) =>
                          setConfig("discordUrl", e.currentTarget.value)
                        }
                      />
                    </div>
                    <div>
                      <label class="block text-xs font-bold text-[#5C4F45] mb-1">
                        X (Twitter)
                      </label>
                      <input
                        type="text"
                        placeholder="https://x.com/..."
                        class="w-full px-3 py-2 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-xs"
                        value={config.xUrl || ""}
                        onInput={(e) =>
                          setConfig("xUrl", e.currentTarget.value)
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="bg-white border border-[#F0EAE1] rounded-3xl p-6 space-y-5 shadow-xs">
              <h2 class="text-xs font-black uppercase text-[#1F160E] border-b border-[#F0EAE1] pb-2 tracking-widest flex items-center gap-2">
                <span>🎨</span> Color Palette & Donation Presets
              </h2>

              <div class="space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-bold text-[#5C4F45] mb-1">
                      General Text & Icons Color
                    </label>
                    <div class="flex gap-2">
                      <input
                        type="color"
                        class="w-10 h-10 border-0 rounded-lg cursor-pointer"
                        value={config.generalTextColor || ""}
                        onInput={(e) =>
                          setConfig("generalTextColor", e.currentTarget.value)
                        }
                      />
                      <input
                        type="text"
                        class="flex-1 px-3 py-2.5 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-[#2C2520] text-xs font-mono"
                        value={config.generalTextColor || ""}
                        onInput={(e) =>
                          setConfig("generalTextColor", e.currentTarget.value)
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-[#5C4F45] mb-1">
                      Container Background Color
                    </label>
                    <div class="flex gap-2">
                      <input
                        type="color"
                        class="w-10 h-10 border-0 rounded-lg cursor-pointer"
                        value={config.cardBgColor || ""}
                        onInput={(e) =>
                          setConfig("cardBgColor", e.currentTarget.value)
                        }
                      />
                      <input
                        type="text"
                        class="flex-1 px-3 py-2.5 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-[#2C2520] text-xs font-mono"
                        value={config.cardBgColor || ""}
                        onInput={(e) =>
                          setConfig("cardBgColor", e.currentTarget.value)
                        }
                      />
                    </div>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-bold text-[#5C4F45] mb-1">
                      Submit Button Color
                    </label>
                    <div class="flex gap-2">
                      <input
                        type="color"
                        class="w-10 h-10 border-0 rounded-lg cursor-pointer"
                        value={config.submitBtnColor || ""}
                        onInput={(e) =>
                          setConfig("submitBtnColor", e.currentTarget.value)
                        }
                      />
                      <input
                        type="text"
                        class="flex-1 px-3 py-2.5 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-[#2C2520] text-xs font-mono"
                        value={config.submitBtnColor || ""}
                        onInput={(e) =>
                          setConfig("submitBtnColor", e.currentTarget.value)
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-[#5C4F45] mb-1">
                      Submit Button Text Color
                    </label>
                    <div class="flex gap-2">
                      <input
                        type="color"
                        class="w-10 h-10 border-0 rounded-lg cursor-pointer"
                        value={config.submitBtnTextColor || ""}
                        onInput={(e) =>
                          setConfig("submitBtnTextColor", e.currentTarget.value)
                        }
                      />
                      <input
                        type="text"
                        class="flex-1 px-3 py-2.5 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-[#2C2520] text-xs font-mono"
                        value={config.submitBtnTextColor || ""}
                        onInput={(e) =>
                          setConfig("submitBtnTextColor", e.currentTarget.value)
                        }
                      />
                    </div>
                  </div>
                </div>

                <div class="border-t border-[#F0EAE1] pt-4">
                  <label class="block text-xs font-black text-[#E87A5D] uppercase tracking-wider mb-2">
                    💵 Quick Preset Support Amounts (THB)
                  </label>
                  <div class="grid grid-cols-4 gap-2">
                    <For each={[0, 1, 2, 3]}>
                      {(idx) => (
                        <input
                          type="number"
                          class="w-full px-2 py-2.5 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-[#2C2520] text-center text-sm font-black"
                          value={config.presetAmounts?.[idx] || 0}
                          onInput={(e) => {
                            const nextAmounts = [...config.presetAmounts];
                            nextAmounts[idx] = Number(e.currentTarget.value);
                            setConfig("presetAmounts", nextAmounts);
                          }}
                        />
                      )}
                    </For>
                  </div>
                </div>

                <div class="border-t border-[#F0EAE1] pt-4">
                  <label class="block text-xs font-bold text-[#5C4F45] mb-1">
                    Minimum Donation Amount (THB)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="100000"
                    class="w-full px-3 py-2.5 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-[#2C2520] text-sm font-bold"
                    value={config.minDonationAmount || 10}
                    onInput={(e) =>
                      setConfig(
                        "minDonationAmount",
                        Number(e.currentTarget.value),
                      )
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
}
