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

  // 🛡️ ระบบสกัดคิวและ Auto-Google Fonts Loader เบื้องหลัง
  const uniqueFonts = $derived([
    ...new Set([
      theme.nameFontFamily,
      theme.welcomeFontFamily,
      theme.labelFontFamily,
      theme.presetFontFamily,
      theme.submitBtnFontFamily,
      theme.placeholderFontFamily
    ].filter(f => f && f.trim() !== '' && f.toLowerCase() !== 'sans-serif'))
  ]);

  // 🛠️ แปลง HEX เป็น RGBA ให้ประมวลผลความโปร่งแสง
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
  
  <!-- 🛡️ ดึง Google Fonts เบื้องหลังรวมกันทุกตระกูลไร้ปัญหาหน่วงหน้าเพจ -->
  {#each uniqueFonts as font}
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family={font.trim().replace(/\s+/g, '+')}:wght@400;500;700&display=swap" />
  {/each}
</svelte:head>

<main 
  class="flex min-h-screen flex-col items-center justify-center p-4 bg-cover bg-center bg-no-repeat relative transition-all duration-700"
  style="
    background-image: {theme.bgType === 'image' && theme.bgUrl ? `url(${theme.bgUrl})` : 'none'}; 
    background-color: {theme.bgType === 'solid' ? theme.bgColor : '#0b0f19'};
  "
>
  <div class="absolute inset-0 bg-slate-950/70 backdrop-blur-[4px] -z-10"></div>

  <!-- 📦 กล่องฟอร์มกระจกแก้วสเกลหลักคุมผ่าน CSS Properties ตัวแปรสีจาง Placeholder -->
  <form 
    onsubmit={handleDonate} 
    class="w-full max-w-xl p-6 md:p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border relative overflow-hidden space-y-6"
    style="
      background-color: {hexToRgba(theme.cardBgColor, theme.cardOpacity)};
      border-color: {hexToRgba(theme.cardBorderColor, theme.cardBorderOpacity)};
      backdrop-filter: blur({theme.cardBlur}px);
      --placeholder-color: {theme.placeholderColor || '#64748b'};
      --placeholder-font: '{theme.placeholderFontFamily || theme.welcomeFontFamily}', sans-serif;
    "
  >
    <!-- 🛡️ กับดักสแปมแบบซ่อนตามมาตรฐานสากล -->
    <div class="hidden">
      <input type="text" name="email_confirm" bind:value={honeypot} tabindex="-1" autocomplete="off" />
    </div>

    <!-- ส่วนแบนเนอร์กับโปรไฟล์ Left-Aligned เกยแบนเนอร์เพียง 10% พร้อม Fade Blending ทับแผ่นสีหลังส่วนหัวโปรไฟล์ -->
    <div 
      class="relative rounded-2xl overflow-hidden border border-slate-800/30 pb-5 transition-all duration-500"
      style="background-color: {hexToRgba(theme.profileAreaBgColor, theme.profileAreaOpacity)};"
    >
      <!-- แบนเนอร์ h-52 sm:h-64 -->
      <div class="relative">
        {#if theme.bannerUrl}
          <div class="w-full h-52 sm:h-64 bg-cover bg-center opacity-50 transition-all duration-500" style="background-image: url({theme.bannerUrl});"></div>
        {:else}
          <div class="w-full h-52 sm:h-64 bg-slate-900 opacity-50"></div>
        {/if}

        <!-- Gradient Transition Overlay ไล่สีกลมกลืนแบบนุ่มนวล -->
        <div 
          class="absolute bottom-0 left-0 right-0 h-24
