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

const getInitialData = query(async () => {
  "use server";
  const event = getRequestEvent();
  if (event) {
    setHeader(
      event.nativeEvent,
      "Cache-Control",
      "public, max-age=0, s-maxage=5, stale-while-revalidate=5",
    );
  }

  try {
    const store = getStore("donation_store");
    const theme = (await store.get("personalized_theme", {
      type: "json",
    })) as any;

    const mergedTheme = { ...defaultTheme, ...(theme || {}) };

    return {
      theme: mergedTheme,
      turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || "",
    };
  } catch {
    return {
      theme: defaultTheme,
      turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || "",
    };
  }
}, "initialData");

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
  if (p.includes("discord")) {
    return (
      <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.074 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.01-.09-.024-.121-.63-.24-1.224-.534-1.783-.876a.079.079 0 0 1-.008-.13c.12-.09.239-.185.353-.28a.077.077 0 0 1 .081-.011c3.963 1.817 8.27 1.817 12.185 0a.078.078 0 0 1 .082.01c.114.095.233.19.353.281a.078.078 0 0 1-.007.13 12.19 12.19 0 0 1-1.784.877c-.033.013-.044.062-.024.12.355.698.766 1.365 1.225 1.993a.082.082 0 0 0 .085.029 19.9 19.9 0 0 0 6.002-3.03.076.076 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z" />
      </svg>
    );
  }
  if (p.includes("x")) {
    return (
      <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    );
  }
  if (p.includes("facebook")) {
    return (
      <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z" />
      </svg>
    );
  }
  if (p.includes("instagram")) {
    return (
      <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204 0 3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
      </svg>
    );
  }
  if (p.includes("tiktok")) {
    return (
      <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.59 4.23.1.12.2.24.3.35v3.98c-.14-.02-.27-.06-.41-.09-1.2-.28-2.28-.97-3.04-1.92-.04-.05-.07-.11-.12-.18v7.22c.04 5.37-4.43 9.42-9.74 8.91-4.04-.39-7.16-3.86-7.14-7.9.03-3.84 2.87-7.07 6.69-7.46.61-.06 1.22-.04 1.83.05v3.94c-.4-.08-.81-.11-1.22-.09-1.85.08-3.34 1.64-3.29 3.51.05 1.84 1.57 3.31 3.42 3.27 1.8-.04 3.23-1.52 3.21-3.32V0c.34.01.67.01 1 .02z" />
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
  const [turnstileReady, setTurnstileReady] = createSignal(false);

  let turnstileWidgetId: string | null = null;

  const config = createMemo(() => {
    const theme = data()?.theme || defaultTheme;
    return {
      ...theme,
      presetAmounts:
        theme.presetAmounts && theme.presetAmounts.length === 4
          ? theme.presetAmounts
          : [100, 300, 500, 1000],
    };
  });

  const socialLinks = createMemo(() => {
    const conf = config();
    return [
      { platform: "youtube", url: conf.youtubeUrl },
      { platform: "twitch", url: conf.twitchUrl },
      { platform: "discord", url: conf.discordUrl },
      { platform: "x", url: conf.xUrl },
      { platform: "facebook", url: conf.facebookUrl },
      { platform: "instagram", url: conf.instagramUrl },
      { platform: "tiktok", url: conf.tiktokUrl },
    ].filter((link) => link.url && link.url.trim() !== "");
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

  const optimizeImage = (
    url: string | undefined,
    width: number,
    quality: number = 70,
  ): string => {
    if (!url) return "";
    const cleanUrl = url.trim();
    if (cleanUrl === "") return "";
    return `/.netlify/images?url=${encodeURIComponent(cleanUrl)}&w=${width}&q=${quality}`;
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
    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get("access_token");
      if (accessToken) {
        sessionStorage.setItem("admin_verified", "true");
        sessionStorage.setItem("admin_jwt", accessToken);
        window.location.href = "/admin";
        return;
      }
    }

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
        setTurnstileReady(true);
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

  createEffect(() => {
    if (typeof document !== "undefined") {
      document.title = `Support ${config().vtuberName}`;
    }
  });

  createEffect(() => {
    const siteKey = data()?.turnstileSiteKey;
    if (siteKey && turnstileReady()) {
      initTurnstile();
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
      <Title>Support {config().vtuberName}</Title>

      <Link
        rel="stylesheet"
        href={`https://fonts.googleapis.com/css2?family=${config().mainFontFamily.trim().replace(/\s+/g, "+")}:wght@400;500;700&display=swap`}
      />
      <style>
        {`
          .custom-font-root,
          .custom-font-root input,
          .custom-font-root textarea,
          .custom-font-root button,
          .custom-font-root select {
            font-family: '${config().mainFontFamily}', sans-serif !important;
          }
        `}
      </style>
      <script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        async
        defer
      ></script>

      <main
        class="custom-font-root flex min-h-screen flex-col relative select-none overflow-x-hidden pb-12 bg-cover bg-center bg-no-repeat bg-fixed"
        style={{
          "background-image":
            config().bgType === "image"
              ? `url(${
                  config().bgUrl
                    ? optimizeImage(config().bgUrl, 1200)
                    : "https://placehold.co/1920x1080/cbd5e1/1e293b?text=Background"
                })`
              : "none",
          "background-color": config().bgColor,
          "font-family": `'${config().mainFontFamily}', sans-serif`,
        }}
      >
        <div class="absolute inset-0 bg-black/2 -z-10"></div>

        <div
          class="w-full h-36 sm:h-44 md:h-52 lg:h-56 bg-cover bg-center relative flex-shrink-0 border-b shadow-xs z-0"
          style={{
            "background-image": `url(${
              config().bannerUrl
                ? optimizeImage(config().bannerUrl, 800)
                : "https://placehold.co/1200x480/e2e8f0/0f172a?text=Banner"
            })`,
            "border-color": config().cardBorderColor,
          }}
        >
          <div class="absolute inset-0 bg-black/4"></div>
        </div>

        <div class="max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 flex-1 flex flex-col justify-start relative z-10">
          <div class="flex flex-col lg:flex-row gap-6 items-start -mt-10 md:-mt-16 lg:-mt-24 w-full">
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
                        config().avatarUrl
                          ? optimizeImage(config().avatarUrl, 120)
                          : "https://placehold.co/300x300/e2e8f0/0f172a?text=Avatar"
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
                      <For each={socialLinks()}>
                        {(link) => (
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="p-1 rounded-lg transition-colors hover:bg-black/5 flex items-center justify-center"
                            style={{ color: config().generalTextColor }}
                            title={link.platform}
                            aria-label={`Visit social channel: ${link.platform}`}
                          >
                            {getSocialIcon(link.platform)}
                          </a>
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

            <div class="w-full lg:w-[340px] flex-shrink-0">
              <form
                onSubmit={handleDonate}
                class="w-full p-5 sm:p-6 rounded-3xl border shadow-md flex flex-col gap-3.5 relative overflow-hidden"
                style={{
                  "border-color": config().cardBorderColor,
                  "background-color": config().cardBgColor,
                  "--placeholder-color": hexToRgba(
                    config().inputTextColor,
                    0.6,
                  ),
                  "--placeholder-font": `'${config().mainFontFamily}', sans-serif`,
                }}
              >
                <input
                  type="text"
                  name="email_confirm"
                  value={honeypot()}
                  onInput={(e) => setHoneypot(e.currentTarget.value)}
                  tabindex={-1}
                  autocomplete="off"
                  class="hidden"
                />

                <div class="flex flex-col gap-2.5">
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
                    step="0.01"
                    placeholder={config().amountPlaceholder}
                    class="w-full px-4 py-3 rounded-xl text-base font-normal transition-all focus:outline-none focus:ring-1 border shadow-xs placeholder:text-[var(--placeholder-color)] placeholder:font-[var(--placeholder-font)] placeholder:font-normal"
                    style={{
                      "background-color": config().inputBgColor,
                      "border-color": config().inputBorderColor,
                      color: config().inputTextColor,
                      "--tw-ring-color": config().submitBtnColor,
                    }}
                    onInput={(e) => {
                      let val = e.currentTarget.value;
                      if (val.includes(".")) {
                        const [intPart, decPart] = val.split(".");
                        if (decPart && decPart.length > 2) {
                          val = `${intPart}.${decPart.substring(0, 2)}`;
                          e.currentTarget.value = val;
                        }
                      }
                      setCustomActive(true);
                      setAmount(val);
                      setCustomAmountVal(val);
                    }}
                    value={customAmountVal()}
                  />
                </div>

                <div class="flex flex-col">
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
                </div>

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

                  <div
                    class="absolute bottom-2.5 right-4 text-[10px] select-none"
                    style={{ color: hexToRgba(config().inputTextColor, 0.6) }}
                  >
                    {255 - message().length}
                  </div>
                </div>

                <div class="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setIsTosExpanded(!isTosExpanded())}
                    class="w-full py-1.5 px-3 rounded-xl border font-bold text-[9px] flex items-center justify-between cursor-pointer transition-all hover:opacity-90"
                    style={{
                      "background-color": config().inputBgColor,
                      "border-color": config().inputBorderColor,
                      color: config().inputTextColor,
                    }}
                    aria-expanded={isTosExpanded()}
                    aria-controls="tos-collapsed-content"
                  >
                    <span>Terms & Privacy Policy</span>
                    <span class="text-[8px]">
                      {isTosExpanded() ? "▲" : "▼"}
                    </span>
                  </button>

                  <Show when={isTosExpanded()}>
                    <div
                      id="tos-collapsed-content"
                      class="p-2.5 rounded-xl border space-y-1.5 max-h-[75px] overflow-y-auto leading-relaxed text-[9px] transition-all duration-300"
                      style={{
                        "background-color": config().cardBgColor,
                        "border-color": config().cardBorderColor,
                        color: config().generalTextColor,
                      }}
                    >
                      <p>
                        <strong>1. Non-Refundable:</strong> All support payments
                        are voluntary and strictly non-refundable.
                      </p>
                      <p>
                        <strong>2. Display Consent:</strong> By submitting, you
                        consent to displaying your nickname and message on the
                        live streaming overlay.
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
                      Terms & Privacy Policy
                    </button>
                    .
                  </div>
                </div>

                <Show when={data()?.turnstileSiteKey}>
                  <div
                    id="turnstile-container"
                    class="w-full flex justify-center transition-all duration-300 py-1"
                    style={{
                      display: turnstileToken() ? "none" : "flex",
                      "min-height": "65px",
                    }}
                  ></div>
                </Show>

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
                    fallback={
                      <Show when={loading()} fallback={config().submitBtnText}>
                        Generating QR Code...
                      </Show>
                    }
                  >
                    Wait {cooldownRemaining()}s... ⏳
                  </Show>
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
