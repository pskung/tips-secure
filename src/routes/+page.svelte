<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import theme from '$lib/config/theme.json';

  let name = $state('');
  let amount = $state('');
  let message = $state('');
  let loading = $state(false);
  
  let honeypot = $state(''); 
  let renderTime = $state(0);
  let powLoading = $state(true);
  let challengeToken = $state('');
  let clientNonce = $state('');
  let cooldownRemaining = $state(0);

  // ระบบประมวลค่าข้อความเพื่อป้องกันกรณี theme.json เวอร์ชั่นเก่าไม่มีตัวแปรใหม่ (Fallback Config)
  const config = {
    ...theme,
    nicknameLabel: theme.nicknameLabel ?? 'ชื่อเล่นของคุณ',
    nicknamePlaceholder: theme.nicknamePlaceholder ?? 'พิมพ์ชื่อเล่นที่นี่...',
    messageLabel: theme.messageLabel ?? 'ข้อความสนับสนุน',
    messagePlaceholder: theme.messagePlaceholder ?? 'พิมพ์ข้อความให้สตรีมเมอร์ชื่นใจ...',
    presetLabel: theme.presetLabel ?? 'ปุ่มสนับสนุนด่วน',
    amountLabel: theme.amountLabel ?? 'ระบุจำนวนเงินเอง (บาท)',
    amountPlaceholder: theme.amountPlaceholder ?? 'ป้อนจำนวนเงิน (10 - 5,000 บาท)...',
    submitBtnText: theme.submitBtnText ?? 'โดเนทสนับสนุน 💖',
    submitBtnColor: theme.submitBtnColor ?? '#db2777',
    submitBtnTextColor: theme.submitBtnTextColor ?? '#ffffff'
  };

  const uniqueFonts = $derived([
    ...new Set([
      config.nameFontFamily,
      config.welcomeFontFamily,
      config.labelFontFamily,
      config.presetFontFamily,
      config.submitBtnFontFamily,
      config.placeholderFontFamily
    ].filter(f => f && f.trim() !== '' && f.toLowerCase() !== 'sans-serif'))
  ]);

  const hexToRgba = (hex: string, opacity: number): string => {
    if (!hex) return `rgba(15, 23, 42, ${opacity})`;
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

  async function solveMicroPoW(token: string, difficulty: number): Promise<string> {
    let nonce = 0;
    const prefix = '0'.repeat(difficulty);
    const encoder = new TextEncoder();
    while (true) {
      const data = encoder.encode(`${token}_${nonce}`);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      if (hashHex.startsWith(prefix)) return String(nonce);
      nonce++;
    }
  }

  onMount(async () => {
    if (!browser) return;
    renderTime = Date.now();
    
    const lastRequest = localStorage.getItem('last_donate_request');
    if (lastRequest) {
      const elapsed = Date.now() - Number(lastRequest);
      if (elapsed < 30000) cooldownRemaining = Math.ceil((30000 - elapsed) / 1000);
    }

    const array = new Uint8Array(8);
    window.crypto.getRandomValues(array);
    const clientFp = 'fp_' + Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    
    try {
      const res = await fetch('/api/handshake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fingerprint: clientFp })
      });
      const data = await res.json();
      if (data.token) {
        challengeToken = data.token;
        clientNonce = await solveMicroPoW(data.token, 3);
        powLoading = false;
      }
    } catch (err) {
      console.error('Secure initialization protocol error', err);
    }
  });

  $effect(() => {
    if (cooldownRemaining > 0) {
      const timer = setTimeout(() => { cooldownRemaining -= 1; }, 1000);
      return () => clearTimeout(timer);
    }
  });

  const handleDonate = async (e: Event) => {
    e.preventDefault();
    if (powLoading || !challengeToken || cooldownRemaining > 0) return;
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
          token: challengeToken,
          client_nonce: clientNonce
        }),
      });

      const data = await res.json();
      if (res.ok && data.invoice_url) {
        localStorage.setItem('last_donate_request', String(Date.now()));
        window.location.href = data.invoice_url;
      } else {
        alert(data.error || 'เกิดข้อขัดข้องชั่วคราวในการขอรับคิวอาร์สำหรับการโดเนทค่ะ');
        loading = false;
      }
    } catch (err) {
      alert('ระบบชำระเงินขัดข้องชั่วคราวค่ะ');
      loading = false;
    }
  };
</script>

<svelte:head>
  <title>สนับสนุน {config.vtuberName} 💖 | Secure Tip Gateway</title>
  {#each uniqueFonts as font}
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family={font.trim().replace(/\s+/g, '+')}:wght@400;500;700&display=swap" />
  {/each}
</svelte:head>

<main 
  class="flex min-h-screen flex-col items-center justify-center p-4 bg-cover bg-center bg-no-repeat relative transition-all duration-700"
  style="
    background-image: {config.bgType === 'image' && config.bgUrl ? `url(${config.bgUrl})` : 'none'}; 
    background-color: {config.bgType === 'solid' ? config.bgColor : '#0b0f19'};
  "
>
  <div class="absolute inset-0 bg-slate-950/70 backdrop-blur-[4px] -z-10"></div>

  <form 
    onsubmit={handleDonate} 
    class="w-full max-w-xl p-6 md:p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border relative overflow-hidden space-y-6"
    style="
      background-color: {hexToRgba(config.cardBgColor, config.cardOpacity)};
      border-color: {hexToRgba(config.cardBorderColor, config.cardBorderOpacity)};
      backdrop-filter: blur({config.cardBlur}px);
      --placeholder-color: {config.placeholderColor || '#64748b'};
      --placeholder-font: '{config.placeholderFontFamily || config.welcomeFontFamily}', sans-serif;
    "
  >
    <div class="hidden">
      <input type="text" name="email_confirm" bind:value={honeypot} tabindex="-1" autocomplete="off" />
    </div>

    <div class="relative rounded-2xl overflow-hidden border border-slate-800/30 pb-5 transition-all duration-500" style="background-color: {hexToRgba(config.profileAreaBgColor, config.profileAreaOpacity)};">
      <div class="relative">
        {#if config.bannerUrl}
          <div class="w-full h-52 sm:h-64 bg-cover bg-center opacity-50 transition-all duration-500" style="background-image: url({config.bannerUrl});"></div>
        {:else}
          <div class="w-full h-52 sm:h-64 bg-slate-900 opacity-50"></div>
        {/if}
        <div class="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t" style="background-image: linear-gradient(to top, {hexToRgba(config.profileAreaBgColor, config.profileAreaOpacity)}, transparent);"></div>
      </div>

      <div class="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-5 sm:gap-6 px-6 -mt-3 sm:-mt-4 relative z-10 w-full">
        <div class="relative flex-shrink-0">
          <div class="absolute -inset-1 rounded-full opacity-60 blur-md" style="background-color: {config.nameColor};"></div>
          <img src={sanitizeUrl(config.avatarUrl) || 'https://placehold.co/150'} alt="Avatar" class="relative w-32 h-32 sm:w-36 sm:h-36 rounded-full border-4 border-slate-950 object-cover shadow-2xl" />
        </div>

        <div class="flex-1 pt-1 sm:pt-4 space-y-3">
          <h1 class="text-2xl sm:text-3xl font-extrabold tracking-wide" style="color: {config.nameColor || '#db2777'}; font-family: '{config.nameFontFamily}', sans-serif;">{config.vtuberName}</h1>
          <p class="text-xs sm:text-sm font-medium leading-relaxed" style="color: {config.welcomeColor || '#cbd5e1'}; font-family: '{config.welcomeFontFamily}', sans-serif;">{config.welcomeText}</p>

          <div class="flex flex-wrap justify-center sm:justify-start gap-3 pt-1">
            {#each config.socialLinks || [] as link}
              {#if link.url}
                <a href={link.url} target="_blank" rel="noopener noreferrer" class="p-2 rounded-full border transition-all hover:scale-110 flex items-center justify-center bg-slate-950/40" style="border-color: {config.socialColor || '#db2777'}; color: {config.socialColor || '#db2777'};">
                  <!-- สัญญลักษณ์โซเชียลจะจัดเต็มดึงอัตโนมัติ -->
                  <span class="text-xs font-bold uppercase">{link.platform}</span>
                </a>
              {/if}
            {/each}
          </div>
        </div>
      </div>
    </div>

    <!-- ช่องกรอกชื่อเล่น (ขนาดฟอนต์คุมด้วย Tailwind คลาส) -->
    <div class="space-y-1.5 w-full pt-2">
      <label class="block text-xs sm:text-sm font-bold tracking-wide" for="nickname" style="color: {config.labelColor || '#cbd5e1'}; font-family: '{config.labelFontFamily}', sans-serif;">
        {config.nicknameLabel}
      </label>
      <div class="relative group">
        <input id="nickname" type="text" required placeholder={config.nicknamePlaceholder} class="w-full pl-4 pr-4 py-3 rounded-xl text-white placeholder-slate-500 text-sm sm:text-base tracking-wide transition-all focus:outline-none focus:ring-2 border" style="background-color: {hexToRgba(config.inputBgColor, config.inputBgOpacity)}; border-color: {config.inputBorderColor}; --tw-ring-color: {config.submitBtnColor}; font-family: '{config.welcomeFontFamily}', sans-serif;" bind:value={name} />
      </div>
    </div>

    <!-- ช่องข้อความ -->
    <div class="space-y-1.5 w-full">
      <label class="block text-xs sm:text-sm font-bold tracking-wide" for="donor-msg" style="color: {config.labelColor || '#cbd5e1'}; font-family: '{config.labelFontFamily}', sans-serif;">
        {config.messageLabel}
      </label>
      <div class="relative group">
        <textarea id="donor-msg" placeholder={config.messagePlaceholder} class="w-full pl-4 pr-4 py-3 rounded-xl text-white placeholder-slate-500 text-sm sm:text-base tracking-wide transition-all focus:outline-none focus:ring-2 border" rows="2" style="background-color: {hexToRgba(config.inputBgColor, config.inputBgOpacity)}; border-color: {config.inputBorderColor}; --tw-ring-color: {config.submitBtnColor}; font-family: '{config.welcomeFontFamily}', sans-serif;" bind:value={message}></textarea>
      </div>
    </div>

    <!-- ปุ่มยอดเงินด่วน -->
    <div class="space-y-2 w-full">
      <label class="block text-xs sm:text-sm font-bold tracking-wide" style="color: {config.labelColor || '#cbd5e1'}; font-family: '{config.labelFontFamily}', sans-serif;">
        {config.presetLabel}
      </label>
      <div class="grid grid-cols-4 gap-2">
        {#each config.presetAmounts as amt}
          <button type="button" onclick={() => amount = String(amt)} class="py-2.5 px-1 text-xs sm:text-sm font-extrabold border rounded-xl cursor-pointer tracking-wide transition-all duration-200" style="background-color: {amount === String(amt) ? config.submitBtnColor : config.presetBtnColor}; border-color: {amount === String(amt) ? config.submitBtnColor : config.presetBorderColor}; color: {amount === String(amt) ? config.submitBtnTextColor : '#e2e8f0'}; font-family: '{config.presetFontFamily}', sans-serif;">{amt}฿</button>
        {/each}
      </div>
    </div>

    <!-- ระบุจำนวนเงินเอง -->
    <div class="space-y-1.5 w-full">
      <label class="block text-xs sm:text-sm font-bold tracking-wide" for="custom-amount" style="color: {config.labelColor || '#cbd5e1'}; font-family: '{config.labelFontFamily}', sans-serif;">
        {config.amountLabel}
      </label>
      <div class="relative group">
        <input id="custom-amount" type="number" required min="10" placeholder={config.amountPlaceholder} class="w-full pl-4 pr-4 py-3 rounded-xl text-white placeholder-slate-500 text-sm sm:text-base font-extrabold tracking-wide transition-all focus:outline-none focus:ring-2 border" style="background-color: {hexToRgba(config.inputBgColor, config.inputBgOpacity)}; border-color: {config.inputBorderColor}; --tw-ring-color: {config.submitBtnColor}; font-family: '{config.welcomeFontFamily}', sans-serif;" bind:value={amount} />
      </div>
    </div>

    <!-- ปุ่มโดเนท (ปรับแต่งสีพื้นหลังและตัวอักษรได้เทียบเท่าหน้า Success) -->
    <div class="w-full pt-4">
      <button
        type="submit"
        disabled={loading || powLoading || cooldownRemaining > 0}
        class="w-full py-4 text-sm sm:text-base font-black rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] shadow-lg disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed tracking-wider uppercase"
        style="
          background-color: {cooldownRemaining > 0 ? '#4b5563' : config.submitBtnColor}; 
          color: {config.submitBtnTextColor || '#ffffff'};
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
          font-family: '{config.submitBtnFontFamily}', sans-serif;
        "
      >
        {#if cooldownRemaining > 0}
          กรุณารออีก {cooldownRemaining} วินาทีน้า ⏳
        {:else}
          {#if powLoading}
            กำลังเตรียมเส้นทางปลอดภัย...
          {:else if loading}
            กำลังขอคิวอาร์พร้อมเพย์...
          {:else}
            {config.submitBtnText || 'โดเนทสนับสนุน 💖'}
          {/if}
        {/if}
      </button>
    </div>
  </form>
</main>

<style>
  input::placeholder, textarea::placeholder {
    color: var(--placeholder-color) !important;
    font-family: var(--placeholder-font) !important;
    opacity: 0.8 !important;
  }
</style>
