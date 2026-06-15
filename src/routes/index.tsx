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

// ⚡ ตรรกะฝั่งเซิร์ฟเวอร์: แคชสด 5 วินาที ดึงเบื้องหลัง 7 วินาที
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

// ฟังก์ชันจัดทำดีไซน์ชุดไอคอนโซเชียลแบบละเอียดไร้ Dependency
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
  const [isTosExpanded, setIsTosExpanded] = createSignal(false);

  let turnstileWidgetId: string | null = null;

  const config = createMemo(() => {
    const theme = data()?.theme || {};
    return {
      ...theme,
      bgColor: theme.bgColor ?? "#FFFDF6",
      inputBgColor: theme.inputBgColor ?? "#f4f4f5",
      inputTextColor: theme.inputTextColor ?? "#111111",
      inputBorderColor: theme.inputBorderColor ?? "#e4e4e4",
      cardBorderColor: theme.cardBorderColor ?? "#e4e4e4",
      cardBgColor: theme.cardBgColor ?? "#ffffff",
      vtuberName: theme.vtuberName ?? "Teacher Stefano",
      nameColor: theme.nameColor ?? "#111111",
      generalTextColor: theme.generalTextColor ?? "#222222",
      mainFontFamily: theme.mainFontFamily ?? "Kanit",
      welcomeText: theme.welcomeText ?? "Welcome to my support page! 💖",
      nicknamePlaceholder: theme.nicknamePlaceholder ?? "Your nickname...",
      messagePlaceholder: theme.messagePlaceholder ?? "Write a message...",
      amountPlaceholder: theme.amountPlaceholder ?? "Min 10 THB...",
      presetAmounts:
        theme.presetAmounts && theme.presetAmounts.length === 4
          ? theme.presetAmounts
          : [100, 300, 500, 1000],
      presetBorderColor: theme.presetBorderColor ?? "#e4e4e4",
      submitBtnColor: theme.submitBtnColor ?? "#ffdd00",
      submitBtnTextColor: theme.submitBtnTextColor ?? "#000000",
      submitBtnText: theme.submitBtnText ?? "AGREE & SUPPORT ME",
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
    setAmount("");
    setCustomAmountVal("");

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
    if (cooldownRemaining() > 0) return;

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
          is_consented: true,
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

        {/* Banner Zone */}
        <div
          class="w-full h-36 sm:h-44 md:h-52 lg:h-56 bg-cover bg-center relative flex-shrink-0 border-b shadow-xs z-0"
          style={{
            "background-image": `url(${config().bannerUrl || "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=1600&auto=format&fit=crop"})`,
            "border-color": config().cardBorderColor,
          }}
        >
          <div class="absolute inset-0 bg-black/4"></div>
        </div>

        {/* Content Area Wrapper */}
        <div class="max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 flex-1 flex flex-col justify-start relative z-10">
          <div class="flex flex-col lg:flex-row gap-6 items-start -mt-10 md:-mt-16 lg:-mt-24 w-full">
            {/* COLUMN 1 (About - Left Side) */}
            <div class="flex-1 w-full space-y-4 flex flex-col">
              <div
                class="p-5 sm:p-6 rounded-3xl border shadow-md flex flex-col space-y-4 text-left"
                style={{
                  "border-color": config().cardBorderColor,
                  "background-color": config().cardBgColor,
                }}
              >
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

                    <div class="flex items-center gap-2 pt-0.5">
                      <For each={config().socialLinks || []}>
                        {(link) => (
                          <Show when={link.url}>
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              class="p-1 rounded-lg transition-colors hover:bg-black/5 flex items-center justify-center"
                              style={{ color: config().generalTextColor }}
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

                <div>
                  <h2
                    class="text-xs font-black uppercase tracking-widest mb-2"
                    style={{ color: config().generalTextColor }}
                  >
                    About {config().vtuberName}
                  </h2>
                  <p
                    class="text-xs sm:text-sm leading-relaxed whitespace-pre-line"
                    style={{ color: config().generalTextColor }}
                  >
                    {config().welcomeText}
                  </p>
                </div>
              </div>
            </div>

            {/* COLUMN 2 (Donation Panel - Right Side) */}
            <div class="w-full lg:w-[340px] flex-shrink-0">
              <form
                onSubmit={handleDonate}
                class="w-full p-5 sm:p-6 rounded-3xl border shadow-md space-y-3.5 relative overflow-hidden"
                style={{
                  "border-color": config().cardBorderColor,
                  "background-color": config().cardBgColor,
                  // 🟢 ตัวหนังสือคำใบ้ (Placeholder) เปลี่ยนมาผูกกับสีของกล่องกรอกข้อมูล inputTextColor ตามสั่งค่ะ
                  "--placeholder-color": hexToRgba(
                    config().inputTextColor,
                    0.6,
                  ),
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

                {/* ส่วนของ Preset ยอดเงินสนับสนุน */}
                <div class="space-y-3">
                  <div class="grid grid-cols-4 gap-1.5">
                    <For each={config().presetAmounts}>
                      {(amt) => (
                        <button
                          type="button"
                          onClick={() => {
                            setAmount(String(amt));
                            setCustomAmountVal(String(amt));
                            setCustomActive(false);
                          }}
                          class="py-3 text-base font-normal border rounded-xl transition-all duration-200 cursor-pointer shadow-xs"
                          style={{
                            "background-color":
                              !customActive() && amount() === String(amt)
                                ? config().submitBtnColor
                                : config().inputBgColor,
                            "border-color":
                              !customActive() && amount() === String(amt)
                                ? config().submitBtnColor
                                : config().presetBorderColor,
                            // 🟢 เมื่อยังไม่ได้คลิก สีข้อความของปุ่ม Preset จะผูกกับสี inputTextColor ตามสั่งเพื่อความสว่างคมชัดค่ะ
                            color:
                              !customActive() && amount() === String(amt)
                                ? config().submitBtnTextColor
                                : config().inputTextColor,
                          }}
                        >
                          {amt}฿
                        </button>
                      )}
                    </For>
                  </div>

                  <label for="custom-amount" class="sr-only">
                    Amount
                  </label>
                  <input
                    id="custom-amount"
                    type="number"
                    min="10"
                    max="5000"
                    placeholder={config().amountPlaceholder}
                    class="w-full px-4 py-3 rounded-xl text-base font-normal transition-all focus:outline-none focus:ring-1 border shadow-xs placeholder:text-[var(--placeholder-color)] placeholder:font-[var(--placeholder-font)] placeholder:font-normal"
                    style={{
                      "background-color": config().inputBgColor,
                      "border-color": config().inputBorderColor,
                      color: config().inputTextColor,
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

                <label for="nickname" class="sr-only">
                  Nickname
                </label>
                <input
                  id="nickname"
                  type="text"
                  required
                  placeholder={config().nicknamePlaceholder}
                  class="w-full px-4 py-3 rounded-xl text-base font-normal transition-all focus:outline-none focus:ring-1 border shadow-xs placeholder:text-[var(--placeholder-color)] placeholder:font-[var(--placeholder-font)] placeholder:font-normal"
                  style={{
                    "background-color": config().inputBgColor,
                    "border-color": config().inputBorderColor,
                    color: config().inputTextColor,
                    "--tw-ring-color": config().submitBtnColor,
                  }}
                  onInput={(e) => setName(e.currentTarget.value)}
                  value={name()}
                />

                {/* ช่องกรอกข้อความ ยืดหยุ่นดันตัวลงล่างอัตโนมัติ */}
                <div class="relative w-full">
                  <label for="donor-msg" class="sr-only">
                    Message
                  </label>
                  <textarea
                    id="donor-msg"
                    placeholder={config().messagePlaceholder}
                    maxlength={255}
                    class="w-full px-4 py-3 pb-8 rounded-xl text-base font-normal transition-all focus:outline-none focus:ring-1 border shadow-xs placeholder:text-[var(--placeholder-color)] placeholder:font-[var(--placeholder-font)] placeholder:font-normal resize-none overflow-y-hidden min-h-[72px]"
                    rows={2}
                    style={{
                      "background-color": config().inputBgColor,
                      "border-color": config().inputBorderColor,
                      color: config().inputTextColor,
                      "--tw-ring-color": config().submitBtnColor,
                    }}
                    onInput={(e) => {
                      setMessage(e.currentTarget.value);
                      e.currentTarget.style.height = "auto";
                      e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                    }}
                    value={message()}
                  ></textarea>

                  {/* แสดงจำนวนคำคงเหลือเดี่ยวๆ ผูกตามสีของอินพุต inputTextColor ค่ะ */}
                  <div
                    class="absolute bottom-2.5 right-4 text-[10px] select-none"
                    style={{ color: hexToRgba(config().inputTextColor, 0.6) }}
                  >
                    {255 - message().length}
                  </div>
                </div>

                {/* แถบเปิดแสดง TOS */}
                <div class="space-y-2">
                  <button
                    type="button"
                    onClick={() => setIsTosExpanded(!isTosExpanded())}
                    class="w-full py-1.5 px-3 rounded-xl border font-bold text-[9px] flex items-center justify-between cursor-pointer transition-all hover:opacity-90"
                    style={{
                      "background-color": config().inputBgColor,
                      "border-color": config().inputBorderColor,
                      // 🟢 สีข้อความปุ่ม Toggle แถบ TOS เปลี่ยนมาผูกกับสีของกล่องกรอกข้อมูล inputTextColor ตามสั่งค่ะ
                      color: config().inputTextColor,
                    }}
                  >
                    <span>Terms & Privacy Policy (TOS & PDPA)</span>
                    <span class="text-[8px]">
                      {isTosExpanded() ? "▲" : "▼"}
                    </span>
                  </button>

                  <Show when={isTosExpanded()}>
                    <div
                      class="p-2.5 rounded-xl border space-y-1.5 max-h-[75px] overflow-y-auto leading-relaxed text-[9px] transition-all duration-300"
                      style={{
                        "background-color": config().cardBgColor,
                        "border-color": config().cardBorderColor,
                        // 🟢 ข้อความเนื้อหาด้านในเมื่อคลี่ลงมา จะผูกตามสี generalTextColor เสมอค่ะ
                        color: config().generalTextColor,
                      }}
                    >
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

                  <div
                    class="text-[10px] leading-normal text-center px-1"
                    style={{ color: hexToRgba(config().generalTextColor, 0.7) }}
                  >
                    By supporting, you agree to our{" "}
                    <button
                      type="button"
                      onClick={() => setIsTosExpanded(!isTosExpanded())}
                      class="font-bold underline cursor-pointer text-[10px]"
                      style={{ color: config().generalTextColor }}
                    >
                      Terms & Policy
                    </button>
                    .
                  </div>
                </div>

                {/* ปุ่มหลักยินยอมและสนับสนุน */}
                <button
                  type="submit"
                  disabled={
                    loading() ||
                    cooldownRemaining() > 0 ||
                    (data()?.turnstileSiteKey !== "" && !turnstileToken())
                  }
                  class="w-full py-4 text-base font-black rounded-2xl cursor-pointer transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] shadow-xs disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed tracking-wider uppercase"
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

                {/* Cloudflare Turnstile */}
                <Show when={data()?.turnstileSiteKey}>
                  <div
                    id="turnstile-container"
                    class="w-full flex justify-center transition-all duration-300"
                    style={{
                      display: turnstileToken() ? "none" : "flex",
                      "min-height": "65px",
                    }}
                  ></div>
                </Show>
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
