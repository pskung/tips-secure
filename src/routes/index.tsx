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

// 🟢 ฟังก์ชันจัดทำดีไซน์ชุดไอคอนโซเชียลแบบละเอียดไร้ Dependency (Embedded SVG Icons Helper)
function getSocialIcon(platform: string) {
  const p = platform.toLowerCase();
  if (p.includes("youtube")) {
    return (
      <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.516 0-9.387.507a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.871.507 9.388.507 9.388.507s7.517 0 9.389-.507a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    );
  }
  if (p.includes("twitch")) {
    return (
      <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
      </svg>
    );
  }
  if (p.includes("twitter") || p === "x") {
    return (
      <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    );
  }
  // ไอคอนลิงก์ทั่วไป (Generic URL Icon)
  return (
    <svg
      class="w-5 h-5 stroke-current fill-none"
      viewBox="0 0 24 24"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

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
      welcomeText: theme.welcomeText ?? "Welcome to my support page! 💖",
      nicknamePlaceholder: theme.nicknamePlaceholder ?? "Your nickname...",
      messagePlaceholder: theme.messagePlaceholder ?? "Write a message...",
      amountPlaceholder:
        theme.amountPlaceholder ?? "Amount (10 - 5,000 THB)...",
      presetAmounts:
        theme.presetAmounts && theme.presetAmounts.length === 4
          ? theme.presetAmounts
          : [100, 300, 500, 1000],
      presetBtnColor: theme.presetBtnColor ?? "#ffffff",
      presetBorderColor: theme.presetBorderColor ?? "#e4e4e4",
      submitBtnColor: theme.submitBtnColor ?? "#ffdd00",
      submitBtnTextColor: theme.submitBtnTextColor ?? "#000000",
      submitBtnText: theme.submitBtnText ?? "SUPPORT ME",
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
      alert("Please complete the security challenge first 🔒");
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
        alert(resData.error || "A temporary payment error occurred.");
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
      alert("Payment system is temporarily unavailable.");
      setLoading(false);
    }
  };

  return (
    <>
      <Title>Support {config().vtuberName} 💖</Title>
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

        {/* 🟢 Banner Zone: z-0 และความสูงสอดรับกันอย่างลงตัว */}
        <div
          class="w-full h-36 sm:h-44 md:h-52 lg:h-56 bg-cover bg-center relative flex-shrink-0 border-b shadow-xs z-0"
          style={{
            "background-image": `url(${config().bannerUrl || "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=1600&auto=format&fit=crop"})`,
            "border-color": config().cardBorderColor,
          }}
        >
          <div class="absolute inset-0 bg-black/4"></div>
        </div>

        {/* 🟢 Content Area Wrapper: ยกกล่องหลักพาดทับแบนเนอร์เชิงมิติอย่างชัดเจนด้วย z-10 */}
        <div class="max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 flex-1 flex flex-col justify-start relative z-10">
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start -mt-10 md:-mt-16 lg:-mt-24">
            {/* 🟢 COLUMN 1 (ฝั่งซ้าย - โซน About กว้างกว่าเดิมเป็น col-span-7) */}
            <div class="lg:col-span-7 space-y-4 flex flex-col w-full">
              <div
                class="p-5 sm:p-6 rounded-3xl border shadow-md bg-white flex flex-col space-y-4 text-left"
                style={{ "border-color": config().cardBorderColor }}
              >
                {/* 🟢 โปรไฟล์หลัก: ปรับรูป Avatar ให้ขยายใหญ่ขึ้น 10-25% (w-16 h-16 ขยายเป็น sm:w-20 sm:h-20) */}
                <div class="flex items-center gap-4 w-full">
                  <div class="flex-shrink-0">
                    <img
                      src={
                        sanitizeUrl(config().avatarUrl) ||
                        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop"
                      }
                      alt="Avatar"
                      class="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-white shadow-xs object-cover"
                    />
                  </div>
                  <div class="space-y-1.5 min-w-0 flex-1">
                    <h1
                      class="text-xl sm:text-2xl font-black tracking-tight truncate"
                      style={{ color: config().nameColor }}
                    >
                      {config().vtuberName}
                    </h1>

                    {/* 🟢 ย้าย Youtube / Twitch มาอยู่ใต้ชื่อช่องเป็นรูป Inline SVG Icons ที่หรูหรากระชับ */}
                    <div class="flex items-center gap-2 pt-0.5">
                      <For each={config().socialLinks || []}>
                        {(link) => (
                          <Show when={link.url}>
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              class="p-1 rounded-lg transition-colors hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-slate-900"
                              title={link.platform}
                            >
                              {getSocialIcon(link.platform)}
                            </a>
                          </Show>
                        )}
                      </For>
                    </div>
                  </div>
                </div>

                <div
                  class="border-t w-full"
                  style={{ "border-color": config().cardBorderColor }}
                ></div>

                {/* กล่องประวัติ About */}
                <div>
                  <h2
                    class="text-xs font-black uppercase tracking-widest mb-2"
                    style={{ color: config().nameColor }}
                  >
                    About {config().vtuberName}
                  </h2>
                  <p
                    class="text-xs sm:text-sm leading-relaxed whitespace-pre-line"
                    style={{ color: config().welcomeColor }}
                  >
                    {config().welcomeText}
                  </p>
                </div>
              </div>
            </div>

            {/* 🟢 COLUMN 2 (ฝั่งขวา - ช่องกรอกข้อมูลโดเนทกว้างพอดีที่ max-w-[340px] สำหรับ Cloudflare Widget) */}
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

                {/* ฟิลด์กรอกจำนวนเงิน */}
                <div class="space-y-3">
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
                    Amount
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
                  Nickname
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
                  Message
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

                {/* 🟢 โซน TOS & PDPA ฉบับกระชับพิเศษ: มีเพียงแถบเลื่อนและปุ่มยินยอมที่จัดเรียงระนาบแนวนอนได้อย่างสมบูรณ์แบบไม่เบี้ยว */}
                <div class="space-y-2">
                  {/* แถบเลื่อนขยาย TOS */}
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
                    <span>📜 View Terms & Privacy Policy (TOS & PDPA)</span>
                    <span class="text-[8px]">
                      {isTosExpanded() ? "▲" : "▼"}
                    </span>
                  </button>

                  <Show when={isTosExpanded()}>
                    <div class="p-2.5 rounded-xl border bg-white space-y-1.5 max-h-[75px] overflow-y-auto leading-relaxed text-[9px] text-slate-600 transition-all duration-300">
                      <p>
                        <strong>1. Non-Refundable:</strong> All support is
                        voluntary and non-refundable.
                      </p>
                      <p>
                        <strong>2. Live Alerts:</strong> We display your
                        nickname and message on stream based on your consent.
                      </p>
                    </div>
                  </Show>

                  {/* 🟢 ช่องกดยอมรับแบบจัดตำแหน่ง Alignment สมบูรณ์ด้วย items-center และ leading-none */}
                  <label
                    class="flex items-center gap-2.5 cursor-pointer text-[9px] leading-none font-bold"
                    style={{ color: config().welcomeColor }}
                  >
                    <input
                      type="checkbox"
                      checked={isConsented()}
                      onChange={(e) => setIsConsented(e.currentTarget.checked)}
                      required
                      class="w-3.5 h-3.5 rounded border border-slate-300 flex-shrink-0 cursor-pointer"
                      style={{ "accent-color": config().submitBtnColor }}
                    />
                    <span class="opacity-90 select-none">
                      I agree to show my support on the live stream 🔒
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
                      Wait {cooldownRemaining()}s... ⏳
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
        Generating QR Code...
      </Show>
    );
  }
}
