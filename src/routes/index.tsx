import type { ThemeConfig } from "~/lib/utils/schemas";

interface ThemeResponse {
  theme: ThemeConfig;
  turnstileSiteKey: string;
}

interface DonateResponse {
  invoice_url?: string;
  error?: string;
}

import {
  createSignal,
  createMemo,
  onMount,
  createEffect,
  onCleanup,
  For,
  Show,
} from "solid-js";
import { Title } from "@solidjs/meta";
import defaultTheme from "~/lib/config/theme.json";

function getSocialIcon(platform: string) {
  const p = platform.toLowerCase();
  if (p.includes("youtube")) {
    return (
      <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
        <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.516 0-9.387.507a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.871.507 9.388.507 9.388.507s7.517 0 9.389-.507a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837z" />
      </svg>
    );
  }
  if (p.includes("twitch")) {
    return (
      <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
      </svg>
    );
  }
  if (p.includes("discord")) {
    return (
      <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.074 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.01-.09-.024-.121-.63-.24-1.224-.534-1.783-.876a.079.079 0 0 1-.008-.13c.12-.09.239-.185.353-.28a.077.077 0 0 1 .081-.011c3.963 1.817 8.27 1.817 12.185 0a.078.078 0 0 1 .082.01;c.114.095.233.19.353.281a.078.078 0 0 1-.007.13 12.19 12.19 0 0 1-1.784.877c-.033.013-.044.062-.024.12.355.698.766 1.365 1.225 1.993a.082.082 0 0 0 .085.029 19.9 19.9 0 0 0 6.002-3.03.076.076 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z" />
      </svg>
    );
  }
  if (p.includes("x")) {
    return (
      <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    );
  }
  if (p.includes("facebook")) {
    return (
      <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
        <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z" />
      </svg>
    );
  }
  if (p.includes("instagram")) {
    return (
      <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204 0 3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
      </svg>
    );
  }
  if (p.includes("tiktok")) {
    return (
      <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.59 4.23.1.12.2.24.3.35v3.98c-.14-.02-.27-.06-.41-.09-1.2-.28-2.28-.97-3.04-1.92-.04-.05-.07-.11-.12-.18v7.22c.04 5.37-4.43 9.42-9.74 8.91-4.04-.39-7.16-3.86-7.14-7.9.03-3.84 2.87-7.07 6.69-7.46.61-.06 1.22-.04 1.83.05v3.94c-.4-.08-.81-.11-1.22-.09-1.85.08-3.34 1.64-3.29 3.51.05 1.84 1.57 3.31 3.42 3.27 1.8-.04 3.23-1.52 3.21-3.32V0c.34.01.67.01 1 .02z" />
      </svg>
    );
  }
  return (
    <svg
      class="w-4 h-4 stroke-current fill-none"
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

function SkeletonUI() {
  return (
    <div class="flex min-h-screen flex-col relative select-none overflow-x-hidden pb-6 bg-[#0b0f19] text-slate-400 animate-pulse">
      <div class="w-full h-28 sm:h-36 md:h-40 bg-slate-800/40 border-b border-slate-800 shrink-0"></div>
      <div class="max-w-5xl w-full mx-auto px-4 py-2 flex-1 flex flex-col justify-start relative z-10">
        <div class="flex flex-col lg:flex-row gap-4 items-start -mt-8 sm:-mt-12 md:-mt-16 w-full">
          <div class="flex-1 w-full space-y-3 flex flex-col">
            <div class="p-4 rounded-3xl border border-slate-800 bg-slate-900/50 flex flex-col space-y-3 text-left">
              <div class="flex items-center gap-4 w-full">
                <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-800/60 border border-slate-700 shrink-0"></div>
                <div class="space-y-2 min-w-0 flex-1">
                  <div class="h-5 bg-slate-800/60 rounded-md w-1/3"></div>
                  <div class="flex gap-2">
                    <div class="w-5 h-5 rounded-md bg-slate-800/60"></div>
                    <div class="w-5 h-5 rounded-md bg-slate-800/60"></div>
                  </div>
                </div>
              </div>
              <div class="border-t border-slate-800 w-full"></div>
              <div class="space-y-2">
                <div class="h-3 bg-slate-800/40 rounded-md w-full"></div>
              </div>
            </div>
          </div>
          <div class="w-full lg:w-85 shrink-0">
            <div class="w-full p-4 rounded-3xl border border-slate-800 bg-slate-900/50 flex flex-col gap-3">
              <div class="h-8 bg-slate-800/60 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function hexToRgba(hex: string, opacity: number): string {
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
}

export default function Home() {
  const [themeData, setThemeData] = createSignal<any>(null);
  const [turnstileSiteKey, setTurnstileSiteKey] = createSignal<string>("");
  const [loading, setLoading] = createSignal(true);
  const [actionLoading, setActionLoading] = createSignal(false);

  const [activeTab, setActiveTab] = createSignal<"support" | "leaderboard">(
    "support",
  );
  const [activeModal, setActiveModal] = createSignal<
    "terms" | "refund" | "privacy" | "contact" | null
  >(null);
  const [leaderboard, setLeaderboard] = createSignal<
    { name: string; points: number }[]
  >([]);
  const [leaderboardLoading, setLeaderboardLoading] = createSignal(false);
  const [animateBar, setAnimateBar] = createSignal(false);

  const [name, setName] = createSignal("");
  const [amount, setAmount] = createSignal("");
  const [message, setMessage] = createSignal("");
  const [honeypot, setHoneypot] = createSignal("");
  const [renderTime, setRenderTime] = createSignal(0);
  const [cooldownRemaining, setCooldownRemaining] = createSignal(0);
  const [customActive, setCustomActive] = createSignal(false);
  const [customAmountVal, setCustomAmountVal] = createSignal("");
  const [turnstileToken, setTurnstileToken] = createSignal("");
  const [turnstileReady, setTurnstileReady] = createSignal(false);

  let turnstileWidgetId: string | null = null;

  onMount(async () => {
    setRenderTime(Date.now());
    setAmount("");
    setCustomAmountVal("");

    try {
      const isAdmin = !!sessionStorage.getItem("admin_token");

      const apiUrl = isAdmin
        ? `/api/theme?nocache=${Date.now()}`
        : "/api/theme";

      const res = await fetch(apiUrl);
      if (res.ok) {
        const payload = (await res.json()) as {
          theme: any;
          leaderboard: any[];
          turnstileSiteKey: string;
        };
        setThemeData(payload.theme);
        setTurnstileSiteKey(payload.turnstileSiteKey);

        setLeaderboard(payload.leaderboard || []);
      } else {
        setThemeData(defaultTheme);
      }
    } catch {
      setThemeData(defaultTheme);
    } finally {
      setLoading(false);
    }

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

  const config = createMemo(() => {
    const theme = themeData() || defaultTheme;
    return {
      ...theme,
      presetAmounts:
        theme.presetAmounts && theme.presetAmounts.length === 4
          ? theme.presetAmounts
          : [100, 300, 500, 1000],
    };
  });

  const activeFont = createMemo(() => {
    return (config().mainFontFamily || "Kanit").trim();
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

  const rgbaColors = createMemo(() => {
    const conf = config();
    return {
      inputPlaceholder: hexToRgba(conf.inputTextColor, 0.6),
      generalTextColorFaded: hexToRgba(conf.generalTextColor, 0.7),
      inputFaded: hexToRgba(conf.inputTextColor, 0.1),
      generalTextColorFooter: hexToRgba(conf.generalTextColor, 0.6),
    };
  });

  const initTurnstile = () => {
    if (typeof window === "undefined" || !(window as any).turnstile) return;
    const siteKey = turnstileSiteKey();
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
    const siteKey = turnstileSiteKey();
    if (siteKey && turnstileReady() && activeTab() === "support") {
      initTurnstile();
    }
  });

  const fetchLeaderboard = async () => {
    setAnimateBar(false);
    setTimeout(() => setAnimateBar(true), 120);
  };

  const maxPoints = createMemo(() => {
    const list = leaderboard();
    if (list.length === 0) return 1;
    return Math.max(...list.map((item) => item.points), 1);
  });

  const handleDonate = async (e: Event) => {
    e.preventDefault();
    if (cooldownRemaining() > 0) return;

    if (turnstileSiteKey() && !turnstileToken()) {
      alert("Please complete the security challenge first 🔒");
      return;
    }

    setActionLoading(true);

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

      const resData = (await res.json()) as DonateResponse;
      if (res.ok && resData.invoice_url) {
        localStorage.setItem("last_donate_request", String(Date.now()));
        window.location.href = resData.invoice_url;
      } else {
        alert(resData.error || "A temporary payment error occurred.");
        setActionLoading(false);

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
      setActionLoading(false);
    }
  };

  const modalContent = createMemo(() => ({
    terms: {
      title: "Terms of Service",
      text: `1. Points Purchase System: This portal provides interactive community points for supporting the creator. 1 THB is equivalent to 1 community activity point.
2. Immediate Digital Point Delivery: Points will be instantly credited and displayed on the monthly Leaderboard once your payment is successfully completed. Since all digital goods delivery processes are irreversibly executed at the time of purchase, points acquired cannot be returned, exchanged, or converted into physical cash under any circumstances.
3. Strict Personal Use: Points are strictly intended for stream interactions (such as song requests, voting participation, alert widgets). They hold no physical or monetary cash-out value.
4. Non-transferability: Points are bounded to the username provided during checkout and cannot be merged, sold, or transferred to other accounts.`,
    },
    refund: {
      title: "Refund & Return Policy",
      text: `1. Instant Digital Delivery: Because all points purchased on this portal are digitally rendered and instantly delivered to the active database upon webhook verification, all transactions are final.
2. Non-Refundable Policy: Under any circumstances (including user input errors, changed minds, or internet connection drops on the viewer's side), points purchased are strictly non-refundable and non-returnable.
3. System Discrepancies: If a transaction was processed successfully by the bank but fails to display on stream within 24 hours, please contact the creator immediately via the support email listed in our 'Contact Us' section with your payment receipt for manual validation.`,
    },
    privacy: {
      title: "Privacy & Data Protection Policy (PDPA)",
      text: `1. Information We Collect: To securely facilitate transaction accounting, we collect only your provided nickname, supportive messages, and payment reference numbers.
2. Complete Bank Data Isolation: We DO NOT process, log, or store sensitive credit card or bank account details. All transactions are securely completed through PCI-DSS certified gateway, Beam Checkout.
3. Data Retention and Deletion: In accordance with our privacy values, transaction database records containing nicknames and messages are subject to automatic deletion after 60 days to respect viewer privacy.
4. Third-party Sharing: Your data is never sold, traded, or distributed to any third party under any circumstances.`,
    },
    contact: {
      title: "Contact Us",
      text: `For any inquiries, transaction issues, or business partnerships, please contact the creator team through the channel below:

• Brand/Creator Name: ${config().vtuberName}
• Support & Helpdesk Email: ${config().supportEmail || "support@yourdomain.com"}
• Country of Business: Thailand`,
    },
  }));

  return (
    <Show when={!loading()} fallback={<SkeletonUI />}>
      <Title>Support {config().vtuberName}</Title>

      <style>
        {`
          .custom-font-root,
          .custom-font-root input,
          .custom-font-root textarea,
          .custom-font-root button,
          .custom-font-root select {
            font-family: var(--main-font-family), sans-serif !important;
          }
          .custom-font-root input::placeholder,
          .custom-font-root textarea::placeholder {
            color: var(--placeholder-color) !important;
            font-family: var(--placeholder-font), sans-serif !important;
            font-weight: 400 !important;
          }
        `}
      </style>

      <main
        class="custom-font-root flex min-h-screen flex-col relative select-none overflow-x-hidden pb-2 bg-cover bg-center bg-no-repeat bg-fixed"
        style={{
          "--main-font-family": `'${activeFont()}'`,
          "background-image":
            config().bgType === "image"
              ? `url(${
                  config().bgUrl
                    ? config().bgUrl
                    : "https://placehold.co/1920x1080/cbd5e1/1e293b?text=Background"
                })`
              : "none",
          "background-color": config().bgColor,
        }}
      >
        <div class="absolute inset-0 bg-black/2 -z-10"></div>

        <div
          class="w-full h-28 sm:h-36 md:h-40 bg-cover bg-center relative shrink-0 border-b shadow-xs z-0"
          style={{
            "background-image": `url(${
              config().bannerUrl
                ? config().bannerUrl
                : "https://placehold.co/1920x400/e2e8f0/0f172a?text=Banner"
            })`,
            "border-color": config().cardBorderColor,
          }}
        >
          <div class="absolute inset-0 bg-black/4"></div>
        </div>

        <div class="max-w-5xl w-full mx-auto px-4 py-2 flex-1 flex flex-col justify-start relative z-10">
          <div class="flex flex-col lg:flex-row gap-5 items-start -mt-8 sm:-mt-12 md:-mt-16 w-full">
            <div class="flex-1 w-full space-y-3 flex flex-col">
              <div
                class="p-4 sm:p-5 rounded-3xl border shadow-md flex flex-col space-y-3 text-left"
                style={{
                  "border-color": config().cardBorderColor,
                  "background-color": config().cardBgColor,
                }}
              >
                <div class="flex items-center gap-3 w-full">
                  <div class="shrink-0">
                    <img
                      src={
                        config().avatarUrl
                          ? config().avatarUrl
                          : "https://placehold.co/300x300/e2e8f0/0f172a?text=Avatar"
                      }
                      alt="Avatar"
                      class="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-white shadow-xs object-cover"
                    />
                  </div>
                  <div class="space-y-1 min-w-0 flex-1">
                    <h1
                      class="text-lg sm:text-xl font-black tracking-tight truncate"
                      style={{ color: config().nameColor }}
                    >
                      {config().vtuberName}
                    </h1>

                    <div class="flex items-center gap-1.5">
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
                    class="text-[10px] font-black uppercase tracking-widest mb-1"
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

            <div class="w-full lg:w-85 shrink-0">
              <div
                class="w-full p-4 sm:p-5 rounded-3xl border shadow-md flex flex-col gap-3 relative overflow-hidden"
                style={{
                  "border-color": config().cardBorderColor,
                  "background-color": config().cardBgColor,
                  "--placeholder-color": rgbaColors().inputPlaceholder,
                  "--placeholder-font": `'${activeFont()}'`,
                }}
              >
                <div
                  class="flex border-b pb-1 mb-1 gap-2"
                  style={{ "border-color": config().cardBorderColor }}
                >
                  <button
                    type="button"
                    onClick={() => setActiveTab("support")}
                    class="flex-1 pb-1.5 text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer text-center border-b-2"
                    style={{
                      "border-color":
                        activeTab() === "support"
                          ? config().submitBtnColor
                          : "transparent",
                      color: config().generalTextColor,
                      opacity: activeTab() === "support" ? "1" : "0.5",
                    }}
                  >
                    Support
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("leaderboard");
                      fetchLeaderboard();
                    }}
                    class="flex-1 pb-1.5 text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer text-center border-b-2"
                    style={{
                      "border-color":
                        activeTab() === "leaderboard"
                          ? config().submitBtnColor
                          : "transparent",
                      color: config().generalTextColor,
                      opacity: activeTab() === "leaderboard" ? "1" : "0.5",
                    }}
                  >
                    Leaderboard
                  </button>
                </div>

                <Show when={activeTab() === "support"}>
                  <form onSubmit={handleDonate} class="flex flex-col gap-3">
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
                      <div
                        class="grid grid-cols-4 gap-1.5"
                        role="group"
                        aria-label="Donation preset amounts"
                      >
                        <For each={config().presetAmounts}>
                          {(amt) => (
                            <button
                              type="button"
                              onClick={() => {
                                setAmount(String(amt));
                                setCustomAmountVal(String(amt));
                                setCustomActive(false);
                              }}
                              aria-pressed={
                                !customActive() && amount() === String(amt)
                                  ? "true"
                                  : "false"
                              }
                              aria-label={`Select preset amount of ${amt} Baht`}
                              class="py-2.5 text-sm font-bold border rounded-xl transition-all duration-200 cursor-pointer shadow-xs"
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
                        min={config().minDonationAmount || 10}
                        max="100000"
                        step="1"
                        placeholder={`Min ${config().minDonationAmount || 10} THB...`}
                        class="w-full px-4 py-2.5 rounded-xl text-sm font-bold transition-all focus:outline-none focus:ring-1 border shadow-xs"
                        style={{
                          "background-color": config().inputBgColor,
                          "border-color": config().inputBorderColor,
                          color: config().inputTextColor,
                          "--tw-ring-color": config().submitBtnColor,
                        }}
                        onInput={(e) => {
                          let val = e.currentTarget.value;
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
                        class="w-full px-4 py-2.5 rounded-xl text-sm font-bold transition-all focus:outline-none focus:ring-1 border shadow-xs"
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
                        class="w-full px-4 py-2.5 pb-6 rounded-xl text-sm font-bold transition-all focus:outline-none focus:ring-1 border shadow-xs resize-none overflow-y-hidden min-h-12.5"
                        rows={1}
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
                        class="absolute bottom-1 right-3 text-[9px] select-none"
                        style={{
                          color: rgbaColors().inputPlaceholder,
                        }}
                      >
                        {255 - message().length}
                      </div>
                    </div>

                    <div class="flex flex-col gap-1 text-center px-1">
                      <div
                        class="text-[9px] leading-normal"
                        style={{
                          color: rgbaColors().generalTextColorFaded,
                        }}
                      >
                        By purchasing points, you agree to our standard{" "}
                        <span class="font-black">Terms of Service</span> &{" "}
                        <span class="font-black">Refund Policy</span> listed
                        below.
                      </div>
                    </div>

                    <Show when={turnstileSiteKey()}>
                      <div
                        id="turnstile-container"
                        class="w-full flex justify-center transition-all duration-300 py-0.5"
                        style={{
                          display: turnstileToken() ? "none" : "flex",
                          "min-height": "50px",
                        }}
                      ></div>
                    </Show>

                    <button
                      type="submit"
                      disabled={
                        actionLoading() ||
                        cooldownRemaining() > 0 ||
                        (turnstileSiteKey() !== "" && !turnstileToken())
                      }
                      aria-busy={actionLoading() ? "true" : "false"}
                      class="w-full py-3 text-sm font-black rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] shadow-xs disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed tracking-wider uppercase"
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
                          <Show
                            when={actionLoading()}
                            fallback={config().submitBtnText}
                          >
                            Get Points & Support
                          </Show>
                        }
                      >
                        Wait {cooldownRemaining()}s... ⏳
                      </Show>
                    </button>
                  </form>
                </Show>

                <Show when={activeTab() === "leaderboard"}>
                  <div class="flex flex-col gap-2.5 min-h-45 justify-between">
                    <div>
                      <h3
                        class="text-xs font-black uppercase tracking-wider mb-2"
                        style={{ color: config().generalTextColor }}
                      >
                        Monthly Leaderboard
                      </h3>

                      <Show when={leaderboardLoading()}>
                        <div class="flex flex-col gap-2 py-8 items-center justify-center">
                          <div
                            class="animate-spin rounded-full h-5 w-5 border-b-2"
                            style={{ "border-color": config().submitBtnColor }}
                          ></div>
                          <span
                            class="text-[9px]"
                            style={{ color: config().generalTextColor }}
                          >
                            Loading ranking...
                          </span>
                        </div>
                      </Show>

                      <Show when={!leaderboardLoading()}>
                        <div class="flex flex-col gap-2 max-h-42.5 overflow-y-auto pr-1">
                          <For each={leaderboard()}>
                            {(item, idx) => (
                              <div class="space-y-1">
                                <div class="flex justify-between text-xs font-bold items-center">
                                  <span
                                    class="truncate pr-2"
                                    style={{ color: config().generalTextColor }}
                                  >
                                    {idx() === 0
                                      ? "🥇"
                                      : idx() === 1
                                        ? "🥈"
                                        : idx() === 2
                                          ? "🥉"
                                          : `${idx() + 1}.`}{" "}
                                    {item.name}
                                  </span>
                                  <span
                                    class="font-black text-[11px] whitespace-nowrap"
                                    style={{ color: config().generalTextColor }}
                                  >
                                    {item.points} pts
                                  </span>
                                </div>
                                <div
                                  class="w-full h-1.5 rounded-full overflow-hidden bg-black/5"
                                  style={{
                                    "background-color": rgbaColors().inputFaded,
                                  }}
                                >
                                  <div
                                    class="h-full rounded-full transition-all duration-1000 ease-out"
                                    style={{
                                      width: animateBar()
                                        ? `${Math.max(4, (item.points / maxPoints()) * 100)}%`
                                        : "0%",
                                      "background-color":
                                        config().submitBtnColor,
                                    }}
                                  ></div>
                                </div>
                              </div>
                            )}
                          </For>
                          <Show when={leaderboard().length === 0}>
                            <div
                              class="text-center py-10 text-xs"
                              style={{
                                color: rgbaColors().generalTextColorFooter,
                              }}
                            >
                              No points this month. Support to rank up!
                            </div>
                          </Show>
                        </div>
                      </Show>
                    </div>

                    <div
                      class="border-t pt-2.5 flex flex-col items-center justify-center gap-1"
                      style={{ "border-color": config().cardBorderColor }}
                    >
                      <div
                        class="text-center text-[10px] font-black tracking-widest uppercase flex items-center justify-center gap-1"
                        style={{ color: config().generalTextColor }}
                      >
                        🪙 1 THB = 1 Point
                      </div>
                      <div
                        class="text-[8px] font-bold opacity-60 tracking-wider text-center uppercase"
                        style={{ color: config().generalTextColor }}
                      >
                        Leaderboard resets monthly. Updates daily at 00:00
                        (UTC+7)
                      </div>
                    </div>
                  </div>
                </Show>
              </div>
            </div>
          </div>
        </div>
        <footer
          class="mt-auto pt-4 pb-3 border-t text-center text-[10px] space-y-1.5 z-10"
          style={{
            "border-color": config().cardBorderColor,
            color: rgbaColors().generalTextColorFooter,
          }}
        >
          <div class="flex flex-wrap justify-center gap-x-5 gap-y-1.5">
            <button
              type="button"
              onClick={() => setActiveModal("terms")}
              class="underline cursor-pointer hover:opacity-80 font-bold transition"
            >
              Terms of Service
            </button>
            <button
              type="button"
              onClick={() => setActiveModal("refund")}
              class="underline cursor-pointer hover:opacity-80 font-bold transition"
            >
              Refund Policy
            </button>
            <button
              type="button"
              onClick={() => setActiveModal("privacy")}
              class="underline cursor-pointer hover:opacity-80 font-bold transition"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => setActiveModal("contact")}
              class="underline cursor-pointer hover:opacity-80 font-bold transition"
            >
              Contact Us
            </button>
          </div>
          <p class="text-[9px] tracking-wide">
            © {new Date().getFullYear()} {config().vtuberName} Support Store.
            Powered by Hono & Cloudflare Workers.
          </p>

          <Show when={activeModal()} keyed>
            {(modalType: "terms" | "refund" | "privacy" | "contact") => (
              <div
                class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
                onClick={() => setActiveModal(null)}
              >
                <div
                  class="bg-white text-[#2C2520] border border-slate-200 rounded-3xl p-6 sm:p-7 max-w-md w-full max-h-[75vh] overflow-y-auto shadow-2xl text-left flex flex-col justify-between"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div class="space-y-4">
                    <div class="flex justify-between items-center border-b border-slate-100 pb-3">
                      <h3 class="text-sm font-black uppercase tracking-wider text-slate-800">
                        {modalContent()[modalType].title}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setActiveModal(null)}
                        class="text-slate-400 hover:text-slate-600 font-bold text-base cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <p class="text-xs leading-relaxed text-[#5C4F45] whitespace-pre-line text-left select-text">
                      {modalContent()[modalType].text}
                    </p>
                  </div>

                  <div class="mt-6 border-t border-slate-100 pt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      class="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black rounded-xl cursor-pointer transition shadow-xs uppercase tracking-wider"
                    >
                      Understand & Acknowledge
                    </button>
                  </div>
                </div>
              </div>
            )}
          </Show>
        </footer>
      </main>
    </Show>
  );
}
