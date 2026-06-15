import { createSignal, createMemo, onMount, createEffect, onCleanup, For, Show } from "solid-js";
import { Title, Link } from "@solidjs/meta";
import { createAsync, query } from "@solidjs/router";
import { getStore } from "@netlify/blobs";
import { getRequestEvent } from "solid-js/web";
import { setHeader } from "vinxi/http";
import defaultTheme from "~/lib/config/theme.json";

// ⚡ ตรรกะฝั่งเซิร์ฟเวอร์: ดึงสไตล์สตรีมเมอร์จากคลาวด์และตั้งค่าระบบเซิร์ฟเวอร์แคช
const getInitialData = query(async () => {
  "use server";
  const event = getRequestEvent();
  if (event) {
    setHeader(event.nativeEvent, "Cache-Control", "public, max-age=0, s-maxage=5");
  }

  try {
    const store = getStore("donation_store");
    const theme = await store.get("vtuber_personalized_theme", { type: "json" });
    return {
      theme: theme || defaultTheme,
      turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || ""
    };
  } catch {
    return {
      theme: defaultTheme,
      turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || ""
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
      bgColor: theme.bgColor ?? "#faf9f6",
      cardBgColor: theme.cardBgColor ?? "#ffffff",
      cardOpacity: theme.cardOpacity ?? 1.0,
      cardBlur: theme.cardBlur ?? 8,
      cardBorderColor: theme.cardBorderColor ?? "#f1f5f9",
      cardBorderOpacity: theme.cardBorderOpacity ?? 1.0,
      profileAreaBgColor: theme.profileAreaBgColor ?? "#ffffff",
      profileAreaOpacity: theme.profileAreaOpacity ?? 1.0,
      inputBgColor: theme.inputBgColor ?? "#f8fafc",
      inputBgOpacity: theme.inputBgOpacity ?? 1.0,
      inputBorderColor: theme.inputBorderColor ?? "#e2e8f0",
      vtuberName: theme.vtuberName ?? "VTuber Channel",
      nameColor: theme.nameColor ?? "#d89a9e",
      welcomeColor: theme.welcomeColor ?? "#475569",
      labelColor: theme.labelColor ?? "#475569",
      placeholderColor: theme.placeholderColor ?? "#94a3b8",
      mainFontFamily: theme.mainFontFamily ?? "Mitr",
      welcomeText: theme.welcomeText ?? "ยินดีต้อนรับสู่ช่องสนับสนุนสตรีมเมอร์ค่ะ 💖",
      nicknamePlaceholder: theme.nicknamePlaceholder ?? "พิมพ์ชื่อเล่นที่นี่...",
      messagePlaceholder: theme.messagePlaceholder ?? "พิมพ์ข้อความให้สตรีมเมอร์ชื่นใจ...",
      amountPlaceholder: theme.amountPlaceholder ?? "ป้อนจำนวนเงิน (10 - 5,000 บาท)...",
      presetAmounts: theme.presetAmounts && theme.presetAmounts.length === 4 ? theme.presetAmounts : [100, 300, 500, 1000],
      presetBtnColor: theme.presetBtnColor ?? "#f8fafc",
      presetBorderColor: theme.presetBorderColor ?? "#cbd5e1",
      submitBtnColor: theme.submitBtnColor ?? "#d89a9e",
      submitBtnTextColor: theme.submitBtnTextColor ?? "#ffffff",
      submitBtnText: theme.submitBtnText ?? "ขอบคุณสำหรับการสนับสนุนน้า"
    };
  });

  const uniqueFonts = createMemo(() => {
    const conf = config();
    return [
      ...new Set([conf.mainFontFamily, conf.placeholderFontFamily].filter((f) => f && f.trim() !== "" && f.toLowerCase() !== "sans-serif"))
    ];
  });

  const hexToRgba = (hex: string, opacity: number): string => {
    if (!hex) return `rgba(255, 255, 255, ${opacity})`;
    let cleanHex = hex.trim().replace("#", "");
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split("").map((char) => char + char).join("");
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

      turnstileWidgetId = (window as any).turnstile.render("#turnstile-container", {
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
        }
      });
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
          is_consented: isConsented()
        })
      });

      const resData = await res.json();
      if (res.ok && resData.invoice_url) {
        localStorage.setItem("last_donate_request", String(Date.now()));
        window.location.href = resData.invoice_url;
      } else {
        alert(resData.error || "เกิดข้อขัดข้องชั่วคราวในการขอชำระเงินค่ะ");
        setLoading(false);

        if (typeof (window as any).turnstile !== "undefined" && turnstileWidgetId) {
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
      <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script>

      <main
        class="flex min-h-screen flex-col relative transition-all duration-700 select-none overflow-x-hidden pb-8 lg:h-screen lg:pb-0 lg:overflow-hidden"
        style={{
          "background-image": config().bgType === "image" && config().bgUrl ? `url(${config().bgUrl})` : "none",
          "background-color": config().bgColor,
          "font-family": `'${config().mainFontFamily}', sans-serif`
        }}
      >
        <div class="absolute inset-0 bg-black/5 -z-10"></div>

        <div
          class="w-full h-20 sm:h-24 lg:h-16 bg-cover bg-center relative flex-shrink-0"
          style={{ "background-image": `url(${config().bannerUrl || "https://placehold.co/1200x200"})` }}
        >
          <div class="absolute inset-0 bg-black/5"></div>
        </div>

        <div
          class="w-full border-b flex-shrink-0"
          style={{
            "background-color": hexToRgba(config().profileAreaBgColor, config().profileAreaOpacity),
            "border-color": hexToRgba(config().cardBorderColor, config().cardBorderOpacity)
          }}
        >
          <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 lg:py-1.5 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 relative">
            <div class="sm:absolute sm:-top-10 left-4 sm:left-6 lg:left-8 flex-shrink-0 z-20">
              <img
                src={sanitizeUrl(config().avatarUrl) || "https://placehold.co/150"}
                alt="Avatar"
                class="w-16 h-16 lg:w-14 lg:h-14 rounded-full border-4 object-cover shadow-md"
                style={{ "border-color": config().profileAreaBgColor }}
              />
            </div>
            <div class="sm:pl-24 lg:pl-20 text-center sm:text-left flex-1 min-h-[2.5rem] flex flex-col justify-center">
              <h1 class="text-lg lg:text-base font-extrabold tracking-wide" style={{ color: config().nameColor }}>
                {config().vtuberName}
              </h1>
            </div>
          </div>
        </div>

        <div class="max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-2 flex-1 flex flex-col justify-center overflow-hidden">
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-center lg:h-full">
            <div class="lg:col-span-6 space-y-3 lg:space-y-2">
              <div
                class="p-4 lg:p-5 rounded-2xl border shadow-sm"
                style={{
                  "background-color": hexToRgba(config().cardBgColor, config().cardOpacity),
                  "border-color": hexToRgba(config().cardBorderColor, config().cardBorderOpacity),
                  "backdrop-filter": `blur(${config().cardBlur}px)`
                }}
              >
                <p class="text-xs sm:text-sm leading-relaxed" style={{ color: config().welcomeColor }}>
                  {config().welcomeText}
                </p>
              </div>

              <div class="flex flex-wrap gap-1.5">
                <For each={config().socialLinks || []}>
                  {(link) => (
                    <Show when={link.url}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="px-3 py-1 rounded-full border transition-all hover:scale-105 flex items-center gap-1.5 bg-white/40 text-[10px] font-bold uppercase shadow-sm"
                        style={{ "border-color": config().socialColor, color: config().socialColor }}
                      >
                        <span>{link.platform}</span>
                      </a>
                    </Show>
                  )}
                </For>
              </div>
            </div>

            <div class="lg:col-span-6 lg:max-h-full lg:overflow-y-auto">
              <form
                onSubmit={handleDonate}
                class="p-4 lg:p-4.5 rounded-2xl border shadow-md space-y-2.5 lg:space-y-2 relative overflow-hidden"
                style={{
                  "background-color": hexToRgba(config().cardBgColor, config().cardOpacity),
                  "border-color": hexToRgba(config().cardBorderColor, config().cardBorderOpacity),
                  "backdrop-filter": `blur(${config().cardBlur}px)`,
                  "--placeholder-color": config().placeholderColor,
                  "--placeholder-font": `'${config().mainFontFamily}', sans-serif`
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

                <div class="space-y-2">
                  <div class="grid grid-cols-4 gap-1.5">
                    <For each={config().presetAmounts}>
                      {(amt) => (
                        <button
                          type="button"
                          onClick={() => {
                            setAmount(String(amt));
                            setCustomActive(false);
                          }}
                          class="py-1.5 text-xs font-extrabold border rounded-lg transition-all duration-200 cursor-pointer shadow-sm"
                          style={{
                            "background-color": !customActive() && amount() === String(amt) ? config().submitBtnColor : config().presetBtnColor,
                            "border-color": !customActive() && amount() === String(amt) ? config().submitBtnColor : config().presetBorderColor,
                            "color": !customActive() && amount() === String(amt) ? config().submitBtnTextColor : "#475569"
                          }}
                        >
                          {amt}฿
                        </button>
                      )}
                    </For>
                  </div>

                  <input
                    id="custom-amount"
                    type="number"
                    min="10"
                    max="5000"
                    placeholder={config().amountPlaceholder}
                    class="w-full px-3 py-1.5 rounded-lg text-slate-800 placeholder-slate-400 text-xs font-bold transition-all focus:outline-none focus:ring-1 border shadow-sm placeholder:text-[var(--placeholder-color)] placeholder:font-[var(--placeholder-font)]"
                    style={{
                      "background-color": config().inputBgColor,
                      "border-color": config().inputBorderColor,
                      "--tw-ring-color": config().submitBtnColor
                    }}
                    onInput={(e) => {
                      setCustomActive(true);
                      setAmount(e.currentTarget.value);
                      setCustomAmountVal(e.currentTarget.value);
                    }}
                    value={customAmountVal()}
                  />
                </div>

                <input
                  id="nickname"
                  type="text"
                  required
                  placeholder={config().nicknamePlaceholder}
                  class="w-full px-3 py-2 rounded-lg text-slate-800 placeholder-slate-400 text-xs transition-all focus:outline-none focus:ring-1 border shadow-sm placeholder:text-[var(--placeholder-color)] placeholder:font-[var(--placeholder-font)]"
                  style={{
                    "background-color": config().inputBgColor,
                    "border-color": config().inputBorderColor,
                    "--tw-ring-color": config().submitBtnColor
                  }}
                  onInput={(e) => setName(e.currentTarget.value)}
                  value={name()}
                />

                <textarea
                  id="donor-msg"
                  placeholder={config().messagePlaceholder}
                  class="w-full px-3 py-2 rounded-lg text-slate-800 placeholder-slate-400 text-xs transition-all focus:outline-none focus:ring-1 border shadow-sm placeholder:text-[var(--placeholder-color)] placeholder:font-[var(--placeholder-font)]"
                  rows={1}
                  style={{
                    "background-color": config().inputBgColor,
                    "border-color": config().inputBorderColor,
                    "--tw-ring-color": config().submitBtnColor
                  }}
                  onInput={(e) => setMessage(e.currentTarget.value)}
                  value={message()}
                ></textarea>

                <div
                  class="p-2.5 rounded-lg border text-[10px] space-y-1 transition-all duration-300"
                  style={{ "background-color": config().inputBgColor, "border-color": config().inputBorderColor }}
                >
                  <p class="font-extrabold" style={{ color: config().welcomeColor }}>📢 ข้อตกลงการสนับสนุน (Terms of Service)</p>
                  <p class="leading-normal opacity-85" style={{ color: config().welcomeColor }}>
                    การสนับสนุนนี้เป็นการให้โดยเสน่หา **ไม่สามารถขอคืนเงินได้ทุกกรณี (Non-Refundable)**
                  </p>

                  <button
                    type="button"
                    onClick={() => setIsTosExpanded(!isTosExpanded())}
                    class="text-left font-bold underline cursor-pointer focus:outline-none flex items-center gap-1 py-0.5"
                    style={{ color: config().submitBtnColor }}
                  >
                    <span>{isTosExpanded() ? "🔼 ซ่อนรายละเอียดกฎหมาย" : "🔽 อ่านข้อตกลงและนโยบายความเป็นส่วนตัวเพิ่มเติม"}</span>
                  </button>

                  <Show when={isTosExpanded()}>
                    <div class="mt-1 p-2 rounded border border-slate-200 bg-white/60 space-y-1.5 max-h-[80px] overflow-y-auto leading-normal text-slate-600 transition-all duration-300">
                      <p><strong>1. นโยบายการไม่คืนเงิน</strong><br />ยอดเงินสนับสนุนทั้งหมดไม่สามารถขอคืนเงินหรือปฏิเสธจ่ายคืน (Chargeback) ได้ภายหลัง</p>
                      <p><strong>2. การคุ้มครองข้อมูล (PDPA)</strong><br />เราจัดเก็บและเผยแพร่ชื่อเล่นรวมถึงข้อความสนับสนุนของท่านตามความยินยอมเพื่อแสดงขึ้นจอไลฟ์สตรีมเท่านั้น</p>
                    </div>
                  </Show>

                  <label class="flex items-center gap-2 cursor-pointer mt-1 font-bold" style={{ color: config().welcomeColor }}>
                    <input
                      type="checkbox"
                      checked={isConsented()}
                      onChange={(e) => setIsConsented(e.currentTarget.checked)}
                      required
                      class="rounded"
                      style={{ "accent-color": config().submitBtnColor }}
                    />
                    <span>ฉันยอมรับข้อตกลงและนโยบายนี้ 🔒</span>
                  </label>
                </div>

                <Show when={data()?.turnstileSiteKey}>
                  <div class="flex justify-center w-full min-h-[65px] transition-all">
                    <div id="turnstile-container" class="w-full flex justify-center"></div>
                  </div>
                </Show>

                <div class="pt-0.5">
                  <button
                    type="submit"
                    disabled={loading() || cooldownRemaining() > 0 || (data()?.turnstileSiteKey !== "" && !turnstileToken()) || !isConsented()}
                    class="w-full py-2.5 text-xs font-black rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] shadow-sm disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed tracking-wider uppercase"
                    style={{
                      "background-color": cooldownRemaining() > 0 ? "#64748b" : config().submitBtnColor,
                      color: config().submitBtnTextColor || "#ffffff"
                    }}
                  >
                    <Show when={cooldownRemaining() > 0} fallback={ShowWhenLoader()}>
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