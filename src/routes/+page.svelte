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

    // 🛡️ [แก้ไข Finding #5] สุ่มลายพิมพ์นิ้วมือประจำตัวไคลเอนต์ด้วยความปลอดภัยระดับการเข้ารหัสข้อมูลที่มั่นคง (CSPRNG)
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
  class="flex min-h-screen flex-col items-center justify-center p-6 bg-cover bg-center bg-no-repeat relative"
  style="background-image: {theme.bannerUrl ? `url(${theme.bannerUrl})` : 'none'}; background-color: #0f172a;"
>
  <div class="absolute inset-0 bg-black/60 backdrop-blur-sm -z-10"></div>
  <div class="w-full max-w-md p-8 space-y-6 bg-slate-900/90 rounded-2xl shadow-2xl border border-slate-700/50 backdrop-blur-md text-white">
    
    <div class="flex flex-col items-center space-y-3">
      <img 
        src={sanitizeUrl(theme.avatarUrl) || 'https://placehold.co/150'} 
        alt="รูปภาพประจำช่องสตรีมของ {theme.vtuberName}" 
        class="w-24 h-24 rounded-full border-4 object-cover shadow-lg" 
        style="border-color: {theme.themeColor};" 
      />
      <h1 class="text-2xl font-bold text-center" style="color: {theme.themeColor};">{theme.vtuberName}</h1>
      <p class="text-sm text-slate-300 text-center px-4">{theme.welcomeText}</p>
    </div>

    <form onsubmit={handleDonate} class="space-y-4">
      <div style="position: absolute; left: -5000px;" aria-hidden="true">
        <input type="text" name="email_confirm" bind:value={honeypot} tabindex="-1" autocomplete="off" />
      </div>

      <div>
        <label class="block text-sm font-medium mb-1" for="nickname">ชื่อเล่นของคุณ (Nickname)</label>
        <input id="nickname" type="text" required class="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white" bind:value={name} />
      </div>

      <div>
        <label class="block text-sm font-medium mb-2" for="preset-btn">ปุ่มยอดเงินสนับสนุนด่วน 💸</label>
        <div class="grid grid-cols-4 gap-2">
          {#each theme.presetAmounts as amt}
            <!-- 🛡️ [แก้ไข Finding #5] ยกระดับความเข้ากันของผู้พิการตามมาตรฐาน WCAG 2.1 ด้วยป้าย ARIA อธิบายวัตถุประสงค์การคลิกชัดเจน -->
            <button 
              type="button" 
              onclick={() => amount = String(amt)} 
              aria-label="เลือกยอดเงินสนับสนุนด่วนจำนวน {amt} บาท" 
              class="p-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 cursor-pointer"
            >
              {amt}฿
            </button>
          {/each}
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium mb-1" for="custom-amount">ระบุจำนวนเงินเอง (บาท)</label>
        <input id="custom-amount" type="number" required min="10" class="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white" bind:value={amount} />
      </div>

      <div>
        <label class="block text-sm font-medium mb-1" for="donor-msg">ข้อความสนับสนุน (ส่งอวยพรขึ้นจอ)</label>
        <textarea id="donor-msg" class="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white" rows="2" bind:value={message}></textarea>
      </div>

      <button
        type="submit"
        disabled={loading || powLoading || cooldownRemaining > 0}
        aria-live="polite"
        aria-busy={loading || powLoading}
        class="w-full p-3 text-white font-bold rounded-lg cursor-pointer transition-colors"
        style="background-color: {cooldownRemaining > 0 ? '#4b5563' : theme.themeColor};"
      >
        {#if cooldownRemaining > 0}
          กรุณารออีก {cooldownRemaining} วินาที ⏳
        {:else if powLoading}
          ระบบกำลังเตรียมช่องทางเชื่อมโยงที่ปลอดภัย...
        {:else if loading}
          กำลังขอคิวอาร์ชำระเงิน...
        {:else}
          โดเนทสนับสนุน 💖
        {/if}
      </button>
    </form>
  </div>
</main>
