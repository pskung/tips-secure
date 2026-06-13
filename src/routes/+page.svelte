<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  
  let { data } = $props();
  const theme = data.theme;
  const turnstileSiteKey = data.turnstileSiteKey; // รับคีย์สาธารณะ

  let name = $state('');
  let amount = $state('');
  let message = $state('');
  let loading = $state(false);
  
  let honeypot = $state(''); 
  let renderTime = $state(0);
  let cooldownRemaining = $state(0);

  let customActive = $state(false);
  let customAmountVal = $state('');

  // บันทึก Token ที่ได้จากการผ่านด่าน Turnstile ของคนดูจริง
  let turnstileToken = $state('');

  const config = {
    ...theme,
    bgColor: theme.bgColor ?? '#faf9f6',
    cardBgColor: theme.cardBgColor ?? '#ffffff',
    cardOpacity: theme.cardOpacity ?? 1.0,
    cardBorderColor: theme.cardBorderColor ?? '#f1f5f9',
    cardBorderOpacity: theme.cardBorderOpacity ?? 1.0,
    profileAreaBgColor: theme.profileAreaBgColor ?? '#ffffff',
    profileAreaOpacity: theme.profileAreaOpacity ?? 1.0,
    inputBgColor: theme.inputBgColor ?? '#f8fafc',
    inputBgOpacity: theme.inputBgOpacity ?? 1.0,
    inputBorderColor: theme.inputBorderColor ?? '#e2e8f0',
    vtuberName: theme.vtuberName ?? 'VTuber Channel',
    nameColor: theme.nameColor ?? '#d89a9e',
    welcomeColor: theme.welcomeColor ?? '#475569',
    labelColor: theme.labelColor ?? '#475569',
    placeholderColor: theme.placeholderColor ?? '#94a3b8',
    mainFontFamily: theme.mainFontFamily ?? 'Mitr',
    welcomeText: theme.welcomeText ?? 'ยินดีต้อนรับสู่ช่องสนับสนุนสตรีมเมอร์ค่ะ 💖',
    nicknamePlaceholder: theme.nicknamePlaceholder ?? 'พิมพ์ชื่อเล่นที่นี่...',
    messagePlaceholder: theme.messagePlaceholder ?? 'พิมพ์ข้อความให้สตรีมเมอร์ชื่นใจ...',
    amountPlaceholder: theme.amountPlaceholder ?? 'ป้อนจำนวนเงิน (10 - 5,000 บาท)...',
    presetAmounts: theme.presetAmounts && theme.presetAmounts.length === 4 ? theme.presetAmounts : [100, 300, 500, 1000],
    presetBtnColor: theme.presetBtnColor ?? '#f8fafc',
    presetBorderColor: theme.presetBorderColor ?? '#cbd5e1',
    submitBtnColor: theme.submitBtnColor ?? '#d89a9e',
    submitBtnTextColor: theme.submitBtnTextColor ?? '#ffffff',
    submitBtnText: theme.submitBtnText ?? 'ขอบคุณสำหรับการสนับสนุนน้า'
  };

  const uniqueFonts = $derived([
    ...new Set([config.mainFontFamily, config.placeholderFontFamily].filter(f => f && f.trim() !== '' && f.toLowerCase() !== 'sans-serif'))
  ]);

  const hexToRgba = (hex: string, opacity: number): string => {
    if (!hex) return `rgba(255, 255, 255, ${opacity})`;
    const cleanHex = hex.replace('#', '');
    if (cleanHex.length !== 6) return hex;
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  const sanitizeUrl = (url: string | undefined): string => {
    if (!url) return '';
    const cleanUrl = url.trim();
    if (cleanUrl.match(/^https?:\/\/[^\s$.?#].[^\s]*$/i)) return cleanUrl;
    return '';
  };

  onMount(() => {
    if (!browser) return;
    renderTime = Date.now();
    
    if (config.presetAmounts.length > 0) {
      amount = String(config.presetAmounts[0]);
    }

    const lastRequest = localStorage.getItem('last_donate_request');
    if (lastRequest) {
      const elapsed = Date.now() - Number(lastRequest);
      if (elapsed < 30000) cooldownRemaining = Math.ceil((30000 - elapsed) / 1000);
    }

    // ผูกคำสั่ง Callback รับโทเค็นความปลอดภัยของคนดูจริงเข้ากับ Window ของหน้าจอ
    (window as any).onTurnstileSuccess = (token: string) => {
      turnstileToken = token;
    };
  });

  $effect(() => {
    if (cooldownRemaining > 0) {
      const timer = setTimeout(() => { cooldownRemaining -= 1; }, 1000);
      return () => clearTimeout(timer);
    }
  });

  const handleDonate = async (e: Event) => {
    e.preventDefault();
    if (cooldownRemaining > 0) return;
    
    // บังคับสแกน Turnstile ก่อนผ่านด่านหลังบ้าน
    if (turnstileSiteKey && !turnstileToken) {
      alert('กรุณารอระบบตรวจสอบความเป็นมนุษย์สักครู่น้า 🔒');
      return;
    }
    
    loading = true;

    try {
      const res = await fetch('/api/donate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          amount: Number(amount),
          message,
          email_confirm: honeypot,
          render_time: renderTime,
          turnstile_token: turnstileToken // ส่งตั๋วสแกนเข้าหลังบ้าน
        }),
      });

      const data = await res.json();
      if (res.ok && data.invoice_url) {
        localStorage.setItem('last_donate_request', String(Date.now()));
        window.location.href = data.invoice_url;
      } else {
        alert(data.error || 'เกิดข้อขัดข้องชั่วคราวในการขอชำระเงินค่ะ');
        loading = false;
        // รีเซ็ตรหัสผ่านสแกนหากทำรายการไม่สำเร็จ
        if (typeof (window as any).turnstile !== 'undefined') {
          (window as any).turnstile.reset();
          turnstileToken = '';
        }
      }
    } catch (err) {
      alert('ระบบชำระเงินขัดข้องชั่วคราวค่ะ');
      loading = false;
    }
  };
</script>

<svelte:head>
  <title>สนับสนุน {config.vtuberName} 💖</title>
  {#each uniqueFonts as font}
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family={font.trim().replace(/\s+/g, '+')}:wght@400;500;700&display=swap" />
  {/each}
  <!-- ดึงสคริปต์สแกนตรวจสอบสากลจาก Cloudflare (ฟรี 100% บนทุกซับโดเมน) -->
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
</svelte:head>

<main 
  class="flex min-h-screen flex-col relative transition-all duration-700 select-none overflow-x-hidden pb-8"
  style="
    background-image: {config.bgType === 'image' && config.bgUrl ? `url(${config.bgUrl})` : 'none'}; 
    background-color: {config.bgColor};
    font-family: '{config.mainFontFamily}', sans-serif;
  "
>
  <div class="absolute inset-0 bg-black/5 -z-10"></div>

  <!-- 1. ส่วนแบนเนอร์ด้านบนสุด -->
  <div class="w-full h-24 sm:h-28 bg-cover bg-center relative" style="background-image: url({config.bannerUrl || 'https://placehold.co/1200x200'});">
    <div class="absolute inset-0 bg-black/5"></div>
  </div>

  <!-- 2. แถบโปรไฟล์และชื่อ VTuber -->
  <div class="w-full border-b" style="background-color: {hexToRgba(config.profileAreaBgColor, config.profileAreaOpacity)}; border-color: {hexToRgba(config.cardBorderColor, config.cardBorderOpacity)};">
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-center sm:items-center gap-4 relative">
      <div class="sm:absolute sm:-top-12 left-4 sm:left-6 lg:left-8 flex-shrink-0 z-20">
        <img src={sanitizeUrl(config.avatarUrl) || 'https://placehold.co/150'} alt="Avatar" class="w-20 h-20 rounded-full border-4 object-cover shadow-md" style="border-color: {config.profileAreaBgColor};" />
      </div>
      <div class="sm:pl-28 text-center sm:text-left flex-1 min-h-[3rem] flex flex-col justify-center">
        <h1 class="text-xl font-extrabold tracking-wide" style="color: {config.nameColor};">
          {config.vtuberName}
        </h1>
      </div>
    </div>
  </div>

  <!-- 3. ส่วนกล่องแสดงผลหลักแบ่งเป็น 2 คอลัมน์ -->
  <div class="max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 flex-1 flex flex-col justify-center">
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      
      <!-- ฝั่งซ้าย: แสดงรายละเอียดทักทาย -->
      <div class="lg:col-span-7 space-y-4">
        <div 
          class="p-5 sm:p-6 rounded-2xl border shadow-sm"
          style="
            background-color: {hexToRgba(config.cardBgColor, config.cardOpacity)};
            border-color: {hexToRgba(config.cardBorderColor, config.cardBorderOpacity)};
            backdrop-filter: blur({config.cardBlur}px);
          "
        >
          <div class="space-y-2">
            <p class="text-xs sm:text-sm leading-relaxed" style="color: {config.welcomeColor};">
              {config.welcomeText}
            </p>
          </div>
        </div>

        <!-- ปุ่มโซเชียลมีเดีย -->
        <div class="flex flex-wrap gap-2">
          {#each config.socialLinks || [] as link}
            {#if link.url}
              <a href={link.url} target="_blank" rel="noopener noreferrer" class="px-3.5 py-1.5 rounded-full border transition-all hover:scale-105 flex items-center gap-2 bg-white/40 text-[10px] font-bold uppercase shadow-sm" style="border-color: {config.socialColor}; color: {config.socialColor};">
                <span>{link.platform}</span>
              </a>
            {/if}
          {/each}
        </div>
      </div>

      <!-- ฝั่งขวา: การ์ดชำระเงินมินิมอลพาสเทล -->
      <div class="lg:col-span-5">
        <form 
          onsubmit={handleDonate} 
          class="p-5 sm:p-6 rounded-2xl border shadow-md space-y-3.5 relative overflow-hidden"
          style="
            background-color: {hexToRgba(config.cardBgColor, config.cardOpacity)};
            border-color: {hexToRgba(config.cardBorderColor, config.cardBorderOpacity)};
            backdrop-filter: blur({config.cardBlur}px);
            --placeholder-color: {config.placeholderColor};
            --placeholder-font: '{config.mainFontFamily}', sans-serif;
          "
        >
          <div class="hidden">
            <input type="text" name="email_confirm" bind:value={honeypot} tabindex="-1" autocomplete="off" />
          </div>

          <div class="space-y-3.5">
            <div class="grid grid-cols-4 gap-1.5">
              {#each config.presetAmounts as amt}
                <button 
                  type="button" 
                  onclick={() => { amount = String(amt); customActive = false; }} 
                  class="py-2 text-xs font-extrabold border rounded-lg transition-all duration-200 cursor-pointer shadow-sm" 
                  style="
                    background-color: {!customActive && amount === String(amt) ? config.submitBtnColor : config.presetBtnColor}; 
                    border-color: {!customActive && amount === String(amt) ? config.submitBtnColor : config.presetBorderColor}; 
                    color: {!customActive && amount === String(amt) ? config.submitBtnTextColor : '#475569'};
                  "
                >
                  {amt}฿
                </button>
              {/each}
            </div>

            <input 
              id="custom-amount" 
              type="number" 
              min="10"
              max="5000"
              placeholder={config.amountPlaceholder}
              class="w-full px-3 py-2 rounded-lg text-slate-800 placeholder-slate-400 text-xs font-bold transition-all focus:outline-none focus:ring-1 border shadow-sm" 
              style="background-color: {config.inputBgColor}; border-color: {config.inputBorderColor}; --tw-ring-color: {config.submitBtnColor};" 
              oninput={(e) => { 
                customActive = true; 
                amount = e.currentTarget.value; 
                customAmountVal = e.currentTarget.value;
              }}
              bind:value={customAmountVal}
            />
          </div>

          <input 
            id="nickname" 
            type="text" 
            required 
            placeholder={config.nicknamePlaceholder} 
            class="w-full px-3 py-2.5 rounded-lg text-slate-800 placeholder-slate-400 text-xs transition-all focus:outline-none focus:ring-1 border shadow-sm" 
            style="background-color: {config.inputBgColor}; border-color: {config.inputBorderColor}; --tw-ring-color: {config.submitBtnColor};" 
            bind:value={name} 
          />

          <textarea 
            id="donor-msg" 
            placeholder={config.messagePlaceholder} 
            class="w-full px-3 py-2.5 rounded-lg text-slate-800 placeholder-slate-400 text-xs transition-all focus:outline-none focus:ring-1 border shadow-sm" 
            rows="2" 
            style="background-color: {config.inputBgColor}; border-color: {config.inputBorderColor}; --tw-ring-color: {config.submitBtnColor};" 
            bind:value={message}
          ></textarea>

          <!-- 🔒 กล่อง Turnstile แบบมินิมอลไร้ภาพกวนใจ (ทำงานฟรี 100% บน .pages.dev) -->
          {#if turnstileSiteKey}
            <div class="flex justify-center py-1">
              <div 
                class="cf-turnstile" 
                data-sitekey={turnstileSiteKey}
                data-callback="onTurnstileSuccess"
                data-theme="light"
                data-size="compact"
              ></div>
            </div>
          {/if}

          <div class="pt-1">
            <button
              type="submit"
              disabled={loading || cooldownRemaining > 0 || (turnstileSiteKey !== '' && !turnstileToken)}
              class="w-full py-3 text-xs sm:text-sm font-black rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] shadow-sm disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed tracking-wider uppercase"
              style="
                background-color: {cooldownRemaining > 0 ? '#64748b' : config.submitBtnColor}; 
                color: {config.submitBtnTextColor || '#ffffff'};
              "
            >
              {#if cooldownRemaining > 0}
                กรุณารออีก {cooldownRemaining} วินาทีน้า ⏳
              {:else if loading}
                กำลังขอคิวอาร์พร้อมเพย์...
              {:else}
                {config.submitBtnText}
              {/if}
            </button>
          </div>
        </form>
      </div>

    </div>
  </div>
</main>

<style>
  input::placeholder, textarea::placeholder {
    color: var(--placeholder-color) !important;
    font-family: var(--placeholder-font) !important;
    opacity: 0.8 !important;
  }
</style>
