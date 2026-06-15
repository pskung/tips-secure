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
      <Title>ระบบหลังบ้านผู้ดูแลระบบ 🎨</Title>
      <For each={uniqueFonts()}>
        {(font) => (
          <Link
            rel="stylesheet"
            href={`https://fonts.googleapis.com/css2?family=${font.trim().replace(/\s+/g, "+")}:wght@400;500;700&display=swap`}
          />
        )}
      </For>

      {/* 🔐 หน้าล็อกอินดีไซน์ใหม่สไตล์ครีมกาแฟ นวลตาละมุนใจเข้ากับธีมหลัก */}
      <Show when={!isAuthenticated()}>
        <div class="fixed inset-0 bg-[#FAF6ED]/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleVerify}
            class="w-full max-w-sm p-8 bg-white border border-[#EBE3D5] rounded-3xl space-y-6 shadow-xl"
          >
            <div class="text-center">
              <span class="text-4xl">☕</span>
              <h1 class="text-xl font-black mt-3 text-[#2C2520]">
                แผงควบคุมแอดมินหลังบ้าน
              </h1>
              <p class="text-xs text-[#7C6E65] mt-1">
                กรุณาระบุรหัสผ่านลับเพื่อจัดเก็บและแก้สไตล์เว็บ
              </p>
            </div>
            <Show when={authError()}>
              <div class="p-3 bg-red-50 border border-red-200 text-red-600 text-xs text-center rounded-xl font-bold">
                {authError()}
              </div>
            </Show>
            <div class="space-y-1.5">
              <label
                for="pwd"
                class="text-[10px] font-black text-[#5C4F45] uppercase tracking-wider"
              >
                ADMIN PASSWORD
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
            <button
              type="submit"
              disabled={authLoading()}
              class="w-full py-3.5 bg-[#FFDD00] hover:bg-[#F2D200] text-[#1F160E] font-black rounded-2xl cursor-pointer transition-all duration-300 shadow-xs disabled:opacity-50"
            >
              {authLoading() ? "กำลังล็อกอิน... ⏳" : "เข้าสู่แผงจัดการสไตล์"}
            </button>
          </form>
        </div>
      </Show>

      {/* 💻 หน้าแผงควบคุมหลักสีครีมละมุนอมเหลือง (Warm Cream Theme) */}
      <div class="min-h-screen bg-[#FFFDF6] text-[#2C2520] flex flex-col">
        <header class="border-b border-[#F0EAE1] bg-[#FAF6ED] px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-30">
          <div class="flex items-center gap-3">
            <span class="text-2xl">🎨</span>
            <div>
              <h1 class="font-black text-sm sm:text-base text-[#1F160E] tracking-tight">
                VTuber Secure Donation Settings
              </h1>
              <p class="text-[10px] text-[#7C6E65]">
                ปรับสี ค้นหาภาพ และตกแต่งเว็บบอร์ดโดเนทของคุณเอง
              </p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saveLoading()}
            class="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl cursor-pointer transition disabled:opacity-50 text-xs tracking-wider"
          >
            {saveLoading() ? "⏳ กำลังบันทึก..." : "💾 บันทึกสไตล์ทั้งหมด"}
          </button>
        </header>

        <div class="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-8 p-6 max-w-7xl w-full mx-auto">
          {/* ซ้าย: แผงควบคุมฟอร์มปรับสไตล์ */}
          <div class="space-y-6">
            <div class="bg-white border border-[#F0EAE1] rounded-3xl p-6 space-y-6 max-h-[80vh] overflow-y-auto shadow-xs">
              <h2 class="text-xs font-black uppercase text-[#1F160E] border-b border-[#F0EAE1] pb-2 tracking-widest">
                📱 ปรับแต่งหน้าหลักของคุณ
              </h2>

              <div class="space-y-4">
                <div>
                  <label class="block text-xs font-bold text-[#5C4F45] mb-1">
                    ฟอนต์หน้าหลัก (เช่น Mitr, Kanit, Sarabun)
                  </label>
                  <input
                    type="text"
                    class="w-full px-3 py-2.5 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-[#2C2520] text-sm"
                    value={config.mainFontFamily || ""}
                    onInput={(e) =>
                      setConfig("mainFontFamily", e.currentTarget.value)
                    }
                  />
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-bold text-[#5C4F45] mb-1">
                      ชื่อสตรีมเมอร์
                    </label>
                    <input
                      type="text"
                      class="w-full px-3 py-2.5 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-[#2C2520] text-sm"
                      value={config.vtuberName || ""}
                      onInput={(e) =>
                        setConfig("vtuberName", e.currentTarget.value)
                      }
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-[#5C4F45] mb-1">
                      สีตัวอักษรชื่อ
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
                    ข้อความต้อนรับสนับสนุน
                  </label>
                  <textarea
                    class="w-full px-3 py-2.5 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-[#2C2520] text-sm"
                    rows={2}
                    value={config.welcomeText || ""}
                    onInput={(e) =>
                      setConfig("welcomeText", e.currentTarget.value)
                    }
                  ></textarea>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-bold text-[#5C4F45] mb-1">
                      ลิงก์รูปอวาตาร์ (Avatar)
                    </label>
                    <input
                      type="text"
                      class="w-full px-3 py-2.5 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-xs text-[#2C2520]"
                      value={config.avatarUrl || ""}
                      onInput={(e) =>
                        setConfig("avatarUrl", e.currentTarget.value)
                      }
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-[#5C4F45] mb-1">
                      ลิงก์ภาพแบนเนอร์ (Banner 4:1)
                    </label>
                    <input
                      type="text"
                      class="w-full px-3 py-2.5 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-xs text-[#2C2520]"
                      value={config.bannerUrl || ""}
                      onInput={(e) =>
                        setConfig("bannerUrl", e.currentTarget.value)
                      }
                    />
                  </div>
                </div>

                {/* ส่วน Preset เงินขั้นต่ำ */}
                <div class="border-t border-[#F0EAE1] pt-4 space-y-3">
                  <h3 class="text-xs font-black text-[#E87A5D] uppercase tracking-wider">
                    💵 แก้ไข Preset ยอดเงินด่วน (บาท)
                  </h3>
                  <div class="grid grid-cols-4 gap-2">
                    <For each={[0, 1, 2, 3]}>
                      {(idx) => (
                        <div>
                          <label class="block text-[10px] font-bold text-[#7C6E65] mb-1">
                            ปุ่มที่ {idx + 1}
                          </label>
                          <input
                            type="number"
                            class="w-full px-2 py-2 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-[#2C2520] text-center text-xs font-black"
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

                {/* ส่วนของตั้งค่า Placeholder และสไตล์ความปลอดภัย */}
                <div class="border-t border-[#F0EAE1] pt-4 space-y-4">
                  <h3 class="text-xs font-black text-[#E87A5D] uppercase tracking-wider">
                    ✍️ คำบอกใบ้ในแบบฟอร์ม (Placeholders)
                  </h3>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label class="block text-xs font-bold text-[#5C4F45] mb-1">
                        ช่องชื่อเล่น
                      </label>
                      <input
                        type="text"
                        class="w-full px-3 py-2.5 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-[#2C2520] text-sm"
                        value={config.nicknamePlaceholder || ""}
                        onInput={(e) =>
                          setConfig(
                            "nicknamePlaceholder",
                            e.currentTarget.value,
                          )
                        }
                      />
                    </div>
                    <div>
                      <label class="block text-xs font-bold text-[#5C4F45] mb-1">
                        ช่องบอกใบ้ระบุเงินเอง
                      </label>
                      <input
                        type="text"
                        class="w-full px-3 py-2.5 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-[#2C2520] text-sm"
                        value={config.amountPlaceholder || ""}
                        onInput={(e) =>
                          setConfig("amountPlaceholder", e.currentTarget.value)
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-[#5C4F45] mb-1">
                      ช่องข้อความอวยพร
                    </label>
                    <input
                      type="text"
                      class="w-full px-3 py-2.5 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-[#2C2520] text-sm"
                      value={config.messagePlaceholder || ""}
                      onInput={(e) =>
                        setConfig("messagePlaceholder", e.currentTarget.value)
                      }
                    />
                  </div>
                </div>

                {/* ส่วนออกแบบปุ่มส่งเงินโดเนท */}
                <div class="border-t border-[#F0EAE1] pt-4 space-y-4">
                  <h3 class="text-xs font-black text-[#E87A5D] uppercase tracking-wider">
                    🔘 ตั้งค่าดีไซน์ปุ่มสนับสนุน
                  </h3>
                  <div>
                    <label class="block text-xs font-bold text-[#5C4F45] mb-1">
                      ข้อความในปุ่ม
                    </label>
                    <input
                      type="text"
                      class="w-full px-3 py-2.5 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-[#2C2520] text-sm"
                      value={config.submitBtnText || ""}
                      onInput={(e) =>
                        setConfig("submitBtnText", e.currentTarget.value)
                      }
                    />
                  </div>
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="block text-xs font-bold text-[#5C4F45] mb-1">
                        สีปุ่มโดเนท
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
                          class="flex-1 px-3 py-2.5 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-xs uppercase font-mono"
                          value={config.submitBtnColor || ""}
                          onInput={(e) =>
                            setConfig("submitBtnColor", e.currentTarget.value)
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <label class="block text-xs font-bold text-[#5C4F45] mb-1">
                        สีฟอนต์ในปุ่ม
                      </label>
                      <div class="flex gap-2">
                        <input
                          type="color"
                          class="w-10 h-10 border-0 rounded-lg cursor-pointer"
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
                          class="flex-1 px-3 py-2.5 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-xs uppercase font-mono"
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

                {/* จัดแต่งโครงแผงหลัง */}
                <div class="border-t border-[#F0EAE1] pt-4 space-y-4">
                  <h3 class="text-xs font-black text-[#5C4F45]">
                    🖼️ ตั้งค่าพื้นหลังเว็บเพจ
                  </h3>
                  <div class="grid grid-cols-2 gap-3">
                    <button
                      class={`py-2 rounded-xl font-bold text-xs cursor-pointer border ${config.bgType === "solid" ? "bg-[#FFDD00] text-[#1F160E] border-[#FFDD00]" : "bg-white border-[#E5DCCF]"}`}
                      onClick={() => setConfig("bgType", "solid")}
                    >
                      สีทึบพื้นหลัง
                    </button>
                    <button
                      class={`py-2 rounded-xl font-bold text-xs cursor-pointer border ${config.bgType === "image" ? "bg-[#FFDD00] text-[#1F160E] border-[#FFDD00]" : "bg-white border-[#E5DCCF]"}`}
                      onClick={() => setConfig("bgType", "image")}
                    >
                      รูปภาพวอลเปเปอร์
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
                          class="flex-1 px-3 py-2.5 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-xs uppercase font-mono"
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
                      placeholder="ระบุลิงก์รูปพื้นหลัง https://..."
                      class="w-full px-3 py-2.5 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-xs"
                      value={config.bgUrl || ""}
                      onInput={(e) => setConfig("bgUrl", e.currentTarget.value)}
                    />
                  </Show>
                </div>
              </div>
            </div>
          </div>

          {/* ขวา: หน้าต่างพรีวิวเสมือนจริง 2 หน้าต่าง (Desktop & Mobile Mockup Grid) */}
          <div class="space-y-6 flex flex-col justify-start">
            <div class="bg-white border border-[#F0EAE1] rounded-3xl p-5 space-y-6 shadow-xs flex-1 flex flex-col">
              <div class="border-b border-[#F0EAE1] pb-2 flex items-center justify-between">
                <h3 class="text-xs font-black uppercase text-[#1F160E] tracking-widest">
                  🖥️ สภาพแวดล้อมเสมือนจริง (Dual Preview)
                </h3>
                <span class="text-[10px] bg-[#FAF6ED] text-[#7C6E65] px-2.5 py-1 rounded-full font-bold">
                  Auto-sync
                </span>
              </div>

              <div class="flex-1 space-y-6 overflow-y-auto max-h-[72vh] pr-1">
                {/* 💻 MOCKUP 1: DESKTOP VIEW */}
                <div class="space-y-2">
                  <span class="text-[10px] font-black uppercase text-[#7C6E65] tracking-wider">
                    💻 Desktop View Preview
                  </span>
                  <div class="w-full bg-[#FAF8F3] border border-[#E5DCCF] rounded-2xl shadow-xs overflow-hidden flex flex-col text-left">
                    {/* แถบหัวโปรแกรมเบราว์เซอร์จำลอง */}
                    <div class="bg-[#FAF6ED] border-b border-[#E5DCCF] px-4 py-2 flex items-center gap-1.5 flex-shrink-0">
                      <span class="w-2 h-2 rounded-full bg-red-400"></span>
                      <span class="w-2 h-2 rounded-full bg-yellow-400"></span>
                      <span class="w-2 h-2 rounded-full bg-green-400"></span>
                      <span class="text-[9px] text-[#7C6E65] font-mono ml-2 truncate">
                        donation-gateway.local/desktop
                      </span>
                    </div>

                    {/* ตัวเว็บด้านในของคอม */}
                    <div
                      class="flex-1 overflow-y-auto min-h-[280px] max-h-[320px] relative pb-6"
                      style={{
                        "background-image":
                          config.bgType === "image" && config.bgUrl
                            ? `url(${config.bgUrl})`
                            : "none",
                        "background-color":
                          config.bgType === "solid"
                            ? config.bgColor
                            : "#FFFDF6",
                        "background-size": "cover",
                        "background-position": "center",
                        "font-family": `'${config.mainFontFamily}', sans-serif`,
                      }}
                    >
                      <div class="absolute inset-0 bg-black/2 -z-10"></div>

                      {/* Banner */}
                      <div
                        class="w-full h-16 bg-cover bg-center border-b relative"
                        style={{
                          "background-image": `url(${config.bannerUrl || "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=1600&auto=format&fit=crop"})`,
                          "border-color": config.cardBorderColor,
                        }}
                      >
                        <div class="absolute inset-0 bg-black/3"></div>
                      </div>

                      {/* Overlapping Content Grid เสมือน Desktop */}
                      <div class="px-4 max-w-4xl mx-auto -mt-4 relative z-10 flex gap-3 items-start">
                        {/* ส่วน About */}
                        <div
                          class="flex-1 bg-white p-3.5 rounded-2xl border shadow-xs text-xs"
                          style={{ "border-color": config.cardBorderColor }}
                        >
                          <div class="flex items-center gap-2">
                            <img
                              src={
                                config.avatarUrl || "https://placehold.co/150"
                              }
                              alt="Avatar"
                              class="w-10 h-10 rounded-full object-cover border"
                            />
                            <div>
                              <h4
                                class="font-extrabold text-[11px]"
                                style={{ color: config.nameColor }}
                              >
                                {config.vtuberName}
                              </h4>
                              <div class="flex gap-1 mt-0.5 opacity-50">
                                <span class="text-[7px] bg-[#FAF6ED] px-1 rounded font-bold">
                                  LIVE
                                </span>
                              </div>
                            </div>
                          </div>
                          <div
                            class="border-t my-2.5"
                            style={{ "border-color": config.cardBorderColor }}
                          ></div>
                          <p
                            class="text-[9px] leading-relaxed line-clamp-3"
                            style={{ color: config.welcomeColor }}
                          >
                            {config.welcomeText}
                          </p>
                        </div>

                        {/* ส่วนฟอร์มรับเงิน */}
                        <div
                          class="w-[160px] bg-white p-3.5 rounded-2xl border shadow-xs space-y-2 flex-shrink-0"
                          style={{ "border-color": config.cardBorderColor }}
                        >
                          <div class="grid grid-cols-4 gap-1">
                            <For each={config.presetAmounts}>
                              {(amt) => (
                                <button
                                  type="button"
                                  class="py-1 text-[7px] font-bold border rounded bg-[#FAF8F3] border-[#E5DCCF] text-[#2C2520] cursor-default"
                                >
                                  {amt}
                                </button>
                              )}
                            </For>
                          </div>
                          <div class="bg-[#FAF8F3] border border-[#E5DCCF] rounded-lg p-1 px-1.5 text-[8px] font-bold text-[#7C6E65] truncate">
                            {config.amountPlaceholder}
                          </div>
                          <div class="bg-[#FAF8F3] border border-[#E5DCCF] rounded-lg p-1 px-1.5 text-[8px] text-[#7C6E65] truncate">
                            {config.nicknamePlaceholder}
                          </div>
                          <button
                            type="button"
                            class="w-full py-1.5 rounded-xl text-[8px] font-black cursor-default text-center"
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

                {/* 📱 MOCKUP 2: MOBILE VIEW */}
                <div class="space-y-2">
                  <span class="text-[10px] font-black uppercase text-[#7C6E65] tracking-wider">
                    📱 Mobile View Preview
                  </span>
                  <div class="w-[240px] mx-auto bg-white border border-[#E5DCCF] rounded-[32px] shadow-xs overflow-hidden flex flex-col text-left relative">
                    {/* รอยบากลำโพงไอโฟน */}
                    <div class="absolute top-1.5 left-1/2 -translate-x-1/2 w-16 h-3 bg-black rounded-full z-20 flex items-center justify-center">
                      <span class="w-1.5 h-1.5 rounded-full bg-slate-900"></span>
                    </div>

                    {/* ตัวเว็บด้านในของมือถือ */}
                    <div
                      class="flex-1 overflow-y-auto min-h-[320px] max-h-[350px] relative pt-5 pb-4"
                      style={{
                        "background-image":
                          config.bgType === "image" && config.bgUrl
                            ? `url(${config.bgUrl})`
                            : "none",
                        "background-color":
                          config.bgType === "solid"
                            ? config.bgColor
                            : "#FFFDF6",
                        "background-size": "cover",
                        "background-position": "center",
                        "font-family": `'${config.mainFontFamily}', sans-serif`,
                      }}
                    >
                      <div class="absolute inset-0 bg-black/2 -z-10"></div>

                      {/* Banner */}
                      <div
                        class="w-full h-12 bg-cover bg-center border-b relative"
                        style={{
                          "background-image": `url(${config.bannerUrl || "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=1600&auto=format&fit=crop"})`,
                          "border-color": config.cardBorderColor,
                        }}
                      >
                        <div class="absolute inset-0 bg-black/3"></div>
                      </div>

                      {/* Overlapping Content แบบแนวตั้งจำลอง */}
                      <div class="px-2 py-2 -mt-3 relative z-10 space-y-2">
                        {/* About */}
                        <div
                          class="bg-white p-2.5 rounded-xl border shadow-xs"
                          style={{ "border-color": config.cardBorderColor }}
                        >
                          <div class="flex items-center gap-1.5">
                            <img
                              src={
                                config.avatarUrl || "https://placehold.co/150"
                              }
                              alt="Avatar"
                              class="w-7 h-7 rounded-full object-cover border"
                            />
                            <div>
                              <h4
                                class="font-extrabold text-[9px]"
                                style={{ color: config.nameColor }}
                              >
                                {config.vtuberName}
                              </h4>
                            </div>
                          </div>
                          <p
                            class="text-[8px] leading-relaxed mt-1.5 line-clamp-2"
                            style={{ color: config.welcomeColor }}
                          >
                            {config.welcomeText}
                          </p>
                        </div>

                        {/* ฟอร์มรับเงินโดเนท */}
                        <div
                          class="bg-white p-2.5 rounded-xl border shadow-xs space-y-1.5"
                          style={{ "border-color": config.cardBorderColor }}
                        >
                          <div class="grid grid-cols-4 gap-1">
                            <For each={config.presetAmounts}>
                              {(amt) => (
                                <button
                                  type="button"
                                  class="py-1 text-[7px] font-bold border rounded bg-[#FAF8F3] border-[#E5DCCF] text-[#2C2520] cursor-default"
                                >
                                  {amt}
                                </button>
                              )}
                            </For>
                          </div>
                          <div class="bg-[#FAF8F3] border border-[#E5DCCF] rounded p-1 px-1.5 text-[7px] font-black text-[#7C6E65] truncate">
                            {config.amountPlaceholder}
                          </div>
                          <div class="bg-[#FAF8F3] border border-[#E5DCCF] rounded p-1 px-1.5 text-[7px] text-[#7C6E65] truncate">
                            {config.nicknamePlaceholder}
                          </div>
                          <button
                            type="button"
                            class="w-full py-1.5 rounded-lg text-[8px] font-black cursor-default text-center"
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
          </div>
        </div>
      </div>
    </>
  );
}
