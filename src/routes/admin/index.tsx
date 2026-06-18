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
    const store = getStore("donation_store");
    const theme = await store.get("vtuber_personalized_theme", {
      type: "json",
    });
    return {
      theme: theme || defaultTheme,
    };
  } catch {
    return {
      theme: defaultTheme,
    };
  }
}, "adminData");

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
  });

  const [isAuthenticated, setIsAuthenticated] = createSignal(false);
  const [authError, setAuthError] = createSignal("");
  const [saveLoading, setSaveLoading] = createSignal(false);

  const [avatarLoading, setAvatarLoading] = createSignal(false);
  const [bannerLoading, setBannerLoading] = createSignal(false);
  const [bgLoading, setBgLoading] = createSignal(false);

  const getAuthToken = () => sessionStorage.getItem("admin_jwt") || "";

  createEffect(() => {
    const theme = data()?.theme;
    if (theme) {
      setConfig(
        reconcile({
          ...theme,
          presetAmounts:
            theme.presetAmounts && theme.presetAmounts.length === 4
              ? [...theme.presetAmounts]
              : [100, 300, 500, 1000],
          youtubeUrl: theme.youtubeUrl ?? "",
          twitchUrl: theme.twitchUrl ?? "",
          discordUrl: theme.discordUrl ?? "",
          xUrl: theme.xUrl ?? "",
          facebookUrl: theme.facebookUrl ?? "",
          instagramUrl: theme.instagramUrl ?? "",
          tiktokUrl: theme.tiktokUrl ?? "",
        }),
      );
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

  const handleFileUpload = async (
    e: Event,
    type: "avatar" | "banner" | "bg",
  ) => {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert("File size cannot exceed 5 MB.");
      input.value = "";
      return;
    }

    if (type === "avatar") setAvatarLoading(true);
    else if (type === "banner") setBannerLoading(true);
    else if (type === "bg") setBgLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: formData,
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
        if (type === "avatar") setConfig("avatarUrl", resData.url);
        else if (type === "banner") setConfig("bannerUrl", resData.url);
        else if (type === "bg") setConfig("bgUrl", resData.url);
        alert(`Successfully uploaded ${type} image.`);
      } else {
        alert(resData.error || "Upload failed.");
      }
    } catch {
      alert("Temporary server error. Please try again.");
    } finally {
      if (type === "avatar") setAvatarLoading(false);
      else if (type === "banner") setBannerLoading(false);
      else if (type === "bg") setBgLoading(false);
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
      <Title>Admin Dashboard 🎨</Title>
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
                      Upload Profile Image (Avatar)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={avatarLoading()}
                      class="w-full text-xs text-slate-500 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#E87A5D] file:text-white hover:file:bg-[#d66c50] file:cursor-pointer disabled:opacity-50"
                      onChange={(e) => handleFileUpload(e, "avatar")}
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
                      Upload Banner Image
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={bannerLoading()}
                      class="w-full text-xs text-slate-500 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#E87A5D] file:text-white hover:file:bg-[#d66c50] file:cursor-pointer disabled:opacity-50"
                      onChange={(e) => handleFileUpload(e, "banner")}
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
                      <label class="flex items-center gap-1.5 text-[10px] font-bold text-[#5C4F45] mb-1">
                        <svg
                          class="w-4 h-4 fill-[#FF0000] flex-shrink-0"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.516 0-9.387.507a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.871.507 9.388.507 9.388.507s7.517 0 9.389-.507a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                        </svg>
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
                      <label class="flex items-center gap-1.5 text-[10px] font-bold text-[#5C4F45] mb-1">
                        <svg
                          class="w-4 h-4 fill-[#9146FF] flex-shrink-0"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
                        </svg>
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
                      <label class="flex items-center gap-1.5 text-[10px] font-bold text-[#5C4F45] mb-1">
                        <svg
                          class="w-4 h-4 fill-[#5865F2] flex-shrink-0"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.074 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.01-.09-.024-.121-.63-.24-1.224-.534-1.783-.876a.079.079 0 0 1-.008-.13c.12-.09.239-.185.353-.28a.077.077 0 0 1 .081-.011c3.963 1.817 8.27 1.817 12.185 0a.078.078 0 0 1 .082.01c.114.095.233.19.353.281a.078.078 0 0 1-.007.13 12.19 12.19 0 0 1-1.784.877c-.033.013-.044.062-.024.12.355.698.766 1.365 1.225 1.993a.082.082 0 0 0 .085.029 19.9 19.9 0 0 0 6.002-3.03.076.076 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z" />
                        </svg>
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
                      <label class="flex items-center gap-1.5 text-[10px] font-bold text-[#5C4F45] mb-1">
                        <svg
                          class="w-4 h-4 fill-[#0F1419] flex-shrink-0"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
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
                      <label class="flex items-center gap-1.5 text-[10px] font-bold text-[#5C4F45] mb-1">
                        <svg
                          class="w-4 h-4 fill-[#1877F2] flex-shrink-0"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z" />
                        </svg>
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
                      <label class="flex items-center gap-1.5 text-[10px] font-bold text-[#5C4F45] mb-1">
                        <svg
                          class="w-4 h-4 fill-[#E4405F] flex-shrink-0"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204 0 3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                        </svg>
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
                      <label class="flex items-center gap-1.5 text-[10px] font-bold text-[#5C4F45] mb-1">
                        <svg
                          class="w-4 h-4 fill-[#000000] flex-shrink-0"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.59 4.23.1.12.2.24.3.35v3.98c-.14-.02-.27-.06-.41-.09-1.2-.28-2.28-.97-3.04-1.92-.04-.05-.07-.11-.12-.18v7.22c.04 5.37-4.43 9.42-9.74 8.91-4.04-.39-7.16-3.86-7.14-7.9.03-3.84 2.87-7.07 6.69-7.46.61-.06 1.22-.04 1.83.05v3.94c-.4-.08-.81-.11-1.22-.09-1.85.08-3.34 1.64-3.29 3.51.05 1.84 1.57 3.31 3.42 3.27 1.8-.04 3.23-1.52 3.21-3.32V0c.34.01.67.01 1 .02z" />
                        </svg>
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
                        Upload Page Background Image (Max 5 MB)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={bgLoading()}
                        class="w-full text-xs text-slate-500 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#E87A5D] file:text-white hover:file:bg-[#d66c50] file:cursor-pointer disabled:opacity-50"
                        onChange={(e) => handleFileUpload(e, "bg")}
                      />
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
