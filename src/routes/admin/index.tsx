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
  const [email, setEmail] = createSignal(""); // สัญญาณรับอีเมลแอดมิน
  const [password, setPassword] = createSignal("");
  const [authError, setAuthError] = createSignal("");
  const [authLoading, setAuthLoading] = createSignal(false);
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
    const isVerified = sessionStorage.getItem("admin_verified") === "true";
    const storedToken = sessionStorage.getItem("admin_jwt");
    if (isVerified && storedToken) {
      setIsAuthenticated(true);
    }
  });

  // 🟢 ล็อกอินแอดมินโดยตรงกับ Netlify Identity Backchannel
  const handleVerify = async (e: Event) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    try {
      const res = await fetch("/.netlify/identity/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email(),
          password: password(),
        }),
      });
      const resData = await res.json();
      if (res.ok && resData.access_token) {
        sessionStorage.setItem("admin_verified", "true");
        sessionStorage.setItem("admin_jwt", resData.access_token);
        setIsAuthenticated(true);
      } else {
        setAuthError(
          resData.error_description ||
            "ข้อมูลล็อกอินไม่ถูกต้อง กรุณาตรวจสอบอีกครั้งค่ะ",
        );
      }
    } catch {
      setAuthError("เชื่อมต่อระบบตรวจสอบสิทธิ์ภายนอกไม่สำเร็จค่ะ");
    } finally {
      setAuthLoading(false);
    }
  };

  // 🟢 ฟังก์ชันจัดส่งภาพผ่าน FormData ดักขนาดความจุไม่ให้เกิน 5MB
  const handleFileUpload = async (
    e: Event,
    type: "avatar" | "banner" | "bg",
  ) => {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE) {
      alert(
        "❌ ขนาดไฟล์ภาพต้องไม่เกิน 5 MB นะคะ กรุณาบีบอัดรูปภาพแล้วอัปโหลดใหม่อีกครั้งค่ะ",
      );
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

      const resData = await res.json();
      if (res.ok && resData.success) {
        if (type === "avatar") setConfig("avatarUrl", resData.url);
        else if (type === "banner") setConfig("bannerUrl", resData.url);
        else if (type === "bg") setConfig("bgUrl", resData.url);
        alert(`🎉 อัปโหลดรูปภาพประเภท ${type} สำเร็จแล้วค่ะ!`);
      } else {
        alert(resData.error || "อัปโหลดไม่สำเร็จค่ะ");
      }
    } catch {
      alert("เซิร์ฟเวอร์ขัดข้องชั่วคราวค่ะ");
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
      const resData = await res.json();
      if (res.ok && resData.success) {
        alert("🎉 จัดเก็บรูปแบบดีไซน์ลงบนระบบคลาวด์สำเร็จเรียบร้อยแล้วค่ะ!");
      } else {
        alert(resData.error || "จัดเก็บล้มเหลว กรุณาลองใหม่อีกครั้งค่ะ");
      }
    } catch {
      alert("ระบบเชื่อมต่อหลังบ้านล้มเหลวชั่วคราวค่ะ");
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

      {/* บล็อกล็อกอินแอดมินดีไซน์ Cozy ใหม่เชื่อมตรงกับ Netlify Identity */}
      <Show when={!isAuthenticated()}>
        <div class="fixed inset-0 bg-[#FAF6ED]/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleVerify}
            class="w-full max-w-sm p-8 bg-white border border-[#EBE3D5] rounded-3xl space-y-5 shadow-xl animate-fade-in"
          >
            <div class="text-center">
              <span class="text-4xl">☕</span>
              <h1 class="text-xl font-black mt-3 text-[#2C2520]">
                Admin Dashboard
              </h1>
              <p class="text-xs text-[#7C6E65] mt-1">
                ล็อกอินบัญชี Netlify Identity เพื่อตกแต่งดีไซน์ค่ะ
              </p>
            </div>
            <Show when={authError()}>
              <div class="p-3 bg-red-50 border border-red-200 text-red-600 text-xs text-center rounded-xl font-bold">
                {authError()}
              </div>
            </Show>
            <div class="space-y-3">
              <div class="space-y-1">
                <label
                  for="email"
                  class="text-[10px] font-black text-[#5C4F45] uppercase tracking-wider"
                >
                  ADMIN EMAIL
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="admin@example.com"
                  class="w-full px-4 py-3 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl focus:ring-1 focus:ring-[#E87A5D] focus:outline-none text-[#2C2520] text-sm font-bold"
                  value={email()}
                  onInput={(e) => setEmail(e.currentTarget.value)}
                />
              </div>

              <div class="space-y-1">
                <label
                  for="pwd"
                  class="text-[10px] font-black text-[#5C4F45] uppercase tracking-wider"
                >
                  PASSWORD
                </label>
                <input
                  id="pwd"
                  type="password"
                  required
                  placeholder="••••••••••••"
                  class="w-full px-4 py-3 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl focus:ring-1 focus:ring-[#E87A5D] focus:outline-none text-[#2C2520] text-sm font-bold"
                  value={password()}
                  onInput={(e) => setPassword(e.currentTarget.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading()}
              class="w-full py-3.5 bg-[#FFDD00] hover:bg-[#F2D200] text-[#1F160E] font-black rounded-2xl cursor-pointer transition-all duration-300 shadow-xs disabled:opacity-50"
            >
              {authLoading()
                ? "กำลังเข้าสู่ระบบ... ⏳"
                : "เข้าสู่แผงควบคุมหลัก"}
            </button>
          </form>
        </div>
      </Show>

      {/* พื้นที่แกนควบคุมหลังบ้านหลัก */}
      <div class="admin-font-root min-h-screen bg-[#FFFDF6] text-[#2C2520] flex flex-col">
        <header class="border-b border-[#F0EAE1] bg-[#FAF6ED] px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-30">
          <div class="flex items-center gap-3">
            <span class="text-2xl">🎨</span>
            <div>
              <h1 class="font-black text-sm sm:text-base text-[#1F160E] tracking-tight">
                VTuber Secure Donation Settings
              </h1>
              <p class="text-[10px] text-[#7C6E65]">
                ระบบแต่งเติมสไตล์ธีมแบบสตรีมมิ่งไร้พิกัดค้างแคช
              </p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saveLoading()}
            class="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl cursor-pointer transition disabled:opacity-50 text-xs tracking-wider"
          >
            {saveLoading() ? "กำลังบันทึก... ⏳" : "💾 บันทึกการตกแต่งทั้งหมด"}
          </button>
        </header>

        <div class="flex-1 max-w-7xl w-full mx-auto p-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* คอลัมน์ที่ 1: การเขียนปรับแต่งข้อความและอัปโหลด Avatar / Banner */}
            <div class="bg-white border border-[#F0EAE1] rounded-3xl p-6 space-y-5 shadow-xs">
              <h2 class="text-xs font-black uppercase text-[#1F160E] border-b border-[#F0EAE1] pb-2 tracking-widest flex items-center gap-2">
                <span>👤</span> Profile & Welcome Text
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
                      Streamer / VTuber Name
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
                    Welcome Text (About)
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

                {/* ส่วนงานอัปโหลด Avatar และ Banner */}
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-bold text-[#5C4F45] mb-1">
                      อัปโหลดรูปโปรไฟล์ (Avatar){" "}
                      <span class="text-rose-500 font-bold">*ไม่เกิน 5 MB</span>
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
                          ✓ พร้อมใช้งาน
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
                      อัปโหลดรูปแบนเนอร์ (Banner){" "}
                      <span class="text-rose-500 font-bold">*ไม่เกิน 5 MB</span>
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
                          ✓ พร้อมใช้งาน
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
                    🔗 Social Media Links (Optional)
                  </h3>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label class="block text-[10px] font-bold text-[#5C4F45] mb-1">
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
                      <label class="block text-[10px] font-bold text-[#5C4F45] mb-1">
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
                      <label class="block text-[10px] font-bold text-[#5C4F45] mb-1">
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
                      <label class="block text-[10px] font-bold text-[#5C4F45] mb-1">
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
                  </div>
                </div>
              </div>
            </div>

            {/* คอลัมน์ที่ 2: สไตล์และวอลเปเปอร์พื้นหลังอัปโหลด */}
            <div class="bg-white border border-[#F0EAE1] rounded-3xl p-6 space-y-5 shadow-xs">
              <h2 class="text-xs font-black uppercase text-[#1F160E] border-b border-[#F0EAE1] pb-2 tracking-widest flex items-center gap-2">
                <span>🎨</span> Styling & Support Presets
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
                      Card & Box Background Color
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

                {/* อัปโหลด Background Wallpapers */}
                <div class="border-t border-[#F0EAE1] pt-4 space-y-3">
                  <label class="block text-xs font-bold text-[#5C4F45]">
                    🖼/ Page Background Style
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
                        อัปโหลดรูปพื้นหลัง (Wallpaper){" "}
                        <span class="text-rose-500 font-bold">
                          *ไม่เกิน 5 MB
                        </span>
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
                            ✓ พร้อมใช้งาน
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
