<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  
  // 🛡️ ดึงข้อมูลธีมที่โหลดมาจาก Cloudflare KV
  let { data } = $props();
  const theme = data.theme;

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

  // ควบคุมสถานะการพิมพ์ยอดเงินเองแบบเรียลไทม์ตามภาพตัวอย่าง
  let customActive = $state(false);
  let customAmountVal = $state('');

  const config = {
    ...theme,
    mainFontFamily: theme.mainFontFamily ?? 'Mitr',
    nicknameLabel: theme.nicknameLabel ?? 'ชื่อเล่นของคุณ',
    nicknamePlaceholder: theme.nicknamePlaceholder ?? 'พิมพ์ชื่อเล่นที่นี่...',
    messageLabel: theme.messageLabel ?? 'ข้อความสนับสนุน',
    messagePlaceholder: theme.messagePlaceholder ?? 'พิมพ์ข้อความให้สตรีมเมอร์ชื่นใจ...',
    presetLabel: theme.presetLabel ?? 'ปุ่มสนับสนุนด่วน',
    amountLabel: theme.amountLabel ?? 'ระบุจำนวนเงินเอง (บาท)',
    amountPlaceholder: theme.amountPlaceholder ?? 'ป้อนจำนวนเงิน (10 - 5,000 บาท)...',
    presetAmounts: theme.presetAmounts && theme.presetAmounts.length === 4 ? theme.presetAmounts : [100, 300, 500, 1000],
    submitBtnText: theme.submitBtnText ?? 'โดเนทสนับสนุน 💖',
    submitBtnColor: theme.submitBtnColor ?? '#db2777',
    submitBtnTextColor: theme.submitBtnTextColor ?? '#ffffff'
  };

  const uniqueFonts = $derived([
    ...new Set([
      config.mainFontFamily,
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
    
    // ตั้งค่าเริ่มต้นยอดเงินเป็นค่า Preset ตัวแรก
    if (config.presetAmounts.length > 0) {
      amount = String(config.presetAmounts[0]);
    }

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
  class="flex min-h-screen flex-col bg-cover bg-center bg-no-repeat relative transition-all duration-700 select-none pb-12"
  style="
    background-image: {config.bgType === 'image' && config.bgUrl ? `url(${config.bgUrl})` : 'none'}; 
    background-color: {config.bgType === 'solid' ? config.bgColor : '#0b0f19'};
    font-family: '{config.mainFontFamily}', sans-serif;
  "
>
  <div class="absolute inset-0 bg-slate-950/70 backdrop-blur-[4px] -z-10"></div>

  <!-- 1. ส่วนแบนเนอร์กว้างเต็มพิกัด (Top Wide Banner) -->
  <div class="w-full h-44 sm:h-60 md:h-72 bg-cover bg-center relative" style="background-image: url({config.bannerUrl || 'https://placehold.co/1200x400'});">
    <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent"></div>
  </div>

  <!-- 2. แถบโปรไฟล์และชื่อ VTuber เหลื่อมขอบ (Profile Overlap Header) -->
  <div class="w-full border-b" style="background-color: {hexToRgba(config.profileAreaBgColor, config.profileAreaOpacity)}; border-color: {hexToRgba(config.cardBorderColor, config.cardBorderOpacity)};">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center sm:items-end gap-5 relative">
      
      <!-- รูปภาพโปรไฟล์วงกลมเหลื่อมขอบขึ้นไปบนแบนเนอร์ -->
      <div class="sm:absolute sm:-top-16 left-4 sm:left-6 lg:left-8 flex-shrink-0 z-20">
        <div class="relative">
          <div class="absolute -inset-1 rounded-full opacity-60 blur-md" style="background-color: {config.nameColor};"></div>
          <img src={sanitizeUrl(config.avatarUrl) || 'https://placehold.co/150'} alt="Avatar" class="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-slate-950 object-cover shadow-2xl" />
        </div>
      </div>
      
      <!-- ข้อมูลผู้ใช้ถัดจากอวาตาร์ -->
      <div class="sm:pl-40 text-center sm:text-left flex-1 min-h-[4rem] pb-1 space-y-1">
        <h1 class="text-2xl sm:text-3xl font-extrabold tracking-wide" style="color: {config.nameColor || '#db2777'};">
          {config.vtuberName}
        </h1>
        <p class="text-xs sm:text-sm font-semibold leading-relaxed" style="color: {config.welcomeColor || '#cbd5e1'};">
          is creating animations & illustrations 💖
        </p>
      </div>
    </div>
  </div>

  <!-- 3. ส่วนเนื้อหาหลักแบบแบ่งคอลัมน์ตอบสนอง (Responsive Grid Container) -->
  <div class="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
    <!-- lg: ใช้สำหรับการตั้งค่าแสดงผลเป็น 2 ฝั่งบนจอคอมพิวเตอร์และแท็บเล็ตแนวนอน ส่วนจอมือถือจะพังเลย์เอาต์กลับมาแนวตั้งปกติ -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      <!-- 📱 ฝั่งซ้าย (7/12 ส่วนบนคอม): แสดงรายละเอียดต้อนรับและโซเชียลเน็ตเวิร์ก -->
      <div class="lg:col-span-7 space-y-6">
        <div 
          class="p-6 sm:p-8 rounded-3xl border shadow-lg"
          style="
            background-color: {hexToRgba(config.cardBgColor, config.cardOpacity)};
            border-color: {hexToRgba(config.cardBorderColor, config.cardBorderOpacity)};
            backdrop-filter: blur({config.cardBlur}px);
          "
        >
          <div class="space-y-4">
            <h3 class="text-lg font-bold text-white flex items-center gap-2">
              <span>Hey</span> <span class="animate-bounce">👋</span>
            </h3>
            <p class="text-sm sm:text-base leading-relaxed" style="color: {config.welcomeColor || '#cbd5e1'};">
              {config.welcomeText}
            </p>
          </div>
        </div>

        <!-- ปุ่มโซเชียลมีเดีย -->
        <div class="flex flex-wrap gap-3">
          {#each config.socialLinks || [] as link}
            {#if link.url}
              <a href={link.url} target="_blank" rel="noopener noreferrer" class="px-4 py-2 rounded-full border transition-all hover:scale-105 flex items-center gap-2 bg-slate-950/40 text-xs font-bold uppercase" style="border-color: {config.socialColor || '#db2777'}; color: {config.socialColor || '#db2777'};">
                <span>{link.platform}</span>
              </a>
            {/if}
          {/each}
        </div>
      </div>

      <!-- 💳 ฝั่งขวา (5/12 ส่วนบนคอม): การ์ดชำระเงินสนับสนุน (Coffee Form Card) -->
      <div class="lg:col-span-5">
        <form 
          onsubmit={handleDonate} 
          class="p-6 sm:p-8 rounded-3xl border shadow-[0_20px_50px_rgba(0,0,0,0.5)] space-y-5 relative overflow-hidden"
          style="
            background-color: {hexToRgba(config.cardBgColor, config.cardOpacity)};
            border-color: {hexToRgba(config.cardBorderColor, config.cardBorderOpacity)};
            backdrop-filter: blur({config.cardBlur}px);
            --placeholder-color: {config.placeholderColor || '#64748b'};
            --placeholder-font: '{config.mainFontFamily}', sans-serif;
          "
        >
          <!-- Honeypot ดักจับสแปมบอท -->
          <div class="hidden">
            <input type="text" name="email_confirm" bind:value={honeypot} tabindex="-1" autocomplete="off" />
          </div>

          <h2 class="text-lg sm:text-xl font-extrabold tracking-wide text-white">
            Buy {config.vtuberName} a Coffee
          </h2>

          <!-- แถวสลับยอดเงินแบบกล่องกาแฟ (Coffee Selector Row) -->
          <div class="flex items-center gap-3 p-3 rounded-2xl bg-slate-950/40 border border-slate-800/60 justify-between">
            <div class="flex items-center gap-1.5 flex-shrink-0 pl-1">
              <span class="text-3xl">☕</span>
              <span class="text-sm font-bold text-slate-500">x</span>
            </div>
            
            <div class="flex items-center gap-1.5 flex-wrap justify-end">
              <!-- ดึง 3 ค่าแรกจาก presetAmounts มาสร้างปุ่มวงกลมสีสันสดใส -->
              {#each config.presetAmounts.slice(0, 3) as amt}
                <button 
                  type="button" 
                  onclick={() => { amount = String(amt); customActive = false; }} 
                  class="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full border text-xs sm:text-sm font-black transition-all duration-200 cursor-pointer" 
                  style="
                    background-color: {!customActive && amount === String(amt) ? config.submitBtnColor : config.presetBtnColor}; 
                    border-color: {!customActive && amount === String(amt) ? config.submitBtnColor : config.presetBorderColor}; 
                    color: {!customActive && amount === String(amt) ? config.submitBtnTextColor : '#cbd5e1'};
                  "
                >
                  {amt}
                </button>
              {/each}
              
              <!-- กล่องรับจำนวนเงินออกแบบกำหนดเอง (Custom Input Box) -->
              <input 
                type="number" 
                placeholder="ระบุเงิน" 
                min="10"
                max="5000"
                class="w-16 h-9 sm:h-10 text-center rounded-lg border text-xs font-black text-white focus:outline-none focus:ring-2" 
                style="
                  background-color: {customActive ? config.submitBtnColor : config.inputBgColor}; 
                  border-color: {customActive ? config.submitBtnColor : config.inputBorderColor}; 
                  --tw-ring-color: {config.submitBtnColor};
                "
                oninput={(e) => { 
                  customActive = true; 
                  amount = e.currentTarget.value; 
                  customAmountVal = e.currentTarget.value;
                }}
                bind:value={customAmountVal}
              />
            </div>
          </div>

          <!-- ช่องกรอกชื่อเล่นผู้สนับสนุน -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold tracking-wide" for="nickname" style="color: {config.labelColor || '#cbd5e1'};">
              {config.nicknameLabel}
            </label>
            <input 
              id="nickname" 
              type="text" 
              required 
              placeholder={config.nicknamePlaceholder} 
              class="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 text-sm tracking-wide transition-all focus:outline-none focus:ring-2 border" 
              style="background-color: {hexToRgba(config.inputBgColor, config.inputBgOpacity)}; border-color: {config.inputBorderColor}; --tw-ring-color: {config.submitBtnColor};" 
              bind:value={name} 
            />
          </div>

          <!-- ช่องกรอกข้อความแนบใบเสร็จ -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold tracking-wide" for="donor-msg" style="color: {config.labelColor || '#cbd5e1'};">
              {config.messageLabel}
            </label>
            <textarea 
              id="donor-msg" 
              placeholder={config.messagePlaceholder} 
              class="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 text-sm tracking-wide transition-all focus:outline-none focus:ring-2 border" 
              rows="3" 
              style="background-color: {hexToRgba(config.inputBgColor, config.inputBgOpacity)}; border-color: {config.inputBorderColor}; --tw-ring-color: {config.submitBtnColor};" 
              bind:value={message}
            ></textarea>
          </div>

          <!-- ปุ่มส่งโดเนทยิงขึ้นหน้าจอ (Support Button) -->
          <div class="pt-2">
            <button
              type="submit"
              disabled={loading || powLoading || cooldownRemaining > 0}
              class="w-full py-3.5 text-sm sm:text-base font-black rounded-full cursor-pointer transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] shadow-lg disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed tracking-wider uppercase"
              style="
                background-color: {cooldownRemaining > 0 ? '#4b5563' : config.submitBtnColor}; 
                color: {config.submitBtnTextColor || '#ffffff'};
                box-shadow: 0 8px 24px rgba(0,0,0,0.3);
              "
            >
              {#if cooldownRemaining > 0}
                กรุณารออีก {cooldownRemaining} วินาทีน้า ⏳
              {:else if powLoading}
                กำลังเตรียมเส้นทางปลอดภัย...
              {:else if loading}
                กำลังขอคิวอาร์พร้อมเพย์...
              {:else}
                Support {amount ? `${amount}฿` : ''} ☕
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
