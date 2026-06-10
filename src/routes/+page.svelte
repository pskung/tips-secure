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

  // ฟังก์ชันสกัดชื่อฟอนต์จาก URL ของกูเกิลฟอนต์โดยอัตโนมัติ
  const getFontFamily = (url: string | undefined): string => {
    if (!url) return 'sans-serif';
    const match = url.match(/family=([^:&]+)/);
    if (match && match[1]) {
      const rawFont = match[1].split(':')[0];
      return decodeURIComponent(rawFont.replace(/\+/g, ' '));
    }
    return 'sans-serif';
  };

  // ดึง Font Family แยกกันรายจุด เพื่อนำไปสวมใส่ผ่าน Inline Style ได้ถูกต้องตามเป้าประสงค์
  const nameFontFamily = $derived(getFontFamily(theme.nameFontUrl));
  const welcomeFontFamily = $derived(getFontFamily(theme.welcomeFontUrl));
  const presetFontFamily = $derived(getFontFamily(theme.presetFontUrl));
  const submitBtnFontFamily = $derived(getFontFamily(theme.submitBtnFontUrl));

  const sanitizeUrl = (url: string | undefined): string => {
    if (!url) return '';
    const cleanUrl = url.trim();
    if (cleanUrl.match(/^https?:\/\/[^\s$.?#].[^\s]*$/i)) {
      return cleanUrl;
    }
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
      if (hashHex.startsWith(prefix)) {
        return String(nonce);
      }
      nonce++;
    }
  }

  onMount(async () => {
    if (!browser) return;
    renderTime = Date.now();
    
    const lastRequest = localStorage.getItem('last_donate_request');
    if (lastRequest) {
      const elapsed = Date.now() - Number(lastRequest);
      if (elapsed < 30000) {
        cooldownRemaining = Math.ceil((30000 - elapsed) / 1000);
      }
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
      const timer = setTimeout(() => {
        cooldownRemaining -= 1;
      }, 1000);
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
  <title>สนับสนุน {theme.vtuberName} 💖 | Secure Tip Gateway</title>
  
  <!-- 🛡️ นำเข้า Google Fonts แยกกันรายคีย์ ป้องกันความซ้ำซ้อนของการโหลดแผ่นสไตล์ -->
  {#if theme.nameFontUrl}
    <link rel="stylesheet" href={theme.nameFontUrl} />
  {/if}
  {#if theme.welcomeFontUrl && theme.welcomeFontUrl !== theme.nameFontUrl}
    <link rel="stylesheet" href={theme.welcomeFontUrl} />
  {/if}
  {#if theme.presetFontUrl && theme.presetFontUrl !== theme.nameFontUrl && theme.presetFontUrl !== theme.welcomeFontUrl}
    <link rel="stylesheet" href={theme.presetFontUrl} />
  {/if}
  {#if theme.submitBtnFontUrl && theme.submitBtnFontUrl !== theme.nameFontUrl && theme.submitBtnFontUrl !== theme.welcomeFontUrl && theme.submitBtnFontUrl !== theme.presetFontUrl}
    <link rel="stylesheet" href={theme.submitBtnFontUrl} />
  {/if}
</svelte:head>

<main 
  class="flex min-h-screen flex-col items-center justify-center p-4 bg-cover bg-center bg-no-repeat relative transition-all duration-700"
  style="
    background-image: {theme.bgType === 'image' && theme.bgUrl ? `url(${theme.bgUrl})` : 'none'}; 
    background-color: {theme.bgType === 'solid' ? theme.bgColor : '#0b0f19'};
  "
>
  <div class="absolute inset-0 bg-slate-950/70 backdrop-blur-[4px] -z-10"></div>

  <!-- 📦 ฟอร์มกล่องฟอร์มแบบแก้วตามกำหนดสี background รอง -->
  <form 
    onsubmit={handleDonate} 
    class="w-full max-w-xl p-6 md:p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border backdrop-blur-xl text-white relative overflow-hidden space-y-6"
    style="
      background-color: {theme.cardBgColor || 'rgba(15, 23, 42, 0.6)'};
      border-color: {theme.cardBorderColor || 'rgba(30, 41, 59, 0.8)'};
    "
  >
    <!-- 🛡️ กับดักสแปมแบบซ่อนตามมาตรฐานสากล -->
    <div class="hidden">
      <input type="text" name="email_confirm" bind:value={honeypot} tabindex="-1" autocomplete="off" />
    </div>

    <!-- 1 & 2. บล็อกโปรไฟล์ + Banner พื้นที่สูงใหญ่ขึ้น 1/3 -->
    <div class="relative rounded-2xl overflow-hidden border border-slate-800/30 pb-4 bg-slate-950/30">
      {#if theme.bannerUrl}
        <div class="w-full h-36 sm:h-44 bg-cover bg-center rounded-t-2xl opacity-50" style="background-image: url({theme.bannerUrl});"></div>
      {:else}
        <div class="w-full h-36 sm:h-44 bg-slate-900 rounded-t-2xl opacity-50"></div>
      {/if}

      <!-- ย้ายรูปโปรไฟล์อวาตาร์ไปด้านซ้าย ข้อมูลส่วนที่เหลือขยับไปขวามืออย่างสมดุลย์ -->
      <div class="flex flex-col sm:flex-row items-center sm:items-end text-center sm:text-left gap-4 sm:gap-5 px-5 -mt-12 sm:-mt-16 relative z-10 w-full">
        <!-- รูป Profile (ด้านซ้าย) -->
        <div class="relative flex-shrink-0">
          <div class="absolute -inset-1 rounded-full opacity-60 blur-md" style="background-color: {theme.nameColor};"></div>
          <img 
            src={sanitizeUrl(theme.avatarUrl) || 'https://placehold.co/150'} 
            alt="Avatar of {theme.vtuberName}" 
            class="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-slate-950 object-cover shadow-2xl" 
          />
        </div>

        <!-- ชื่อช่อง, คำทักทาย และโซเชียลมีเดีย (ด้านขวา) -->
        <div class="flex-1 space-y-1 pb-1">
          <h1 
            class="text-2xl sm:text-3xl font-extrabold tracking-wide" 
            style="color: {theme.nameColor || '#db2777'}; font-family: '{nameFontFamily}', sans-serif;"
          >
            {theme.vtuberName}
          </h1>
          <p 
            class="text-xs sm:text-sm font-medium leading-relaxed" 
            style="color: {theme.welcomeColor || '#cbd5e1'}; font-family: '{welcomeFontFamily}', sans-serif;"
          >
            {theme.welcomeText}
          </p>

          <!-- ลิงก์ Social Media ภายใต้โทนสีประจำแบรนด์ -->
          <div class="flex flex-wrap justify-center sm:justify-start gap-2 pt-1.5">
            {#each theme.socialLinks || [] as link}
              {#if link.url}
                <a 
                  href={link.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  aria-label="ติดตามช่องทาง {link.platform}"
                  class="p-1.5 rounded-full border transition-all duration-300 hover:scale-115 flex items-center justify-center bg-slate-950/40"
                  style="border-color: {theme.socialColor || '#db2777'}; color: {theme.socialColor || '#db2777'};"
                >
                  {#if link.platform === 'youtube'}
                    <svg class="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.107C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.388.511a3.003 3.003 0 0 0-2.11 2.107C0 8.053 0 12 0 12s0 3.947.512 5.837a3.003 3.003 0 0 0 2.11 2.107c1.883.511 9.388.511 9.388.511s7.505 0 9.388-.511a3.003 3.003 0 0 0 2.11-2.107c.512-1.89.512-5.837.512-5.837s0-3.947-.512-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                  {:else if link.platform === 'twitch'}
                    <svg class="w-4 h-4 text-purple-500" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/></svg>
                  {:else if link.platform === 'tiktok'}
                    <svg class="w-4 h-4 text-teal-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.86-.74-3.99-1.72-.11-.1-.21-.21-.31-.32v7.59c-.04 2.22-.96 4.41-2.67 5.8-1.72 1.4-4.04 1.94-6.2 1.46-2.16-.48-4.11-1.95-5.06-3.99-1.04-2.22-.9-4.94.4-7.01 1.25-2.03 3.57-3.32 5.92-3.35.08 0 .16 0 .24.01v4.06c-1.12.02-2.28.48-3.03 1.34-.78.89-.95 2.19-.53 3.3.41 1.09 1.45 1.87 2.61 1.99 1.16.12 2.38-.28 3.02-1.28.45-.69.61-1.53.59-2.35L12.51.02z"/></svg>
                  {:else if link.platform === 'twitter'}
                    <svg class="w-4 h-4 text-sky-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  {:else if link.platform === 'facebook'}
                    <svg class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  {:else if link.platform === 'discord'}
                    <svg class="w-4 h-4 text-indigo-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.094 13.094 0 0 1-1.873-.894.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.195.373.289a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z"/></svg>
                  {:else}
                    <svg class="w-4 h-4 text-pink-500" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
                  {/if}
                </a>
              {/if}
            {/each}
          </div>
        </div>
      </div>
    </div>

    <!-- 3. ช่องกรอกชื่อเล่น (Nickname Label ปรับตามแรนเดอร์ฟอนต์คำทักทาย) -->
    <div class="space-y-1.5 w-full pt-2">
      <label class="block text-sm font-semibold text-slate-300 tracking-wide" for="nickname" style="font-family: '{welcomeFontFamily}', sans-serif;">
        {theme.nicknameLabel}
      </label>
      <div class="relative group">
        <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500 transition-colors group-focus-within:text-white">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
        </span>
        <input 
          id="nickname" 
          type="text" 
          required 
          placeholder="เช่น ผู้สนับสนุนสุดน่ารัก"
          class="w-full pl-11 pr-4 py-2.5 rounded-xl text-white placeholder-slate-500 tracking-wide transition-all focus:outline-none focus:ring-2 focus:ring-transparent border" 
          style="
            background-color: {theme.inputBgColor}; 
            border-color: {theme.inputBorderColor};
            --tw-ring-color: {theme.submitBtnColor};
            font-family: '{welcomeFontFamily}', sans-serif;
          "
          bind:value={name} 
        />
      </div>
    </div>

    <!-- 4. ช่องกรอกข้อความสนับสนุน -->
    <div class="space-y-1.5 w-full">
      <label class="block text-sm font-semibold text-slate-300 tracking-wide" for="donor-msg" style="font-family: '{welcomeFontFamily}', sans-serif;">
        {theme.messageLabel}
      </label>
      <div class="relative group">
        <span class="absolute top-3 left-3.5 pointer-events-none text-slate-500 transition-colors group-focus-within:text-white">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
        </span>
        <textarea 
          id="donor-msg" 
          placeholder="เขียนข้อความให้กำลังใจสตรีมเมอร์ได้ที่นี่เลยนะคะ..."
          class="w-full pl-11 pr-4 py-2.5 rounded-xl text-white placeholder-slate-500 tracking-wide transition-all focus:outline-none focus:ring-2 focus:ring-transparent border" 
          rows="2" 
          style="
            background-color: {theme.inputBgColor}; 
            border-color: {theme.inputBorderColor};
            --tw-ring-color: {theme.submitBtnColor};
            font-family: '{welcomeFontFamily}', sans-serif;
          "
          bind:value={message}
        ></textarea>
      </div>
    </div>

    <!-- 5. ปุ่มเลือกยอดเงินสนับสนุนด่วน -->
    <div class="space-y-2 w-full">
      <label class="block text-sm font-semibold text-slate-300 tracking-wide" for="preset-btn" style="font-family: '{presetFontFamily}', sans-serif;">
        {theme.presetLabel}
      </label>
      <div class="grid grid-cols-4 gap-2">
        {#each theme.presetAmounts as amt}
          <button 
            type="button" 
            onclick={() => amount = String(amt)} 
            class="py-2.5 px-1 text-sm font-bold border rounded-xl cursor-pointer tracking-wide transition-all duration-200"
            style="
              background-color: {amount === String(amt) ? theme.submitBtnColor : theme.presetBtnColor}; 
              border-color: {amount === String(amt) ? theme.submitBtnColor : theme.presetBorderColor}; 
              color: {amount === String(amt) ? theme.submitBtnTextColor : '#e2e8f0'};
              font-family: '{presetFontFamily}', sans-serif;
            "
          >
            {amt}฿
          </button>
        {/each}
      </div>
    </div>

    <!-- 6. ระบุจำนวนเงินเอง -->
    <div class="space-y-1.5 w-full">
      <label class="block text-sm font-semibold text-slate-300 tracking-wide" for="custom-amount" style="font-family: '{welcomeFontFamily}', sans-serif;">
        {theme.amountLabel}
      </label>
      <div class="relative group">
        <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500 transition-colors group-focus-within:text-white">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </span>
        <input 
          id="custom-amount" 
          type="number" 
          required 
          min="10" 
          placeholder="ขั้นต่ำ 10 บาทขึ้นไปนะคะ"
          class="w-full pl-11 pr-4 py-2.5 rounded-xl text-white placeholder-slate-500 font-bold tracking-wide transition-all focus:outline-none focus:ring-2 focus:ring-transparent border" 
          style="
            background-color: {theme.inputBgColor}; 
            border-color: {theme.inputBorderColor};
            --tw-ring-color: {theme.submitBtnColor};
            font-family: '{welcomeFontFamily}', sans-serif;
          "
          bind:value={amount} 
        />
      </div>
    </div>

    <!-- 7. ปุ่มโดเนทสนับสนุน -->
    <div class="w-full pt-4">
      <button
        type="submit"
        disabled={loading || powLoading || cooldownRemaining > 0}
        aria-live="polite"
        aria-busy={loading || powLoading}
        class="w-full py-4 text-base font-extrabold rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] shadow-lg disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed tracking-wider uppercase"
        style="
          background-color: {cooldownRemaining > 0 ? '#4b5563' : theme.submitBtnColor}; 
          color: {theme.submitBtnTextColor || '#ffffff'};
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
          font-family: '{submitBtnFontFamily}', sans-serif;
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
            โดเนทสนับสนุน 💖
          {/if}
        {/if}
      </button>
    </div>

  </form>
</main>
