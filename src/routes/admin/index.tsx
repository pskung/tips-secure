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

      {/* 🔐 หน้าล็อกอินดีไซน์โคซี่นวลตาเข้ากับหน้าหลัก */}
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

      {/* 💻 แผงควบคุมสไตล์หลักดีไซน์ Warm-cozy สีครีมละมุนอมเหลือง */}
      <div class="min-h-screen bg-[#FFFDF6] text-[#2C2520] flex flex-col">
        <header class="border-b border-[#F0EAE1] bg-[#FAF6ED] px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-30">
          <div class="flex items-center gap-3">
            <span class="text-2xl">🎨</span>
            <div>
              <h1 class="font-black text-sm sm:text-base text-[#1F160E] tracking-tight">
                VTuber Secure Donation Settings
              </h1>
              <p class="text-[10px] text-[#7C6E65]">
                ปรับแต่งสไตล์ บันทึกรวดเร็ว เคลียร์ข้อมูลไร้รอยต่อ
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

        {/* 2-Column Responsive Workspace Grid บน Desktop ปรากฏครบถ้วนบนหน้าเดียว */}
        <div class="flex-1 max-w-7xl w-full mx-auto p-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* คอลัมน์ฝั่งซ้าย: Profile & Content Texts Settings */}
            <div class="bg-white border border-[#F0EAE1] rounded-3xl p-6 space-y-5 shadow-xs">
              <h2 class="text-xs font-black uppercase text-[#1F160E] border-b border-[#F0EAE1] pb-2 tracking-widest flex items-center gap-2">
                <span>👤</span> ข้อมูลโปรไฟล์ & ข้อความต้อนรับ
              </h2>

              <div class="space-y-4">
                <div>
                  <label class="block text-xs font-bold text-[#5C4F45] mb-1">
                    ฟอนต์ตัวอักษรหลัก (เช่น Mitr, Kanit, Sarabun)
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
                      ชื่อ VTuber / สตรีมเมอร์
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
                      สีของตัวอักษรชื่อสตรีมเมอร์
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
                    ข้อความรายละเอียดสนับสนุน (About Text)
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
                      ลิงก์อวาตาร์รูปโปรไฟล์กลม
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
                      ลิงก์ภาพแบนเนอร์หลัง (Banner 4:1)
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
              </div>
            </div>

            {/* คอลัมน์ฝั่งขวา: Form Colors & Backdrops Settings */}
            <div class="bg-white border border-[#F0EAE1] rounded-3xl p-6 space-y-5 shadow-xs">
              <h2 class="text-xs font-black uppercase text-[#1F160E] border-b border-[#F0EAE1] pb-2 tracking-widest flex items-center gap-2">
                <span>💵</span> การตั้งค่าฟอร์มรับเงิน & สีสันทั้งหมด
              </h2>

              <div class="space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 🟢 การตั้งค่าสีตัวอักษรที่เหลือทั้งหมด */}
                  <div>
                    <label class="block text-xs font-bold text-[#5C4F45] mb-1">
                      สีตัวอักษรอื่นทั้งหมด & ไอคอนโซเชียล
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

                  {/* 🟢 การตั้งค่าสีกล่องกระดานหน้าหลัก */}
                  <div>
                    <label class="block text-xs font-bold text-[#5C4F45] mb-1">
                      สีพื้นหลังการ์ด / สีกล่องโดเนท
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
                      สีปุ่มสนับสนุนหลัก
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
                      สีตัวอักษรบนปุ่มสนับสนุน
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

                <div>
                  <label class="block text-xs font-bold text-[#5C4F45] mb-1">
                    ข้อความในปุ่มสนับสนุนหลัก
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

                <div class="border-t border-[#F0EAE1] pt-3.5">
                  <label class="block text-xs font-black text-[#E87A5D] uppercase tracking-wider mb-2">
                    💵 ยอดเงิน Preset โดเนทด่วน (บาท)
                  </label>
                  <div class="grid grid-cols-4 gap-2">
                    <For each={[0, 1, 2, 3]}>
                      {(idx) => (
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
                      )}
                    </For>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[#F0EAE1] pt-3.5">
                  <div>
                    <label class="block text-xs font-bold text-[#5C4F45] mb-1">
                      คำบอกใบ้ช่องชื่อเล่น
                    </label>
                    <input
                      type="text"
                      class="w-full px-3 py-2.5 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-[#2C2520] text-xs"
                      value={config.nicknamePlaceholder || ""}
                      onInput={(e) =>
                        setConfig("nicknamePlaceholder", e.currentTarget.value)
                      }
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-[#5C4F45] mb-1">
                      คำบอกใบ้ช่องระบุเงินเอง
                    </label>
                    <input
                      type="text"
                      class="w-full px-3 py-2.5 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-[#2C2520] text-xs"
                      value={config.amountPlaceholder || ""}
                      onInput={(e) =>
                        setConfig("amountPlaceholder", e.currentTarget.value)
                      }
                    />
                  </div>
                </div>

                <div class="border-t border-[#F0EAE1] pt-3.5 space-y-3">
                  <label class="block text-xs font-bold text-[#5C4F45]">
                    🖼️ สไตล์พื้นหลังหลักหน้าเว็บเพจ
                  </label>
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
                      class="w-full px-3 py-2.5 bg-[#FAF8F3] border border-[#E5DCCF] rounded-xl text-xs text-[#2C2520]"
                      value={config.bgUrl || ""}
                      onInput={(e) => setConfig("bgUrl", e.currentTarget.value)}
                    />
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
