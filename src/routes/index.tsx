import {
  createSignal,
  createMemo,
  onMount,
  createEffect,
  onCleanup,
  For,
  Show,
} from "solid-js";
import { Title, Link } from "@solidjs/meta";
import { createAsync, query } from "@solidjs/router";
import { getStore } from "@netlify/blobs";
import { getRequestEvent } from "solid-js/web";
import { setHeader } from "vinxi/http";
import defaultTheme from "~/lib/config/theme.json";

// ⚡ ตรรกะฝั่งเซิร์ฟเวอร์: แคชสด 5 วินาที ดึงเบื้องหลัง 7 วินาที เพื่อสมดุลการอัปเดตสไตล์และป้องกันฐานข้อมูลล่มช่วงทราฟฟิกพุ่ง
const getInitialData = query(async () => {
  "use server";
  const event = getRequestEvent();
  if (event) {
    setHeader(
      event.nativeEvent,
      "Cache-Control",
      "public, max-age=0, s-maxage=5, stale-while-revalidate=7",
    );
  }

  try {
    const store = getStore("donation_store");
    const theme = await store.get("vtuber_personalized_theme", {
      type: "json",
    });
    return {
      theme: theme || defaultTheme,
      turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || "",
    };
  } catch {
    return {
      theme: defaultTheme,
      turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || "",
    };
  }
}, "initialData");

export default function Home() {
  const data = createAsync(() => getInitialData());

  const [name, setName] = createSignal("");
  const [amount, setAmount] = createSignal("");
  const [message, setMessage] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [honeypot, setHoneypot] = createSignal("");
  const [renderTime, setRenderTime] = createSignal(0);
  const [cooldownRemaining, setCooldownRemaining] = createSignal(0);
  const [customActive, setCustomActive] = createSignal(false);
  const [customAmountVal, setCustomAmountVal] = createSignal("");
  const [turnstileToken, setTurnstileToken] = createSignal("");
  const [isConsented, setIsConsented] = createSignal(false);
  const [isTosExpanded, setIsTosExpanded] = createSignal(false);

  let turnstileWidgetId: string | null = null;

  const config = createMemo(() => {
    const theme = data()?.theme || {};
    return {
      ...theme,
      bgColor: theme.bgColor ?? "#FFFDF6",
      cardBgColor: theme.cardBgColor ?? "#ffffff",
      cardOpacity: theme.cardOpacity ?? 1.0,
      cardBlur: theme.cardBlur ?? 0,
      cardBorderColor: theme.cardBorderColor ?? "#e4e4e4",
      cardBorderOpacity: theme.cardBorderOpacity ?? 1.0,
      profileAreaBgColor: theme.profileAreaBgColor ?? "#ffffff",
      profileAreaOpacity: theme.profileAreaOpacity ?? 1.0,
      inputBgColor: theme.inputBgColor ?? "#f4f4f5",
      inputBgOpacity: theme.inputBgOpacity ?? 1.0,
      inputBorderColor: theme.inputBorderColor ?? "#e4e4e4",
      vtuberName: theme.vtuberName ?? "Teacher Stefano",
      nameColor: theme.nameColor ?? "#111111",
      welcomeColor: theme.welcomeColor ?? "#222222",
      labelColor: theme.labelColor ?? "#111111",
      placeholderColor: theme.placeholderColor ?? "#a1a1aa",
      mainFontFamily: theme.mainFontFamily ?? "Kanit",
      welcomeText:
        theme.welcomeText ?? "ยินดีต้อนรับสู่ช่องสนับสนุนสตรีมเมอร์ค่ะ 💖",
      nicknamePlaceholder:
        theme.nicknamePlaceholder ?? "พิมพ์ชื่อเล่นที่นี่...",
      messagePlaceholder:
        theme.messagePlaceholder ?? "พิมพ์ข้อความให้สตรีมเมอร์ชื่นใจ...",
      amountPlaceholder:
        theme.amountPlaceholder ?? "ป้อนจำนวนเงิน (10 - 5,000 บาท)...",
      presetAmounts:
        theme.presetAmounts && theme.presetAmounts.length === 4
          ? theme.presetAmounts
          : [100, 300, 500, 1000],
      presetBtnColor: theme.presetBtnColor ?? "#ffffff",
      presetBorderColor: theme.presetBorderColor ?? "#e4e4e4",
      submitBtnColor: theme.submitBtnColor ?? "#ffdd00",
      submitBtnTextColor: theme.submitBtnTextColor ?? "#000000",
      submitBtnText: theme.submitBtnText ?? "Buy me a coffee ☕",
    };
  });

  const uniqueFonts = createMemo(() => {
    const conf = config();
    return [
      ...new Set(
        [conf.mainFontFamily, conf.placeholderFontFamily].filter(
          (f) => f && f.trim() !== "" && f.toLowerCase() !== "sans-serif",
        ),
      ),
    ];
  });

  const hexToRgba = (hex: string, opacity: number): string => {
    if (!hex) return `rgba(255, 255, 255, ${opacity})`;
    let cleanHex = hex.trim().replace("#", "");
    if (cleanHex.length === 3) {
      cleanHex = cleanHex
        .split("")
        .map((char) => char + char)
        .join("");
    }
    if (cleanHex.length !== 6) return hex;
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  const sanitizeUrl = (url: string | undefined): string => {
    if (!url) return "";
    const cleanUrl = url.trim();
    if (cleanUrl.match(/^https?:\/\/[^\s$.?#].[^\s]*$/i)) return cleanUrl;
    return "";
  };

  const initTurnstile = () => {
    if (typeof window === "undefined" || !(window as any).turnstile) return;
    const siteKey = data()?.turnstileSiteKey;
    if (!siteKey || !document.getElementById("turnstile-container")) return;

    try {
      if (turnstileWidgetId) {
        (window as any).turnstile.remove(turnstileWidgetId);
      }

      turnstileWidgetId = (window as any).turnstile.render(
        "#turnstile-container",
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
      console.error("Failed to initialize Turnstile:", err);
    }
  };

  onMount(() => {
    setRenderTime(Date.now());

    if (config().presetAmounts.length > 0) {
      setAmount(String(config().presetAmounts[0]));
    }

    const lastRequest = localStorage.getItem("last_donate_request");
    if (lastRequest) {
      const elapsed = Date.now() - Number(lastRequest);
      if (elapsed < 60000) {
        setCooldownRemaining(Math.ceil((60000 - elapsed) / 1000));
      }
    }

    const checkInterval = setInterval(() => {
      if ((window as any).turnstile) {
        clearInterval(checkInterval);
        initTurnstile();
      }
    }, 100);

    onCleanup(() => {
      clearInterval(checkInterval);
    });
  });

  createEffect(() => {
    if (cooldownRemaining() > 0) {
      const timer = setTimeout(() => {
        setCooldownRemaining((prev) => prev - 1);
      }, 1000);
      onCleanup(() => clearTimeout(timer));
    }
  });

  const handleDonate = async (e: Event) => {
    e.preventDefault();
    if (cooldownRemaining() > 0 || !isConsented()) return;

    if (data()?.turnstileSiteKey && !turnstileToken()) {
      alert("กรุณารอระบบตรวจสอบความเป็นมนุษย์สักครู่น้า 🔒");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name(),
          amount: Number(amount()),
          message: message(),
          email_confirm: honeypot(),
          render_time: renderTime(),
          turnstile_token: turnstileToken(),
          is_consented: isConsented(),
        }),
      });

      const resData = await res.json();
      if (res.ok && resData.invoice_url) {
        localStorage.setItem("last_donate_request", String(Date.now()));
        window.location.href = resData.invoice_url;
      } else {
        alert(resData.error || "เกิดข้อขัดข้องชั่วคราวในการขอชำระเงินค่ะ");
        setLoading(false);

        if (
          typeof (window as any).turnstile !== "undefined" &&
          turnstileWidgetId
        ) {
          (window as any).turnstile.reset(turnstileWidgetId);
          setTurnstileToken("");
        }
      }
    } catch (err) {
      alert("ระบบชำระเงินขัดข้องชั่วคราวค่ะ");
      setLoading(false);
    }
  };

  return (
    <>
      <Title>สนับสนุน {config().vtuberName} 💖</Title>
      <For each={uniqueFonts()}>
        {(font) => (
          <Link
            rel="stylesheet"
            href={`https://fonts.googleapis.com/css2?family=${font.trim().replace(/\s+/g, "+")}:wght@400;500;700&display=swap`}
          />
        )}
      </For>
      <script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        async
        defer
      ></script>

      {/* 🟢 Main Responsive Container: ลบระบบจำกัด scroll แนวตั้งออกเพื่อเปิดการยืดหยุ่นที่เลื่อนลื่นตามธรรมชาติของเว็บบราวเซอร์หลัก */}
      <main
        class="flex min-h-screen flex-col relative select-none overflow-x-hidden pb-12"
        style={{
          "background-image":
            config().bgType === "image" && config().bgUrl
              ? `url(${config().bgUrl})`
              : "none",
          "background-color": config().bgColor,
          "font-family": `'${config().mainFontFamily}', sans-serif`,
        }}
      >
        <div class="absolute inset-0 bg-black/2 -z-10"></div>

        {/* 🟢 Banner Zone: เปลี่ยนเป็น z-0 เพื่อบังคับให้อยู่เลเยอร์หลังสุดขององค์ประกอบหน้าจอทั้งหมด */}
        <div
          class="w-full h-36 sm:h-44 md:h-52 lg:h-56 bg-cover bg-center relative flex-shrink-0 border-b shadow-xs z-0"
          style={{
            "background-image": `url(${config().bannerUrl || "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=1600&auto=format&fit=crop"})`,
            "border-color": config().cardBorderColor,
          }}
        >
          <div class="absolute inset-0 bg-black/4"></div>
        </div>

        {/* 🟢 Content Area Wrapper: ใช้ z-10 ดันให้เลเยอร์หลักขึ้นมาพาดทับขอบล่างแบนเนอร์ผ่านลบ Margin */}
        <div class="max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 flex-1 flex flex-col justify-start relative z-10">
          {/* 🟢 ขยับกริดพาดทับแบนเนอร์อย่างสวยงามด้วยลบ margin: -mt-10 ถึง lg:-mt-24 */}
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start -mt-10 md:-mt-16 lg:-mt-24">
            {/* 🟢 COLUMN 1 (ฝั่งซ้าย): โซนเกี่ยวกับสตรีมเมอร์ (ขยายให้กว้างขวางขึ้นเป็น lg:col-span-7 เพื่อสมดุลการมองเห็น) */}
            <div class="lg:col-span-7 space-y-4 flex flex-col w-full">
              {/* การ์ดประวัติหลัก: ลอยทับแบนเนอร์อย่างสง่างาม */}
              <div
                class="p-5 sm:p-6 rounded-3xl border shadow-md bg-white flex flex-col space-y-4 text-left"
                style={{ "border-color": config().cardBorderColor }}
              >
                {/* จัดกลุ่มโปรไฟล์: รูปภาพกับชื่อช่องอยู่แนวนอนเดียวกันอย่างเรียบร้อย */}
                <div class="flex items-center gap-4 w-full">
                  <div class="flex-shrink-0">
                    <img
                      src={
                        sanitizeUrl(config().avatarUrl) ||
                        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop"
                      }
                      alt="Avatar"
                      class="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-white shadow-xs object-cover"
                    />
                  </div>
                  <div class="space-y-0.5 min-w-0 flex-1">
                    <h1
                      class="text-xl sm:text-2xl font-black tracking-tight truncate"
                      style={{ color: config().nameColor }}
                    >
                      {config().vtuberName}
                    </h1>
                    <p class="text-[10px] font-bold uppercase tracking-widest text-amber-600">
                      นักสร้างสรรค์คอนเทนต์ ☕
                    </p>
                  </div>
                </div>

                <div
                  class="border-t w-full"
                  style={{ "border-color": config().cardBorderColor }}
                ></div>

                {/* กล่องข้อความต้อนรับ */}
                <div>
                  <h2
                    class="text-xs font-black uppercase tracking-widest mb-2"
                    style={{ color: config().nameColor }}
                  >
                    เกี่ยวกับ {config().vtuberName}
                  </h2>
                  <p
                    class="text-xs sm:text-sm leading-relaxed whitespace-pre-line"
                    style={{ color: config().welcomeColor }}
                  >
                    {config().welcomeText}
                  </p>
                </div>
              </div>

              {/* ปุ่ม Social Links เพื่อเสริมแบรนด์ดิ้ง */}
              <div class="flex flex-wrap gap-1.5 justify-center lg:justify-start w-full">
                <For each={config().socialLinks || []}>
                  {(link) => (
                    <Show when={link.url}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="px-3 py-1.5 rounded-xl border transition-all hover:scale-105 flex items-center gap-1.5 bg-white text-[10px] font-black uppercase shadow-xs hover:bg-slate-50"
                        style={{
                          "border-color": config().cardBorderColor,
                          color: config().nameColor,
                        }}
                      >
                        <span>{link.platform}</span>
                      </a>
                    </Show>
                  )}
                </For>
              </div>
            </div>

            {/* 🟢 COLUMN 2 (ฝั่งขวา): โซนกรอกเงินสนับสนุน (บีบความกว้างให้กระทัดรัด lg:col-span-5 และคุมขอบเขตที่ max-w-[340px]) */}
            <div class="lg:col-span-5 w-full">
              <form
                onSubmit={handleDonate}
                class="max-w-[340px] w-full mx-auto lg:mr-0 lg:ml-auto p-5 sm:p-6 rounded-3xl border shadow-md space-y-4 bg-white relative overflow-hidden"
                style={{
                  "border-color": config().cardBorderColor,
                  "--placeholder-color": config().placeholderColor,
                  "--placeholder-font": `'${config().mainFontFamily}', sans-serif`,
                }}
              >
                <div class="hidden">
                  <input
                    type="text"
                    name="email_confirm"
                    value={honeypot()}
                    onInput={(e) => setHoneypot(e.currentTarget.value)}
                    tabindex={-1}
                    autocomplete="off"
                  />
                </div>

                <div class="space-y-3">
                  <span class="block text-xs font-bold text-slate-700">
                    {config().presetLabel}
                  </span>
                  <div class="grid grid-cols-4 gap-1.5">
                    <For each={config().presetAmounts}>
                      {(amt) => (
                        <button
                          type="button"
                          onClick={() => {
                            setAmount(String(amt));
                            setCustomActive(false);
                          }}
                          class="py-2.5 text-xs font-black border rounded-xl transition-all duration-200 cursor-pointer shadow-xs"
                          style={{
                            "background-color":
                              !customActive() && amount() === String(amt)
                                ? config().submitBtnColor
                                : config().presetBtnColor,
                            "border-color":
                              !customActive() && amount() === String(amt)
                                ? config().submitBtnColor
                                : config().presetBorderColor,
                            color:
                              !customActive() && amount() === String(amt)
                                ? config().submitBtnTextColor
                                : "#111111",
                          }}
                        >
                          {amt}฿
                        </button>
                      )}
                    </For>
                  </div>

                  {/* WCAG Label Mapping */}
                  <label for="custom-amount" class="sr-only">
                    {config().amountLabel}
                  </label>
                  <input
                    id="custom-amount"
                    type="number"
                    min="10"
                    max="5000"
                    placeholder={config().amountPlaceholder}
                    class="w-full px-4 py-2.5 rounded-xl text-slate-800 placeholder-slate-400 text-xs font-bold transition-all focus:outline-none focus:ring-1 border shadow-xs placeholder:text-[var(--placeholder-color)] placeholder:font-[var(--placeholder-font)]"
                    style={{
                      "background-color": config().inputBgColor,
                      "border-color": config().inputBorderColor,
                      "--tw-ring-color": config().submitBtnColor,
                    }}
                    onInput={(e) => {
                      setCustomActive(true);
                      setAmount(e.currentTarget.value);
                      setCustomAmountVal(e.currentTarget.value);
                    }}
                    value={customAmountVal()}
                  />
                </div>

                {/* WCAG Label Mapping */}
                <label for="nickname" class="sr-only">
                  {config().nicknameLabel}
                </label>
                <input
                  id="nickname"
                  type="text"
                  required
                  placeholder={config().nicknamePlaceholder}
                  class="w-full px-4 py-3 rounded-xl text-slate-800 placeholder-slate-400 text-xs transition-all focus:outline-none focus:ring-1 border shadow-xs placeholder:text-[var(--placeholder-color)] placeholder:font-[var(--placeholder-font)]"
                  style={{
                    "background-color": config().inputBgColor,
                    "border-color": config().inputBorderColor,
                    "--tw-ring-color": config().submitBtnColor,
                  }}
                  onInput={(e) => setName(e.currentTarget.value)}
                  value={name()}
                />

                {/* WCAG Label Mapping */}
                <label for="donor-msg" class="sr-only">
                  {config().messageLabel}
                </label>
                <textarea
                  id="donor-msg"
                  placeholder={config().messagePlaceholder}
                  class="w-full px-4 py-3 rounded-xl text-slate-800 placeholder-slate-400 text-xs transition-all focus:outline-none focus:ring-1 border shadow-xs placeholder:text-[var(--placeholder-color)] placeholder:font-[var(--placeholder-font)]"
                  rows={1}
                  style={{
                    "background-color": config().inputBgColor,
                    "border-color": config().inputBorderColor,
                    "--tw-ring-color": config().submitBtnColor,
                  }}
                  onInput={(e) => setMessage(e.currentTarget.value)}
                  value={message()}
                ></textarea>

                {/* 🟢 แถบ TOS & คำยินยอมแบบมินิมอล: ประกอบด้วยแถบกดเลื่อนเพื่ออ่าน และ แถบยอมรับ อย่างกระชับตามเกณฑ์ */}
                <div class="space-y-2">
                  {/* แถบเลื่อนอ่านนโยบาย */}
                  <button
                    type="button"
                    onClick={() => setIsTosExpanded(!isTosExpanded())}
                    class="w-full py-1.5 px-3 rounded-xl border font-bold text-[9px] flex items-center justify-between cursor-pointer transition-all hover:bg-slate-50"
                    style={{
                      "background-color": config().inputBgColor,
                      "border-color": config().inputBorderColor,
                      color: config().nameColor,
                    }}
                  >
                    <span>
                      📜 อ่านข้อตกลงและนโยบายความเป็นส่วนตัว (TOS & PDPA)
                    </span>
                    <span class="text-[8px]">
                      {isTosExpanded() ? "▲" : "▼"}
                    </span>
                  </button>

                  <Show when={isTosExpanded()}>
                    <div class="p-2.5 rounded-xl border bg-white space-y-1.5 max-h-[75px] overflow-y-auto leading-relaxed text-[9px] text-slate-600 transition-all duration-300">
                      <p>
                        <strong>1. นโยบายการไม่คืนเงิน:</strong>{" "}
                        ยอดสนับสนุนทั้งหมดให้โดยเสน่หาและไม่สามารถปฏิเสธจ่ายคืน
                        (Chargeback) ได้ภายหลัง
                      </p>
                      <p>
                        <strong>2. การคุ้มครองข้อมูล:</strong>{" "}
                        จัดเก็บข้อมูลชื่อและข้อความสนับสนุนของท่านเพื่อนำไปแสดงบนระฆังจอไลฟ์ตามความยินยอม
                      </p>
                    </div>
                  </Show>

                  {/* แถบกดยอมรับเงื่อนไข */}
                  <label
                    class="flex items-start gap-1.5 cursor-pointer font-bold leading-tight"
                    style={{ color: config().welcomeColor }}
                  >
                    <input
                      type="checkbox"
                      checked={isConsented()}
                      onChange={(e) => setIsConsented(e.currentTarget.checked)}
                      required
                      class="rounded mt-0.5 flex-shrink-0"
                      style={{ "accent-color": config().submitBtnColor }}
                    />
                    <span class="text-[9px] leading-tight font-medium opacity-90">
                      ฉันยอมรับตามข้อกำหนดและยินยอมส่งข้อมูลขึ้นระฆังแจ้งเตือน
                      🔒
                    </span>
                  </label>
                </div>

                <Show when={data()?.turnstileSiteKey}>
                  <div class="flex justify-center w-full min-h-[65px] transition-all">
                    <div
                      id="turnstile-container"
                      class="w-full flex justify-center"
                    ></div>
                  </div>
                </Show>

                <div class="pt-1">
                  <button
                    type="submit"
                    disabled={
                      loading() ||
                      cooldownRemaining() > 0 ||
                      (data()?.turnstileSiteKey !== "" && !turnstileToken()) ||
                      !isConsented()
                    }
                    class="w-full py-3.5 text-xs font-black rounded-2xl cursor-pointer transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] shadow-xs disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed tracking-wider uppercase"
                    style={{
                      "background-color":
                        cooldownRemaining() > 0
                          ? "#64748b"
                          : config().submitBtnColor,
                      color: config().submitBtnTextColor || "#ffffff",
                    }}
                  >
                    <Show
                      when={cooldownRemaining() > 0}
                      fallback={ShowWhenLoader()}
                    >
                      กรุณารออีก {cooldownRemaining()} วินาทีน้า ⏳
                    </Show>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </>
  );

  function ShowWhenLoader() {
    return (
      <Show when={loading()} fallback={config().submitBtnText}>
        กำลังขอคิวอาร์พร้อมเพย์...
      </Show>
    );
  }
}
