<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import theme from '$lib/config/theme.json';

  let config = $state({
    ...theme,
    presetAmounts: theme.presetAmounts && theme.presetAmounts.length === 4 
      ? [...theme.presetAmounts] 
      : [100, 300, 500, 1000],
    mainFontFamily: theme.mainFontFamily ?? 'Mitr',
    nicknameLabel: theme.nicknameLabel ?? 'ชื่อเล่นของคุณ',
    nicknamePlaceholder: theme.nicknamePlaceholder ?? 'พิมพ์ชื่อเล่นที่นี่...',
    messageLabel: theme.messageLabel ?? 'ข้อความสนับสนุน',
    messagePlaceholder: theme.messagePlaceholder ?? 'พิมพ์ข้อความให้สตรีมเมอร์ชื่นใจ...',
    presetLabel: theme.presetLabel ?? 'ปุ่มสนับสนุนด่วน',
    amountLabel: theme.amountLabel ?? 'ระบุจำนวนเงินเอง (บาท)',
    amountPlaceholder: theme.amountPlaceholder ?? 'ป้อนจำนวนเงิน (10 - 5,000 บาท)...',
    
    submitBtnText: theme.submitBtnText ?? 'โดเนทสนับสนุน 💖',
    submitBtnColor: theme.submitBtnColor ?? '#db2777',
    submitBtnTextColor: theme.submitBtnTextColor ?? '#ffffff',

    successTitle: theme.successTitle ?? 'โดเนทสำเร็จแล้วน้า! 🎉',
    successTitleColor: theme.successTitleColor ?? '#10b981',
    successFontFamily: theme.successFontFamily ?? 'Mitr',
    successMessage: theme.successMessage ?? 'ขอบคุณสำหรับการสนับสนุนนะคะ ระบบส่งข้อความและยอดเงินของคุณขึ้นจอ OBS ของสตรีมเมอร์เรียบร้อยแล้วค่ะ 💕',
    successMessageColor: theme.successMessageColor ?? '#cbd5e1',
    successEmoji: theme.successEmoji ?? '🎉',
    successBtnText: theme.successBtnText ?? 'กลับหน้าหลัก',
    successBtnColor: theme.successBtnColor ?? '#10b981',
    successBtnTextColor: theme.successBtnTextColor ?? '#ffffff',

    failureTitle: theme.failureTitle ?? 'ทำรายการไม่สำเร็จ',
    failureTitleColor: theme.failureTitleColor ?? '#ef4444',
    failureFontFamily: theme.failureFontFamily ?? 'Mitr',
    failureMessage: theme.failureMessage ?? 'รายการชำระเงินถูกยกเลิก หรือหมดอายุการสแกน QR Code ค่ะ',
    failureMessageColor: theme.failureMessageColor ?? '#cbd5e1',
    failureEmoji: theme.failureEmoji ?? '❌',
    failureBtnText: theme.failureBtnText ?? 'กลับหน้าหลัก/ลองอีกครั้ง',
    failureBtnColor: theme.failureBtnColor ?? '#ef4444',
    failureBtnTextColor: theme.failureBtnTextColor ?? '#ffffff'
  });

  let activeTab = $state<'main' | 'success' | 'failure'>('main');
  let isAuthenticated = $state(false);
  let password = $state('');
  let authError = $state('');
  let authLoading = $state(false);
  let saveLoading = $state(false);

  const uniqueFonts = $derived([
    ...new Set([
      config.mainFontFamily,
      config.successFontFamily,
      config.failureFontFamily
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

  onMount(() => {
    if (browser) {
      const isVerified = sessionStorage.getItem('admin_verified') === 'true';
      const storedPass = sessionStorage.getItem('admin_pass_key');
      if (isVerified && storedPass) {
        password = storedPass;
        isAuthenticated = true;
      }
    }
  });

  const handleVerify = async (e: Event) => {
    e.preventDefault();
    authLoading = true;
    authError = '';
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        sessionStorage.setItem('admin_verified', 'true');
        sessionStorage.setItem('admin_pass_key', password);
        isAuthenticated = true;
      } else {
        authError = data.error || 'รหัสผ่านไม่ถูกต้องค่ะ';
      }
    } catch {
      authError = 'เกิดข้อผิดพลาดในการเชื่อมต่อด่านตรวจรหัสผ่าน';
    } finally {
      authLoading = false;
    }
  };

  const handleSave = async () => {
    saveLoading = true;
    try {
      const res = await fetch('/api/admin/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, config })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('🎉 อัปเดตสไตล์และบันทึกขึ้น GitHub Content API สำเร็จแล้วค่ะ!');
      } else {
        alert(data.error || 'บันทึกไม่สำเร็จเนื่องจากพารามิเตอร์ไม่ผ่านด่านตรวจความปลอดภัยค่ะ');
      }
    } catch {
      alert('ระบบหลังบ้านไม่ว่างชั่วคราวค่ะ');
    } finally {
      saveLoading = false;
    }
  };
</script>

<svelte:head>
  <title>ระบบหลังบ้านผู้ดูแลระบบ 💅</title>
  {#each uniqueFonts as font}
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family={font.trim().replace(/\s+/g, '+')}:wght@400;500;700&display=swap" />
  {/each}
</svelte:head>

{#if !isAuthenticated}
  <div class="fixed inset-0 bg-slate-950 z-50 flex items-center justify-center p-4">
    <form onsubmit={handleVerify} class="w-full max-sm:max-w-xs max-w-sm p-8 bg-slate-900 border border-slate-800 rounded-3xl space-y-6 shadow-2xl">
      <div class="text-center">
        <span class="text-4xl text-pink-500">🔒</span>
        <h1 class="text-lg font-extrabold mt-3 text-white">ระบบรักษาความปลอดภัยแอดมิน</h1>
      </div>
      {#if authError}
        <div class="p-3 bg-red-950/50 border border-red-500/30 text-red-400 text-xs text-center rounded-xl font-bold animate-pulse">{authError}</div>
      {/if}
      <div class="space-y-1">
        <label for="pwd" class="text-xs font-bold text-slate-300 uppercase">ADMIN PASSWORD</label>
        <input id="pwd" type="password" required placeholder="••••••••••••" class="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-pink-500 focus:outline-none text-white text-sm" bind:value={password} />
      </div>
      <button type="submit" disabled={authLoading} class="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-600 font-bold rounded-xl cursor-pointer transition text-white">ล็อกอินแผงควบคุม</button>
    </form>
  </div>
{/if}

<div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
  <header class="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-30">
    <div class="flex items-center gap-3">
      <span class="text-2xl">🎨</span>
      <div>
        <h1 class="font-extrabold text-base text-white">VTuber secure tipping admin</h1>
      </div>
    </div>
    <button onclick={handleSave} disabled={saveLoading} class="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-xl cursor-pointer transition">
      {saveLoading ? '⏳ กำลังบันทึก...' : '💾 บันทึกสไตล์ทั้งหมด'}
    </button>
  </header>

  <!-- สัดส่วน 2 ปีก: ปรับแต่ง (ซ้าย) VS หน้าต่างจำลองแยกผ้าใบอิสระ (ขวา) -->
  <div class="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-8 p-6 max-w-7xl w-full mx-auto">
    
    <!-- 🎛️ ฝั่งซ้าย: โซนควบคุม (Controls - LEFT) -->
    <div class="space-y-6">
      
      <!-- ปุ่มเลือกแท็บตกแต่งเฉพาะหน้า -->
      <div class="grid grid-cols-3 gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl">
        <button onclick={() => activeTab = 'main'} class="py-2.5 px-1 font-extrabold rounded-xl text-xs sm:text-sm cursor-pointer {activeTab === 'main' ? 'bg-pink-600 text-white shadow' : 'text-slate-400 hover:text-white'}">📱 ตกแต่งหน้าแรก</button>
        <button onclick={() => activeTab = 'success'} class="py-2.5 px-1 font-extrabold rounded-xl text-xs sm:text-sm cursor-pointer {activeTab === 'success' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}">🟢 ตกแต่งหน้าสำเร็จ</button>
        <button onclick={() => activeTab = 'failure'} class="py-2.5 px-1 font-extrabold rounded-xl text-xs sm:text-sm cursor-pointer {activeTab === 'failure' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-white'}">🔴 ตกแต่งหน้าล้มเหลว</button>
      </div>

      <div class="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 space-y-6 max-h-[72vh] overflow-y-auto">
        
        {#if activeTab === 'main'}
          <!-- TAB 1: ปรับแต่งหน้าแรกโดเนท -->
          <h2 class="text-sm font-bold text-white border-b border-slate-800 pb-2">📱 ปรับแต่งหน้าสนับสนุนหลัก (ใช้ฟอนต์ตัวเดียวกันทั้งหน้า)</h2>
          
          <div class="space-y-4">
            <!-- ตั้งค่าฟอนต์เดี่ยวร่วมทั้งหน้า -->
            <div>
              <label class="block text-xs font-bold text-slate-400 mb-1">ฟอนต์หน้าหลัก (Font Family เช่น Mitr, Kanit, Sarabun)</label>
              <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" bind:value={config.mainFontFamily} />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-400 mb-1">ชื่อสตรีมเมอร์</label>
                <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" bind:value={config.vtuberName} />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-400 mb-1">สีตัวอักษรชื่อ</label>
                <div class="flex gap-2">
                  <input type="color" class="w-10 h-10 border-0 rounded cursor-pointer" bind:value={config.nameColor} />
                  <input type="text" class="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs uppercase" bind:value={config.nameColor} />
                </div>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-400 mb-1">ข้อความต้อนรับสนับสนุน</label>
              <textarea class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm" rows="2" bind:value={config.welcomeText}></textarea>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-400 mb-1">ลิงก์อวาตาร์กลม</label>
                <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs" bind:value={config.avatarUrl} />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-400 mb-1">ลิงก์แบนเนอร์หลัง</label>
                <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs" bind:value={config.bannerUrl} />
              </div>
            </div>

            <!-- ตั้งค่าตัวเลข Preset ยอดเงิน -->
            <div class="border-t border-slate-800 pt-4 space-y-3">
              <h3 class="text-xs font-black text-pink-400 uppercase tracking-wider">💵 แก้ไข Preset ยอดเงินสนับสนุนด่วน (บาท)</h3>
              <div class="grid grid-cols-4 gap-2">
                {#each [0, 1, 2, 3] as idx}
                  <div>
                    <label class="block text-[10px] font-bold text-slate-400 mb-1">ปุ่มที่ {idx+1}</label>
                    <input type="number" class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-center text-xs font-bold" bind:value={config.presetAmounts[idx]} />
                  </div>
                {/each}
              </div>
            </div>

            <!-- ตั้งค่าข้อความและ Placeholder ทุกจุด -->
            <div class="border-t border-slate-800 pt-4 space-y-4">
              <h3 class="text-xs font-black text-pink-400 uppercase tracking-wider">✍️ ตั้งค่าข้อความและ Placeholder</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-400 mb-1">ป้ายชื่อเล่น</label>
                  <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm" bind:value={config.nicknameLabel} />
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-400 mb-1">ข้อความไกด์ในชื่อเล่น</label>
                  <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm" bind:value={config.nicknamePlaceholder} />
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-400 mb-1">ป้ายช่องข้อความ</label>
                  <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm" bind:value={config.messageLabel} />
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-400 mb-1">ข้อความไกด์ในช่องข้อความ</label>
                  <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm" bind:value={config.messagePlaceholder} />
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-400 mb-1">ป้ายกำกับปุ่ม Preset</label>
                  <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm" bind:value={config.presetLabel} />
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-400 mb-1">ป้ายระบุเงินเอง</label>
                  <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm" bind:value={config.amountLabel} />
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-400 mb-1">ข้อความไกด์ในระบุเงินเอง</label>
                <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-sla
