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

      {/* 🟢 Main Responsive Container: ล็อกความสูงหน้าจอเดียวบน Desktop และ Tablet แนวนอน */}
      <main
        class="flex min-h-screen flex-col relative select-none overflow-x-hidden lg:h-screen lg:overflow-hidden pb-6 lg:pb-0"
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

        {/* 🟢 Banner Zone: ความกว้างเต็มพิกัดล็อกอัตราส่วนสมมาตร 4:1 (1600x400) แบบไม่มีรูปโปรไฟล์ลอยบัง */}
        <div
          class="w-full aspect-[4/1] max-h-[160px] sm:max-h-[200px] md:max-h-[220px] bg-cover bg-center relative flex-shrink-0 border-b shadow-xs"
          style={{
            "background-image": `url(${config().bannerUrl || "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=1600&auto=format&fit=crop"})`,
            "border-color": config().cardBorderColor,
          }}
        >
          <div class="absolute inset-0 bg-black/4"></div>
        </div>

        {/* 🟢 Content Area Wrapper: จัดสรร Grid ซ้ายขวาให้ล็อคหน้าจอเดียวในระบบ Desktop */}
        <div class="max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex-1 lg:overflow-hidden flex flex-col justify-start">
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start lg:h-full lg:overflow-hidden">
            {/* 🟢 COLUMN 1 (ฝั่งซ้าย): โซนเกี่ยวกับสตรีมเมอร์ (About Zone) */}
            <div class="lg:col-span-5 space-y-4 lg:h-full lg:overflow-y-auto pb-4 pr-1 scrollbar-thin flex flex-col items-center lg:items-start text-center lg:text-left">
              {/* 🟢 ย้ายรูป Avatar มาจัดวางตรงจุดเริ่มต้นของโซน About (ไม่บดบังแบนเนอร์ด้านบน) */}
              <div class="flex-shrink-0">
                <img
                  src={
                    sanitizeUrl(config().avatarUrl) ||
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop"
                  }
                  alt="Avatar"
                  class="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white shadow-md object-cover"
                />
              </div>

              <div class="space-y-1">
                <h1
                  class="text-2xl sm:text-3xl font-black tracking-tight"
                  style={{ color: config().nameColor }}
                >
                  {config().vtuberName}
                </h1>
                <p class="text-xs font-bold uppercase tracking-widest text-amber-600">
                  สตรีมเมอร์และนักสร้างสรรค์คอนเทนต์ ☕
                </p>
              </div>

              {/* กล่องข้อความ About */}
              <div
                class="p-5 rounded-2xl border shadow-sm w-full bg-white transition-all text-left"
                style={{
                  "border-color": config().cardBorderColor,
                }}
              >
                <h2
                  class="text-xs font-black uppercase tracking-widest mb-3"
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

              {/* ปุ่ม Social Links */}
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

            {/* 🟢 COLUMN 2 (ฝั่งขวา): โซนกรอกเงินสนับสนุนโดเนท (Donation Form Zone) */}
            <div class="lg:col-span-7 lg:h-full lg:overflow-y-auto pb-4 pr-1 scrollbar-thin">
              <form
                onSubmit={handleDonate}
                class="p-5 sm:p-6 rounded-3xl border shadow-sm space-y-4 bg-white relative overflow-hidden"
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
                  rows={2}
                  style={{
                    "background-color": config().inputBgColor,
                    "border-color": config().inputBorderColor,
                    "--tw-ring-color": config().submitBtnColor,
                  }}
                  onInput={(e) => setMessage(e.currentTarget.value)}
                  value={message()}
                ></textarea>

                <div
                  class="p-4 rounded-2xl border text-[10px] space-y-2.5 transition-all duration-300"
                  style={{
                    "background-color": config().inputBgColor,
                    "border-color": config().inputBorderColor,
                  }}
                >
                  <p class="font-bold" style={{ color: config().welcomeColor }}>
                    📢 ข้อตกลงการสนับสนุน (Terms of Service)
                  </p>
                  <p
                    class="leading-normal opacity-85"
                    style={{ color: config().welcomeColor }}
                  >
                    การสนับสนุนนี้เป็นการให้โดยเสน่หา
                    **ไม่สามารถขอคืนเงินได้ทุกกรณี (Non-Refundable)**
                  </p>

                  <button
                    type="button"
                    onClick={() => setIsTosExpanded(!isTosExpanded())}
                    class="text-left font-bold underline cursor-pointer focus:outline-none flex items-center gap-1 py-0.5"
                    style={{ color: "#111111" }}
                  >
                    <span>
                      {isTosExpanded()
                        ? "🔼 ซ่อนรายละเอียดกฎหมาย"
                        : "🔽 อ่านข้อตกลงและนโยบายความเป็นส่วนตัวเพิ่มเติม"}
                    </span>
                  </button>

                  <Show when={isTosExpanded()}>
                    <div class="mt-1 p-3 rounded-lg border border-slate-200 bg-white/80 space-y-1.5 max-h-[80px] overflow-y-auto leading-normal text-slate-600 transition-all duration-300">
                      <p>
                        <strong>1. นโยบายการไม่คืนเงิน</strong>
                        <br />
                        ยอดเงินสนับสนุนทั้งหมดไม่สามารถขอคืนเงินหรือปฏิเสธจ่ายคืน
                        (Chargeback) ได้ภายหลัง
                      </p>
                      <p>
                        <strong>2. การคุ้มครองข้อมูล (PDPA)</strong>
                        <br />
                        เราจัดเก็บและเผยแพร่ชื่อเล่นรวมถึงข้อความสนับสนุนของท่านตามความยินยอมเพื่อแสดงขึ้นจอไลฟ์สตรีมเท่านั้น
                      </p>
                    </div>
                  </Show>

                  {/* PDPA Compliant Consent */}
                  <label
                    class="flex items-start gap-2 cursor-pointer mt-1 font-bold"
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
                    <span class="text-[10px] leading-tight font-medium opacity-90">
                      ฉันยอมรับข้อตกลงและยินยอมให้ประมวลผลข้อมูลชื่อเล่นและข้อความเพื่อนำไปแสดงผลแจ้งเตือนขึ้นจอไลฟ์สตรีมผ่านบริการภายนอก
                      (Xendit, Streamlabs, StreamElements) 🔒
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
