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
import { createAsync, query } from "@solidjs/router";
import { getStore } from "@netlify/blobs";
import defaultTheme from "~/lib/config/theme.json";

const getAdminData = query(async () => {
  "use server";
  try {
    const store = getStore({ name: "donation_store" });
    const theme = (await store.get("personalized_theme", {
      type: "json",
    })) as any;

    return {
      theme: { ...defaultTheme, ...(theme || {}) },
    };
  } catch {
    return {
      theme: defaultTheme,
    };
  }
}, "adminData");

// ฟังก์ชันแปลงโค้ดฝังตัว ImgBB เป็น Direct Link ล่าสุด
function parseDirectImageUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  // 1. ดึงลิงก์จากรูป <img src="..." /> HTML แท็ก
  const imgHtmlRegex = /<img[^>]+src=["']([^"']+)["']/i;
  const htmlMatch = trimmed.match(imgHtmlRegex);
  if (htmlMatch && htmlMatch[1]) {
    return htmlMatch[1];
  }

  // 2. ดึงลิงก์จากโค้ดรูป [img]...[/img] BBCode แท็ก
  const bbcodeRegex = /\[img\](.*?)\[\/img\]/i;
  const bbMatch = trimmed.match(bbcodeRegex);
  if (bbMatch && bbMatch[1]) {
    return bbMatch[1];
  }

  // 3. กวาดหาลิงก์ URL ตัวแรกสุด
  const urlRegex = /(https?:\/\/[^\s"'<>]+)/;
  const urlMatch = trimmed.match(urlRegex);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }

  return trimmed;
}

export default function Admin() {
  const data = createAsync(() => getAdminData());

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
  });

  const [isAuthenticated, setIsAuthenticated] = createSignal(false);
  const [authError, setAuthError] = createSignal("");
  const [saveLoading, setSaveLoading] = createSignal(false);

  const getAuthToken = () => sessionStorage.getItem("admin_jwt") || "";

  createEffect(() => {
    const theme = data()?.theme;
    if (theme) {
      setConfig(reconcile(theme));
    }
  });

  const uniqueFonts = createMemo(() => {
    return [
      ...new Set(
        [config.mainFontFamily].filter(
          (f) => f && f.trim() !== "" && f.toLowerCase() !== "sans-serif",
        ),
      ),
    ];
  });

  onMount(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get("access_token");
      if (accessToken) {
        sessionStorage.setItem("admin_verified", "true");
        sessionStorage.setItem("admin_jwt", accessToken);
        window.history.replaceState(null, "", window.location.pathname);
        setIsAuthenticated(true);
      }
    } else {
      const isVerified = sessionStorage.getItem("admin_verified") === "true";
      const storedToken = sessionStorage.getItem("admin_jwt");
      if (isVerified && storedToken) {
        setIsAuthenticated(true);
      }
    }
  });

  const handleOAuthLogin = (provider: "google") => {
    setAuthError("");
    const authorizeUrl = `/.netlify/identity/authorize?provider=${provider}`;
    window.location.href = authorizeUrl;
  };

  const handleSave = async () => {
    setSaveLoading(true);
    try {
      const rawConfig = JSON.parse(JSON.stringify(config));
      const res = await fetch("/api/admin/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ config: rawConfig }),
      });

      if (res.status === 401) {
        sessionStorage.removeItem("admin_verified");
        sessionStorage.removeItem("admin_jwt");
        setIsAuthenticated(false);
        alert("Session expired or unauthorized. Please log in again.");
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
    <>
      <Title>Admin Dashboard</Title>
      <For each={uniqueFonts()}>
        {(font) => (
          <Link
            rel="stylesheet"
            href={`https://fonts.googleapis.com/css2?family=${font.trim().replace(/\s+/g, "+")}:wght@400;500;700&display=swap`}
          />
        )}
      </For>

      <Show when={!isAuthenticated()}>
        <div class="fixed inset-0 bg-[#FAF6ED]/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div class="w-full max-w-sm p-8 bg-white border border-[#EBE3D5] rounded-3xl space-y-6 shadow-xl text-center">
            <div>
              <h1 class="text-xl font-black mt-3 text-[#2C2520]">
                Admin Dashboard
              </h1>
              <p class="text-xs text-[#7C6E65] mt-1">
                Please log in with Google to manage settings.
              </p>
            </div>

            <Show when={authError()}>
              <div class="p-3 bg-red-50 border border-red-200 text-red-600 text-xs text-center rounded-xl font-bold">
                {authError()}
              </div>
            </Show>

            <div class="space-y-3">
              <button
                type="button"
                onClick={() => handleOAuthLogin("google")}
                class="w-full py-3.5 bg-white hover:bg-gray-50 text-gray-700 font-bold border border-gray-300 rounded-2xl cursor-pointer transition-all duration-300 shadow-xs flex items-center justify-center gap-3 text-sm"
              >
                <svg class="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5.04c1.61 0 3.06.55 4.2 1.64l3.15-3.15C17.45 1.74 14.89 1 12 1 7.37 1 3.4 3.65 1.44 7.5l3.8 2.95C6.18 7.3 8.87 5.04 12 5.04z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.81-.07-1.59-.2-2.27H12v4.51h6.46c-.28 1.48-1.07 2.74-2.33 3.59l3.61 2.8c2.11-1.95 3.75-4.82 3.75-8.63z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.24 0 5.97-1.08 7.96-2.91l-3.61-2.8c-1.11.75-2.53 1.19-4.35 1.19-3.13 0-5.82-2.26-6.76-5.41L1.44 16.5C3.4 20.35 7.37 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.24 13.07a6.972 6.972 0 0 1 0-2.14L1.44 7.98a11.974 11.974 0 0 0 0 8.04l3.8-2.95z"
                  />
                </svg>
                Sign in with Google
              </button>
            </div>

            <p class="text-[10px] text-[#7C6E65] leading-relaxed">
              *Only email addresses whitelisted inside the
              <code class="bg-[#FAF8F3] px-1 py-0.5 rounded border border-[#EBE3D5] ml-1">
                ADMIN_EMAILS
              </code>{" "}
              env can successfully log in.
            </p>
          </div>
        </div>
      </Show>

      <div class="admin-font-root min-h-screen bg-[#FFFDF6] text-[#2C2520] flex flex-col">
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
                      placeholder="ใส่ลิงก์รูปภาพ เช่น https://i.ibb.co/..."
                      class="w-full px-3 py-2.5 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-xs font-bold"
                      value={config.avatarUrl || ""}
                      onInput={(e) => {
                        const parsed = parseDirectImageUrl(
                          e.currentTarget.value,
                        );
                        setConfig("avatarUrl", parsed);
                      }}
                    />
                    <p class="text-[9px] text-[#7C6E65] mt-1 leading-normal">
                      *แนะนำฝากรูปที่ **imgbb.com** เลือกแท็บ Embed codes
                      แล้วดึง "Direct link" หรือแปะโค้ด HTML
                      ลงในช่องนี้ได้เลยค่ะ
                    </p>
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
                      placeholder="ใส่ลิงก์รูปภาพ เช่น https://i.ibb.co/..."
                      class="w-full px-3 py-2.5 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-xs font-bold"
                      value={config.bannerUrl || ""}
                      onInput={(e) => {
                        const parsed = parseDirectImageUrl(
                          e.currentTarget.value,
                        );
                        setConfig("bannerUrl", parsed);
                      }}
                    />
                    <p class="text-[9px] text-[#7C6E65] mt-1 leading-normal">
                      *แนะนำฝากรูปที่ **imgbb.com** เลือกแท็บ Embed codes
                      แล้วดึง "Direct link" หรือแปะโค้ด HTML
                      ลงในช่องนี้ได้เลยค่ะ
                    </p>
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
                        class="w-full px-3 py-2 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-xs text-[#2C2520]"
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
                        class="w-full px-3 py-2 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-xs text-[#2C2520]"
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
                        class="w-full px-3 py-2 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-xs text-[#2C2520]"
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
                        class="w-full px-3 py-2 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-xs text-[#2C2520]"
                        value={config.xUrl || ""}
                        onInput={(e) =>
                          setConfig("xUrl", e.currentTarget.value)
                        }
                      />
                    </div>
                    <div>
                      <label class="block text-xs font-bold text-[#5C4F45] mb-1">
                        Facebook
                      </label>
                      <input
                        type="text"
                        placeholder="https://facebook.com/..."
                        class="w-full px-3 py-2 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-xs text-[#2C2520]"
                        value={config.facebookUrl || ""}
                        onInput={(e) =>
                          setConfig("facebookUrl", e.currentTarget.value)
                        }
                      />
                    </div>
                    <div>
                      <label class="block text-xs font-bold text-[#5C4F45] mb-1">
                        Instagram
                      </label>
                      <input
                        type="text"
                        placeholder="https://instagram.com/..."
                        class="w-full px-3 py-2 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-xs text-[#2C2520]"
                        value={config.instagramUrl || ""}
                        onInput={(e) =>
                          setConfig("instagramUrl", e.currentTarget.value)
                        }
                      />
                    </div>
                    <div>
                      <label class="block text-xs font-bold text-[#5C4F45] mb-1">
                        TikTok
                      </label>
                      <input
                        type="text"
                        placeholder="https://tiktok.com/@..."
                        class="w-full px-3 py-2 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-xs text-[#2C2520]"
                        value={config.tiktokUrl || ""}
                        onInput={(e) =>
                          setConfig("tiktokUrl", e.currentTarget.value)
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
                        class="flex-1 px-3 py-2.5 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-[#2C2520] text-xs uppercase font-mono"
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
                        class="flex-1 px-3 py-2.5 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-[#2C2520] text-xs uppercase font-mono"
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
                        class="flex-1 px-3 py-2.5 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-[#2C2520] text-xs uppercase font-mono"
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
                        class="flex-1 px-3 py-2.5 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-[#2C2520] text-xs uppercase font-mono"
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

                <div class="border-t border-[#F0EAE1] pt-4 space-y-3">
                  <label class="block text-xs font-bold text-[#5C4F45]">
                    🖼 Page Background Style
                  </label>
                  <div class="grid grid-cols-2 gap-3">
                    <button
                      class={`py-2.5 rounded-xl font-bold text-xs cursor-pointer border ${config.bgType === "solid" ? "bg-[#FFDD00] text-[#1F160E] border-[#FFDD00]" : "bg-white border-[#E5DCCF]"}`}
                      onClick={() => setConfig("bgType", "solid")}
                    >
                      Solid Color
                    </button>
                    <button
                      class={`py-2.5 rounded-xl font-bold text-xs cursor-pointer border ${config.bgType === "image" ? "bg-[#FFDD00] text-[#1F160E] border-[#FFDD00]" : "bg-white border-[#E5DCCF]"}`}
                      onClick={() => setConfig("bgType", "image")}
                    >
                      Wallpaper Image
                    </button>
                  </div>
                  <Show
                    when={config.bgType === "image"}
                    fallback={
                      <div class="flex gap-2">
                        <input
                          type="color"
                          class="w-10 h-10 border-0 rounded-lg cursor-pointer"
                          value={config.bgColor || ""}
                          onInput={(e) =>
                            setConfig("bgColor", e.currentTarget.value)
                          }
                        />
                        <input
                          type="text"
                          class="flex-1 px-3 py-2.5 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-[#2C2520] text-xs uppercase font-mono"
                          value={config.bgColor || ""}
                          onInput={(e) =>
                            setConfig("bgColor", e.currentTarget.value)
                          }
                        />
                      </div>
                    }
                  >
                    <div>
                      <label class="block text-xs font-bold text-[#5C4F45] mb-1">
                        Page Background Image URL (1920x1080)
                      </label>
                      <input
                        type="text"
                        placeholder="ใส่ลิงก์รูปภาพ เช่น https://i.ibb.co/..."
                        class="w-full px-3 py-2.5 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-xs font-bold"
                        value={config.bgUrl || ""}
                        onInput={(e) => {
                          const parsed = parseDirectImageUrl(
                            e.currentTarget.value,
                          );
                          setConfig("bgUrl", parsed);
                        }}
                      />
                      <p class="text-[9px] text-[#7C6E65] mt-1 leading-normal">
                        *แนะนำฝากรูปที่ **imgbb.com** เลือกแท็บ Embed codes
                        แล้วดึง "Direct link" หรือแปะโค้ด HTML
                        ลงในช่องนี้ได้เลยค่ะ
                      </p>
                      <Show when={config.bgUrl}>
                        <div class="mt-2 flex items-center gap-2 bg-[#FAF8F3] p-1.5 rounded-xl border border-[#F0EAE1]">
                          <span class="text-[10px] text-emerald-600 font-bold">
                            ✓ Active
                          </span>
                          <img
                            src={config.bgUrl}
                            class="w-16 h-8 rounded-lg object-cover border"
                          />
                        </div>
                      </Show>
                    </div>
                  </Show>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
