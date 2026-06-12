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

  // ควบคุมสถานะการพิมพ์ยอดเงินเอง
  let customActive = $state(false);
  let customAmountVal = $state('');

  // กำหนดค่าตั้งต้นแบบ Minimal Pastel ผ่อนคลายสบายตา
  const config = {
    ...theme,
    bgColor: theme.bgColor ?? '#faf9f6', // สีพื้นหลังพาสเทลวอร์มไวต์
    cardBgColor: theme.cardBgColor ?? '#ffffff', // การ์ดสีขาวบริสุทธิ์
    cardOpacity: theme.cardOpacity ?? 1.0,
    cardBorderColor: theme.cardBorderColor ?? '#f1f5f9',
    cardBorderOpacity: theme.cardBorderOpacity ?? 1.0,
    profileAreaBgColor: theme.profileAreaBgColor ?? '#ffffff',
    profileAreaOpacity: theme.profileAreaOpacity ?? 1.0,
    inputBgColor: theme.inputBgColor ?? '#f8fafc',
    inputBgOpacity: theme.inputBgOpacity ?? 1.0,
    inputBorderColor: theme.inputBorderColor ?? '#e2e8f0',
    
    vtuberName: theme.vtuberName ?? 'VTuber Channel',
    nameColor: theme.nameColor ?? '#d89a9e', // สีชมพูตุ่นสไตล์ Pastel-rose
    welcomeColor: theme.welcomeColor ?? '#475569', // สีตัวหนังสือ Slate 600
    labelColor: theme.labelColor ?? '#475569',
    placeholderColor: theme.placeholderColor ?? '#94a3b8',
    
    mainFontFamily: theme.mainFontFamily ?? 'Mitr',
    welcomeText: theme.welcomeText ?? 'ยินดีต้อนรับสู่ช่องสนับสนุนสตรีมเมอร์ค่ะ 💖',
    nicknameLabel: theme.nicknameLabel ?? 'ชื่อเล่นของคุณ',
    nicknamePlaceholder: theme.nicknamePlaceholder ?? 'พิมพ์ชื่อเล่นที่นี่...',
    messageLabel: theme.messageLabel ?? 'ข้อความสนับสนุน',
    messagePlaceholder: theme.messagePlaceholder ?? 'พิมพ์ข้อความให้สตรีมเมอร์ชื่นใจ...',
    presetLabel: theme.presetLabel ?? 'ปุ่มสนับสนุนด่วน',
    amountLabel: theme.amountLabel ?? 'ระบุจำนวนเงินเอง (บาท)',
    amountPlaceholder: theme.amountPlaceholder ?? 'ป้อนจำนวนเงิน (10 - 5,000 บาท)...',
    presetAmounts: theme.presetAmounts && theme.presetAmounts.length === 4 ? theme.presetAmounts : [100, 300, 500, 1000],
    presetBtnColor: theme.presetBtnColor ?? '#f8fafc',
    presetBorderColor: theme.presetBorderColor ?? '#cbd5e1',
    submitBtnColor: theme.submitBtnColor ?? '#d89a9e',
    submitBtnTextColor: theme.submitBtnTextColor ?? '#ffffff',
    submitBtnText: theme.submitBtnText ?? 'ส่งการสนับสนุนน้า 💖'
  };

  const uniqueFonts = $derived([
    ...new Set([
      config.mainFontFamily,
      config.placeholderFontFamily
    ].filter(f => f && f.trim() !== '' && f.toLowerCase() !== 'sans-serif'))
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
    
    // กำหนดจำนวนเงินเริ่มต้นเป็นค่า Preset ตัวแรก
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
  <title>สนับสนุน {config.vtuberName} 💖</title>
  {#each uniqueFonts as font}
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family={font.trim().replace(/\s+/g, '+')}:wght@400;500;700&display=swap" />
  {/each}
</svelte:head>

<main 
  class="flex min-h-screen flex-col relative transition-all duration-700 select-none overflow-x-hidden"
  style="
    background-image: {config.bgType === 'image' && config.bgUrl ? `url(${config.bgUrl})` : 'none'}; 
    background-color: {config.bgColor};
    font-family: '{config.mainFontFamily}', sans-serif;
  "
>
  <!-- 1. ส่วนแบนเนอร์ด้านบนสุดแบบเรียบง่าย ไม่กินพื้นที่สายตา (Compact Banner) -->
  <div class="w-full h-24 sm:h-28 bg-cover bg-center relative" style="background-image: url({config.bannerUrl || 'https://placehold.co/1200x200'});">
    <div class="absolute inset-0 bg-black/5"></div>
  </div>

  <!-- 2. แถบโปรไฟล์และชื่อ VTuber ยกระดับความเรียบง่าย (Minimal Profile Strip) -->
  <div class="w-full border-b" style="background-color: {hexToRgba(config.profileAreaBgColor, config.profileAreaOpacity)}; border-color: {hexToRgba(config.cardBorderColor, config.cardBorderOpacity)};">
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-center sm:items-center gap-4 relative">
      
      <!-- อวาตาร์โปรไฟล์วงกลมแบบคลีน ไร้แสงเบลอ มีเพียงเงาจางและขอบบาง -->
      <div class="sm:absolute sm:-top-12 left-4 sm:left-6 lg:left-8 flex-shrink-0 z-20">
        <img src={sanitizeUrl(config.avatarUrl) || 'https://placehold.co/150'} alt="Avatar" class="w-20 h-20 rounded-full border-4 object-cover shadow-md" style="border-color: {config.profileAreaBgColor};" />
      </div>
      
      <!-- ข้อมูลผู้ใช้ถัดจากอวาตาร์ -->
      <div class="sm:pl-28 text-center sm:text-left flex-1 min-h-[3rem] flex flex-col justify-center">
        <h1 class="text-xl font-extrabold tracking-wide" style="color: {config.nameColor};">
          {config.vtuberName}
        </h1>
        <p class="text-xs font-semibold" style="color: {config.welcomeColor};">
          is creating animations & illustrations 💖
        </p>
      </div>
    </div>
  </div>

  <!-- 3. ส่วนกล่องแสดงผลหลักแบ่งเป็น 2 คอลัมน์แบบรัดกุม (Compact 2-Columns Layout) -->
  <div class="max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 flex-1 flex flex-col justify-center">
    <!-- lg:grid-cols-12 จะช่วยแยกฝั่งซ้ายขวาบนคอม และหดยุบลงบนมือถืออย่างถูกระเบียบ -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      
      <!-- 📱 ฝั่งซ้าย (7/12 ส่วนบนคอม): แสดงรายละเอียดทักทายแบบน่ารักกะทัดรัด -->
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
            <h3 class="text-base font-bold text-slate-800 flex items-center gap-1.5">
              <span>Hey</span> <span class="animate-bounce">👋</span>
            </h3>
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

      <!-- 💳 ฝั่งขวา (5/12 ส่วนบนคอม): การ์ดสนับสนุนดีไซน์คลีนสบายตา (Support Card) -->
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
          <!-- Honeypot -->
          <div class="hidden">
            <input type="text" name="email_confirm" bind:value={honeypot} tabindex="-1" autocomplete="off" />
          </div>

          <h2 class="text-base font-extrabold tracking-wide text-slate-800">
            Buy {config.vtuberName} a Coffee
          </h2>

          <!-- กล่องปุ่มด่วนและระบุจำนวนเงินสไตล์พาสเทล -->
          <div class="space-y-3.5">
            
            <!-- แสดง Preset 4 ปุ่มด่วนเรียบง่าย ไร้สัญลักษณ์หรือรูปถ้วยกาแฟรกสายตา -->
            <div class="space-y-1">
              <span class="block text-xs font-bold" style="color: {config.labelColor};">
                {config.presetLabel}
              </span>
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
            </div>

            <!-- ช่องป้อนยอดเงินด้วยตนเองแยกส่วนชัดเจน -->
            <div class="space-y-1">
              <label class="block text-xs font-bold" for="custom-amount" style="color: {config.labelColor};">
                {config.amountLabel}
              </label>
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

          </div>

          <!-- ช่องกรอกชื่อเล่นผู้สนับสนุน -->
          <div class="space-y-1">
            <label class="block text-xs font-bold" for="nickname" style="color: {config.labelColor};">
              {config.nicknameLabel}
            </label>
            <input 
              id="nickname" 
              type="text" 
              required 
              placeholder={config.nicknamePlaceholder} 
              class="w-full px-3 py-2.5 rounded-lg text-slate-800 placeholder-slate-400 text-xs transition-all focus:outline-none focus:ring-1 border shadow-sm" 
              style="background-color: {config.inputBgColor}; border-color: {config.inputBorderColor}; --tw-ring-color: {config.submitBtnColor};" 
              bind:value={name} 
            />
          </div>

          <!-- ช่องกรอกข้อความสนับสนุน (ย่นย่อเหลือ 2 แถวเพื่อรักษาระยะความสูง) -->
          <div class="space-y-1">
            <label class="block text-xs font-bold" for="donor-msg" style="color: {config.labelColor};">
              {config.messageLabel}
            </label>
            <textarea 
              id="donor-msg" 
              placeholder={config.messagePlaceholder} 
              class="w-full px-3 py-2.5 rounded-lg text-slate-800 placeholder-slate-400 text-xs transition-all focus:outline-none focus:ring-1 border shadow-sm" 
              rows="2" 
              style="background-color: {config.inputBgColor}; border-color: {config.inputBorderColor}; --tw-ring-color: {config.submitBtnColor};" 
              bind:value={message}
            ></textarea>
          </div>

          <!-- ปุ่มส่งชำระเงินสนับสนุน (Support Button) ดีไซน์มนพาสเทลสวยงาม -->
          <div class="pt-1">
            <button
              type="submit"
              disabled={loading || powLoading || cooldownRemaining > 0}
              class="w-full py-3 text-xs sm:text-sm font-black rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] shadow-sm disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed tracking-wider uppercase"
              style="
                background-color: {cooldownRemaining > 0 ? '#64748b' : config.submitBtnColor}; 
                color: {config.submitBtnTextColor || '#ffffff'};
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
