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

// ⚡ ดึงค่าดีไซน์สตรีมเมอร์จากคลาวด์เพื่อป้อนเข้าเป็นค่าเริ่มต้นของ Admin Form
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
    socialLinks: [],
  });

  const [isAuthenticated, setIsAuthenticated] = createSignal(false);
  const [password, setPassword] = createSignal("");
  const [authError, setAuthError] = createSignal("");
  const [authLoading, setAuthLoading] = createSignal(false);
  const [saveLoading, setSaveLoading] = createSignal(false);

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
          socialLinks: theme.socialLinks ? [...theme.socialLinks] : [],
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

  const hexToRgba = (hex: string, opacity: number): string => {
    if (!hex) return `rgba(15, 23, 42, ${opacity})`;
    const cleanHex = hex.replace("#", "");
    if (cleanHex.length !== 6) return hex;
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  onMount(() => {
    const isVerified = sessionStorage.getItem("admin_verified") === "true";
    const storedPass = sessionStorage.getItem("admin_pass_key");
    if (isVerified && storedPass) {
      setPassword(storedPass);
      setIsAuthenticated(true);
    }
  });

  const handleVerify = async (e: Event) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password() }),
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        sessionStorage.setItem("admin_verified", "true");
        sessionStorage.setItem("admin_pass_key", password());
        setIsAuthenticated(true);
      } else {
        setAuthError(resData.error || "รหัสผ่านไม่ถูกต้องค่ะ");
      }
    } catch {
      setAuthError("เกิดข้อผิดพลาดในการเชื่อมต่อด่านตรวจรหัสผ่าน");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSave = async () => {
    setSaveLoading(true);
    try {
      const rawConfig = JSON.parse(JSON.stringify(config));
      const res = await fetch("/api/admin/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password(), config: rawConfig }),
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        alert("🎉 อัปเดตสไตล์และบันทึกขึ้นระบบคลาวด์เรียบร้อยแล้วค่ะ!");
      } else {
        alert(
          resData.error ||
            "บันทึกไม่สำเร็จเนื่องจากพารามิเตอร์ไม่ผ่านด่านตรวจความปลอดภัยค่ะ",
        );
      }
    } catch {
      alert("ระบบหลังบ้านไม่ว่างชั่วคราวค่ะ");
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <>
      <Title>ระบบหลังบ้านผู้ดูแลระบบ 💅</Title>
      <For each={uniqueFonts()}>
        {(font) => (
          <Link
            rel="stylesheet"
            href={`https://fonts.googleapis.com/css2?family=${font.trim().replace(/\s+/g, "+")}:wght@400;500;700&display=swap`}
          />
        )}
      </For>

      <Show when={!isAuthenticated()}>
        <div class="fixed inset-0 bg-slate-950 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleVerify}
            class="w-full max-sm:max-w-xs max-w-sm p-8 bg-slate-900 border border-slate-800 rounded-3xl space-y-6 shadow-2xl"
          >
            <div class="text-center">
              <span class="text-4xl text-pink-500">🔒</span>
              <h1 class="text-lg font-extrabold mt-3 text-white">
                ระบบรักษาความปลอดภัยแอดมิน
              </h1>
            </div>
            <Show when={authError()}>
              <div class="p-3 bg-red-950/50 border border-red-500/30 text-red-400 text-xs text-center rounded-xl font-bold animate-pulse">
                {authError()}
              </div>
            </Show>
            <div class="space-y-1">
              <label
                for="pwd"
                class="text-xs font-bold text-slate-300 uppercase"
              >
                ADMIN PASSWORD
              </label>
              <input
                id="pwd"
                type="password"
                required
                placeholder="••••••••••••"
                class="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-pink-500 focus:outline-none text-white text-sm"
                value={password()}
                onInput={(e) => setPassword(e.currentTarget.value)}
              />
            </div>
            <button
              type="submit"
              disabled={authLoading()}
              class="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-600 font-bold rounded-xl cursor-pointer transition text-white disabled:opacity-50"
            >
              {authLoading() ? "กำลังล็อกอิน..." : "ล็อกอินแผงควบคุม"}
            </button>
          </form>
        </div>
      </Show>

      <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <header class="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-30">
          <div class="flex items-center gap-3">
            <span class="text-2xl">🎨</span>
            <div>
              <h1 class="font-extrabold text-base text-white">
                VTuber secure tipping admin
              </h1>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saveLoading()}
            class="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-xl cursor-pointer transition disabled:opacity-50"
          >
            {saveLoading() ? "⏳ กำลังบันทึก..." : "💾 บันทึกสไตล์ทั้งหมด"}
          </button>
        </header>

        <div class="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-8 p-6 max-w-7xl w-full mx-auto">
          <div class="space-y-6">
            <div class="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 space-y-6 max-h-[72vh] overflow-y-auto">
              <h2 class="text-sm font-bold text-white border-b border-slate-800 pb-2">
                📱 ปรับแต่งหน้าสนับสนุนหลัก
              </h2>

              <div class="space-y-4">
                <div>
                  <label class="block text-xs font-bold text-slate-400 mb-1">
                    ฟอนต์หน้าหลัก (เช่น Mitr, Kanit, Sarabun)
                  </label>
                  <input
                    type="text"
                    class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                    value={config.mainFontFamily || ""}
                    onInput={(e) =>
                      setConfig("mainFontFamily", e.currentTarget.value)
                    }
                  />
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-bold text-slate-400 mb-1">
                      ชื่อสตรีมเมอร์
                    </label>
                    <input
                      type="text"
                      class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                      value={config.vtuberName || ""}
                      onInput={(e) =>
                        setConfig("vtuberName", e.currentTarget.value)
                      }
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-slate-400 mb-1">
                      สีตัวอักษรชื่อ
                    </label>
                    <div class="flex gap-2">
                      <input
                        type="color"
                        class="w-10 h-10 border-0 rounded cursor-pointer"
                        value={config.nameColor || ""}
                        onInput={(e) =>
                          setConfig("nameColor", e.currentTarget.value)
                        }
                      />
                      <input
                        type="text"
                        class="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs uppercase"
                        value={config.nameColor || ""}
                        onInput={(e) =>
                          setConfig("nameColor", e.currentTarget.value)
                        }
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-bold text-slate-400 mb-1">
                    ข้อความต้อนรับสนับสนุน
                  </label>
                  <textarea
                    class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm"
                    rows={2}
                    value={config.welcomeText || ""}
                    onInput={(e) =>
                      setConfig("welcomeText", e.currentTarget.value)
                    }
                  ></textarea>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-bold text-slate-400 mb-1">
                      ลิงก์อวาตาร์กลม
                    </label>
                    <input
                      type="text"
                      class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs"
                      value={config.avatarUrl || ""}
                      onInput={(e) =>
                        setConfig("avatarUrl", e.currentTarget.value)
                      }
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-slate-400 mb-1">
                      ลิงก์แบนเนอร์หลัง
                    </label>
                    <input
                      type="text"
                      class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs"
                      value={config.bannerUrl || ""}
                      onInput={(e) =>
                        setConfig("bannerUrl", e.currentTarget.value)
                      }
                    />
                  </div>
                </div>

                <div class="border-t border-slate-800 pt-4 space-y-3">
                  <h3 class="text-xs font-black text-pink-400 uppercase tracking-wider">
                    💵 แก้ไข Preset ยอดเงินสนับสนุนด่วน (บาท)
                  </h3>
                  <div class="grid grid-cols-4 gap-2">
                    <For each={[0, 1, 2, 3]}>
                      {(idx) => (
                        <div>
                          <label class="block text-[10px] font-bold text-slate-400 mb-1">
                            ปุ่มที่ {idx + 1}
                          </label>
                          <input
                            type="number"
                            class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-center text-xs font-bold"
                            value={config.presetAmounts?.[idx] || 0}
                            onInput={(e) => {
                              const nextAmounts = [...config.presetAmounts];
                              nextAmounts[idx] = Number(e.currentTarget.value);
                              setConfig("presetAmounts", nextAmounts);
                            }}
                          />
                        </div>
                      )}
                    </For>
                  </div>
                </div>

                <div class="border-t border-slate-800 pt-4 space-y-4">
                  <h3 class="text-xs font-black text-pink-400 uppercase tracking-wider">
                    ✍️ ตั้งค่าข้อความและ Placeholder
                  </h3>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label class="block text-xs font-bold text-slate-400 mb-1">
                        ป้ายชื่อเล่น
                      </label>
                      <input
                        type="text"
                        class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm"
                        value={config.nicknameLabel || ""}
                        onInput={(e) =>
                          setConfig("nicknameLabel", e.currentTarget.value)
                        }
                      />
                    </div>
                    <div>
                      <label class="block text-xs font-bold text-slate-400 mb-1">
                        ข้อความไกด์ในชื่อเล่น
                      </label>
                      <input
                        type="text"
                        class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm"
                        value={config.nicknamePlaceholder || ""}
                        onInput={(e) =>
                          setConfig(
                            "nicknamePlaceholder",
                            e.currentTarget.value,
                          )
                        }
                      />
                    </div>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label class="block text-xs font-bold text-slate-400 mb-1">
                        ป้ายช่องข้อความ
                      </label>
                      <input
                        type="text"
                        class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm"
                        value={config.messageLabel || ""}
                        onInput={(e) =>
                          setConfig("messageLabel", e.currentTarget.value)
                        }
                      />
                    </div>
                    <div>
                      <label class="block text-xs font-bold text-slate-400 mb-1">
                        ข้อความไกด์ในช่องข้อความ
                      </label>
                      <input
                        type="text"
                        class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm"
                        value={config.messagePlaceholder || ""}
                        onInput={(e) =>
                          setConfig("messagePlaceholder", e.currentTarget.value)
                        }
                      />
                    </div>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label class="block text-xs font-bold text-slate-400 mb-1">
                        ป้ายกำกับปุ่ม Preset
                      </label>
                      <input
                        type="text"
                        class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm"
                        value={config.presetLabel || ""}
                        onInput={(e) =>
                          setConfig("presetLabel", e.currentTarget.value)
                        }
                      />
                    </div>
                    <div>
                      <label class="block text-xs font-bold text-slate-400 mb-1">
                        ป้ายระบุเงินเอง
                      </label>
                      <input
                        type="text"
                        class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm"
                        value={config.amountLabel || ""}
                        onInput={(e) =>
                          setConfig("amountLabel", e.currentTarget.value)
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label class="block text-xs font-bold text-slate-400 mb-1">
                      ข้อความไกด์ในระบุเงินเอง
                    </label>
                    <input
                      type="text"
                      class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm"
                      value={config.amountPlaceholder || ""}
                      onInput={(e) =>
                        setConfig("amountPlaceholder", e.currentTarget.value)
                      }
                    />
                  </div>
                </div>

                <div class="border-t border-slate-800 pt-4 space-y-4">
                  <h3 class="text-xs font-black text-pink-400 uppercase tracking-wider">
                    🔘 ตั้งค่าดีไซน์ปุ่มโดเนทส่งเงิน
                  </h3>
                  <div>
                    <label class="block text-xs font-bold text-slate-400 mb-1">
                      ข้อความปุ่มสนับสนุนหลัก
                    </label>
                    <input
                      type="text"
                      class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm"
                      value={config.submitBtnText || ""}
                      onInput={(e) =>
                        setConfig("submitBtnText", e.currentTarget.value)
                      }
                    />
                  </div>
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="block text-xs font-bold text-slate-400 mb-1">
                        สีปุ่มส่งเงิน
                      </label>
                      <div class="flex gap-2">
                        <input
                          type="color"
                          class="w-10 h-10 border-0 rounded cursor-pointer"
                          value={config.submitBtnColor || ""}
                          onInput={(e) =>
                            setConfig("submitBtnColor", e.currentTarget.value)
                          }
                        />
                        <input
                          type="text"
                          class="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs uppercase"
                          value={config.submitBtnColor || ""}
                          onInput={(e) =>
                            setConfig("submitBtnColor", e.currentTarget.value)
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <label class="block text-xs font-bold text-slate-400 mb-1">
                        สีอักษรส่งเงิน
                      </label>
                      <div class="flex gap-2">
                        <input
                          type="color"
                          class="w-10 h-10 border-0 rounded cursor-pointer"
                          value={config.submitBtnTextColor || ""}
                          onInput={(e) =>
                            setConfig(
                              "submitBtnTextColor",
                              e.currentTarget.value,
                            )
                          }
                        />
                        <input
                          type="text"
                          class="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs uppercase"
                          value={config.submitBtnTextColor || ""}
                          onInput={(e) =>
                            setConfig(
                              "submitBtnTextColor",
                              e.currentTarget.value,
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div class="border-t border-slate-800 pt-4 space-y-4">
                  <h3 class="text-xs font-black text-slate-300">
                    🖼️ จัดพื้นหลังและแผงกระจก
                  </h3>
                  <div class="grid grid-cols-2 gap-3">
                    <button
                      class={`py-2 rounded-lg font-bold text-xs cursor-pointer border ${config.bgType === "solid" ? "bg-pink-600 border-pink-500" : "bg-slate-950 border-slate-800"}`}
                      onClick={() => setConfig("bgType", "solid")}
                    >
                      สีทึบพื้นหลัง
                    </button>
                    <button
                      class={`py-2 rounded-lg font-bold text-xs cursor-pointer border ${config.bgType === "image" ? "bg-pink-600 border-pink-500" : "bg-slate-950 border-slate-800"}`}
                      onClick={() => setConfig("bgType", "image")}
                    >
                      Wallpaper รูปภาพ
                    </button>
                  </div>
                  <Show
                    when={config.bgType === "image"}
                    fallback={
                      <div class="flex gap-2">
                        <input
                          type="color"
                          class="w-10 h-10 border-0 rounded cursor-pointer"
                          value={config.bgColor || ""}
                          onInput={(e) =>
                            setConfig("bgColor", e.currentTarget.value)
                          }
                        />
                        <input
                          type="text"
                          class="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs uppercase"
                          value={config.bgColor || ""}
                          onInput={(e) =>
                            setConfig("bgColor", e.currentTarget.value)
                          }
                        />
                      </div>
                    }
                  >
                    <input
                      type="text"
                      placeholder="https://..."
                      class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs"
                      value={config.bgUrl || ""}
                      onInput={(e) => setConfig("bgUrl", e.currentTarget.value)}
                    />
                  </Show>
                </div>
              </div>
            </div>
          </div>

          <div class="flex flex-col items-center justify-center p-2 bg-slate-900 border border-slate-800 rounded-3xl min-h-[550px] relative">
            <div
              class="relative w-full max-w-[340px] h-[580px] rounded-[36px] shadow-[0_15px_35px_rgba(0,0,0,0.6)] bg-slate-950 overflow-hidden border border-slate-800 flex flex-col"
              style={{
                "background-image":
                  config.bgType === "image" && config.bgUrl
                    ? `url(${config.bgUrl})`
                    : "none",
                "background-color":
                  config.bgType === "solid" ? config.bgColor : "#0c111d",
                "background-size": "cover",
                "background-position": "center",
              }}
            >
              <div class="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] -z-10"></div>
              <div class="flex-1 overflow-y-auto p-4 flex flex-col justify-center items-center">
                <div
                  class="w-full rounded-2xl border text-center p-4 relative overflow-hidden transition-all duration-300"
                  style={{
                    "background-color": hexToRgba(
                      config.cardBgColor,
                      config.cardOpacity,
                    ),
                    "border-color": hexToRgba(
                      config.cardBorderColor,
                      config.cardBorderOpacity,
                    ),
                    "backdrop-filter": `blur(${config.cardBlur}px)`,
                  }}
                >
                  <div
                    class="space-y-3 text-left"
                    style={{
                      "font-family": `'${config.mainFontFamily}', sans-serif`,
                    }}
                  >
                    <div
                      class="relative rounded-xl overflow-hidden pb-3 border border-slate-800/30"
                      style={{
                        "background-color": hexToRgba(
                          config.profileAreaBgColor,
                          config.profileAreaOpacity,
                        ),
                      }}
                    >
                      <div class="relative">
                        <Show
                          when={config.bannerUrl}
                          fallback={
                            <div class="w-full h-24 bg-slate-900 opacity-40"></div>
                          }
                        >
                          <div
                            class="w-full h-24 bg-cover bg-center opacity-40"
                            style={{
                              "background-image": `url(${config.bannerUrl})`,
                            }}
                          ></div>
                        </Show>
                        <div
                          class="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t"
                          style={{
                            "background-image": `linear-gradient(to top, ${hexToRgba(config.profileAreaBgColor, config.profileAreaOpacity)}, transparent)`,
                          }}
                        ></div>
                      </div>
                      <div class="flex flex-col items-center sm:items-start text-center sm:text-left px-3 -mt-3 relative z-10 w-full">
                        <div class="relative flex-shrink-0">
                          <img
                            src={config.avatarUrl || "https://placehold.co/150"}
                            alt="Avatar"
                            class="w-14 h-14 rounded-full border-2 border-slate-950 object-cover"
                          />
                        </div>
                        <div class="mt-1 w-full">
                          <h3
                            class="font-extrabold text-xs"
                            style={{ color: config.nameColor }}
                          >
                            {config.vtuberName}
                          </h3>
                          <p class="text-[9px] text-slate-300 leading-tight line-clamp-2">
                            {config.welcomeText}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* แสดงกล่องพรีวิวข้อมูลชื่อเล่นเป็นแบบ text-base */}
                    <div>
                      <span class="block text-[10px] font-bold text-slate-400 mb-1">
                        {config.nicknameLabel}
                      </span>
                      <div class="w-full px-4 py-3 rounded-xl bg-slate-950/40 border border-slate-800 text-base text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap">
                        {config.nicknamePlaceholder}
                      </div>
                    </div>

                    {/* แสดงกล่องพรีวิวข้อความสนับสนุนเป็นแบบ text-base พร้อมดันพื้นที่ลงล่าง */}
                    <div>
                      <span class="block text-[10px] font-bold text-slate-400 mb-1">
                        {config.messageLabel}
                      </span>
                      <div class="w-full px-4 py-3 rounded-xl bg-slate-950/40 border border-slate-800 text-base text-slate-500 min-h-[48px]">
                        {config.messagePlaceholder}
                      </div>
                    </div>

                    {/* ปุ่ม Preset พรีวิวขนาด text-sm */}
                    <div class="space-y-1">
                      <span class="block text-[10px] font-bold text-slate-400">
                        {config.presetLabel}
                      </span>
                      <div class="grid grid-cols-4 gap-1.5">
                        <For each={config.presetAmounts}>
                          {(amt) => (
                            <button
                              type="button"
                              class="py-3 text-sm font-bold rounded-xl bg-slate-950/50 border border-slate-800 text-slate-300 cursor-default"
                            >
                              {amt}฿
                            </button>
                          )}
                        </For>
                      </div>
                    </div>

                    {/* กล่องกรอกเงินพรีวิวขนาด text-base */}
                    <div>
                      <span class="block text-[10px] font-bold text-slate-400 mb-1">
                        {config.amountLabel}
                      </span>
                      <div class="w-full px-4 py-3 rounded-xl bg-slate-950/40 border border-slate-800 text-base text-slate-500 font-extrabold">
                        {config.amountPlaceholder}
                      </div>
                    </div>

                    {/* ปุ่มตกลงหลักจำลองรูปแบบ text-base */}
                    <button
                      type="button"
                      class="w-full py-4 rounded-2xl text-base font-black shadow cursor-default uppercase"
                      style={{
                        "background-color": config.submitBtnColor,
                        color: config.submitBtnTextColor,
                      }}
                    >
                      {config.submitBtnText}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
