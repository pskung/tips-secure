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

<main 
  class="flex min-h-screen flex-col items-center justify-center p-4 bg-cover bg-center bg-no-repeat relative transition-all duration-700"
  style="background-image: {theme.bannerUrl ? `url(${theme.bannerUrl})` : 'none'}; background-color: #0b0f19;"
>
  <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-[6px] -z-10"></div>
  
  <!-- 🌸 แสงเรืองระยิบระยับแบบคู่สีไล่เฉดตามสตรีมเมอร์กำหนด -->
  <div class="absolute w-[25rem] h-[25rem] rounded-full blur-[110px] top-12 left-12 -z-10 animate-pulse" style="background-color: {theme.themeColor}1a;"></div>
  <div class="absolute w-[20rem] h-[20rem] rounded-full blur-[90px] bottom-12 right-12 -z-10 animate-pulse" style="background-color: {theme.themeColorEnd || theme.themeColor}1a; animation-delay: 2s;"></div>

  <div class="w-full max-w-lg p-6 md:p-8 space-y-8 bg-slate-900/60 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-800/80 backdrop-blur-xl text-white transition-all duration-300 hover:border-slate-700/60">
    
    <div class="flex flex-col items-center space-y-4 text-center">
      <div class="relative group">
        <div class="absolute -inset-1 rounded-full opacity-60 blur-md transition duration-500 group-hover:opacity-100" style="background: linear-gradient(90deg, {theme.themeColor}, {theme.themeColorEnd || theme.themeColor});"></div>
        <img 
          src={sanitizeUrl(theme.avatarUrl) || 'https://placehold.co/150'} 
          alt="รูปภาพประจำช่องสตรีมของ {theme.vtuberName}" 
          class="relative w-28 h-28 rounded-full border-4 border-slate-900 object-cover shadow-2xl transition duration-500 group-hover:scale-105" 
        />
      </div>
      <div class="space-y-1">
        <!-- ไล่เฉดสีที่หัวข้อ VTuber Name -->
        <h1 class="text-3xl font-extrabold tracking-wide" style="background: linear-gradient(135deg, {theme.themeColor}, {theme.themeColorEnd || theme.themeColor}); -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">{theme.vtuberName}</h1>
        <p class="text-sm font-medium text-slate-300 px-4 leading-relaxed max-w-sm">{theme.welcomeText}</p>
      </div>
    </div>

    <form onsubmit={handleDonate} class="space-y-5">
      <div style="position: absolute; left: -5000px;" aria-hidden="true">
        <input type="text" name="email_confirm" bind:value={honeypot} tabindex="-1" autocomplete="off" />
      </div>

      <div class="space-y-1.5">
        <label class="block text-sm font-semibold text-slate-300 tracking-wide" for="nickname">ชื่อเล่นของคุณ (Nickname)</label>
        <div class="relative group">
          <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500 transition-colors group-focus-within:text-white">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </span>
          <input 
            id="nickname" 
            type="text" 
            required 
            placeholder="เช่น โอนเนอร์สุดน่ารัก"
            class="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 tracking-wide transition-all focus:outline-none focus:ring-2 focus:border-transparent" 
            style="--tw-ring-color: {theme.themeColor};"
            bind:value={name} 
          />
        </div>
      </div>

      <!-- 💸 ปุ่มตัวเลือกยอดเงินด่วนจำกัดไว้ที่ 4 ปุ่มพอดีกับสัดส่วนช่องกรอกพอดี -->
      <div class="space-y-2">
        <label class="block text-sm font-semibold text-slate-300 tracking-wide" for="preset-btn">เลือกยอดเงินสนับสนุนด่วน 🌸</label>
        <div class="grid grid-cols-4 gap-2">
          {#each theme.presetAmounts.slice(0, 4) as amt}
            <button 
              type="button" 
              onclick={() => amount = String(amt)} 
              aria-label="เลือกยอดเงินสนับสนุนด่วนจำนวน {amt} บาท" 
              class="py-2.5 px-1 text-sm font-bold bg-slate-950/60 hover:bg-slate-950 hover:scale-105 border rounded-xl text-slate-200 cursor-pointer tracking-wide transition-all duration-200"
              style="border-color: {amount === String(amt) ? theme.themeColor : '#1e293b'}; color: {amount === String(amt) ? theme.themeColor : '#e2e8f0'};"
            >
              {amt}฿
            </button>
          {/each}
        </div>
      </div>

      <div class="space-y-1.5">
        <label class="block text-sm font-semibold text-slate-300 tracking-wide" for="custom-amount">ระบุจำนวนเงินเอง (บาท)</label>
        <div class="relative group">
          <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500 transition-colors group-focus-within:text-white">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </span>
          <input 
            id="custom-amount" 
            type="number" 
            required 
            min="10" 
            placeholder="ขั้นต่ำ 10 บาทขึ้นไปนะคะ"
            class="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 font-bold tracking-wide transition-all focus:outline-none focus:ring-2 focus:border-transparent" 
            style="--tw-ring-color: {theme.themeColor};"
            bind:value={amount} 
          />
        </div>
      </div>

      <div class="space-y-1.5">
        <label class="block text-sm font-semibold text-slate-300 tracking-wide" for="donor-msg">ข้อความสนับสนุน (ส่งอวยพรขึ้นจอไลฟ์สด)</label>
        <div class="relative group">
          <span class="absolute top-3.5 left-3.5 pointer-events-none text-slate-500 transition-colors group-focus-within:text-white">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          </span>
          <textarea 
            id="donor-msg" 
            placeholder="เขียนข้อความให้กำลังใจสตรีมเมอร์ได้ที่นี่เลยนะคะ..."
            class="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 tracking-wide transition-all focus:outline-none focus:ring-2 focus:border-transparent" 
            rows="3" 
            style="--tw-ring-color: {theme.themeColor};"
            bind:value={message}
          ></textarea>
        </div>
      </div>

      <!-- 💖 ปุ่มส่งเงินโดเนทเปลี่ยนเป็น Gradient ไหลลื่นจากสีเริ่มต้นหาสีปลายทาง -->
      <button
        type="submit"
        disabled={loading || powLoading || cooldownRemaining > 0}
        aria-live="polite"
        aria-busy={loading || powLoading}
        class="w-full py-4 text-base font-extrabold rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed text-white tracking-wider uppercase"
        style="background: {cooldownRemaining > 0 ? '#4b5563' : `linear-gradient(135deg, ${theme.themeColor}, ${theme.themeColorEnd || theme.themeColor})`}; box-shadow: 0 8px 24px rgba(99, 102, 241, 0.2);"
      >
        {#if cooldownRemaining > 0}
          <span class="flex items-center justify-center gap-2">
            กรุณารออีก {cooldownRemaining} วินาทีนะคะ ⏳
          </span>
        {:else if powLoading}
          <span class="flex items-center justify-center gap-2">
            <svg class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            กำลังเชื่อมโยงเครือข่ายความปลอดภัย...
          </span>
        {:else if loading}
          <span class="flex items-center justify-center gap-2">
            <svg class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            กำลังขอคิวอาร์พร้อมเพย์รับเงิน...
          </span>
        {:else}
          <span class="flex items-center justify-center gap-1.5">
            โอนเงินสนับสนุน 💖
          </span>
        {/if}
      </button>
    </form>
  </div>
</main>
