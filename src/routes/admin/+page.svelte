<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  
  // 🛡️ ดึงข้อมูลธีมที่โหลดมาจาก Cloudflare KV หน้า Server Load ล่าสุด
  let { data } = $props();
  
  let config = $state({
    ...data.theme,
    presetAmounts: data.theme.presetAmounts && data.theme.presetAmounts.length === 4 
      ? [...data.theme.presetAmounts] 
      : [100, 300, 500, 1000],
    mainFontFamily: data.theme.mainFontFamily ?? 'Mitr',
    nicknameLabel: data.theme.nicknameLabel ?? 'ชื่อเล่นของคุณ',
    nicknamePlaceholder: data.theme.nicknamePlaceholder ?? 'พิมพ์ชื่อเล่นที่นี่...',
    messageLabel: data.theme.messageLabel ?? 'ข้อความสนับสนุน',
    messagePlaceholder: data.theme.messagePlaceholder ?? 'พิมพ์ข้อความให้สตรีมเมอร์ชื่นใจ...',
    presetLabel: data.theme.presetLabel ?? 'ปุ่มสนับสนุนด่วน',
    amountLabel: data.theme.amountLabel ?? 'ระบุจำนวนเงินเอง (บาท)',
    amountPlaceholder: data.theme.amountPlaceholder ?? 'ป้อนจำนวนเงิน (10 - 5,000 บาท)...',
    
    submitBtnText: data.theme.submitBtnText ?? 'โดเนทสนับสนุน 💖',
    submitBtnColor: data.theme.submitBtnColor ?? '#db2777',
    submitBtnTextColor: data.theme.submitBtnTextColor ?? '#ffffff',

    successTitle: data.theme.successTitle ?? 'โดเนทสำเร็จแล้วน้า! 🎉',
    successTitleColor: data.theme.successTitleColor ?? '#10b981',
    successFontFamily: data.theme.successFontFamily ?? 'Mitr',
    successMessage: data.theme.successMessage ?? 'ขอบคุณสำหรับการสนับสนุนนะคะ ระบบส่งข้อความและยอดเงินของคุณขึ้นจอ OBS ของสตรีมเมอร์เรียบร้อยแล้วค่ะ 💕',
    successMessageColor: data.theme.successMessageColor ?? '#cbd5e1',
    successEmoji: data.theme.successEmoji ?? '🎉',
    successBtnText: data.theme.successBtnText ?? 'กลับหน้าหลัก',
    successBtnColor: data.theme.successBtnColor ?? '#10b981',
    successBtnTextColor: data.theme.successBtnTextColor ?? '#ffffff',

    failureTitle: data.theme.failureTitle ?? 'ทำรายการไม่สำเร็จ',
    failureTitleColor: data.theme.failureTitleColor ?? '#ef4444',
    failureFontFamily: data.theme.failureFontFamily ?? 'Mitr',
    failureMessage: data.theme.failureMessage ?? 'รายการชำระเงินถูกยกเลิก หรือหมดอายุการสแกน QR Code ค่ะ',
    failureMessageColor: data.theme.failureMessageColor ?? '#cbd5e1',
    failureEmoji: data.theme.failureEmoji ?? '❌',
    failureBtnText: data.theme.failureBtnText ?? 'กลับหน้าหลัก/ลองอีกครั้ง',
    failureBtnColor: data.theme.failureBtnColor ?? '#ef4444',
    failureBtnTextColor: data.theme.failureBtnTextColor ?? '#ffffff'
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
        alert('🎉 อัปเดตสไตล์และบันทึกขึ้น Cloudflare KV สำเร็จเรียบร้อยแล้วค่ะ!');
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
                <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm" bind:value={config.amountPlaceholder} />
              </div>
            </div>

            <!-- จัดตั้งค่าปุ่มโดเนทหลัก -->
            <div class="border-t border-slate-800 pt-4 space-y-4">
              <h3 class="text-xs font-black text-pink-400 uppercase tracking-wider">🔘 ตั้งค่าดีไซน์ปุ่มโดเนทส่งเงิน</h3>
              <div>
                <label class="block text-xs font-bold text-slate-400 mb-1">ข้อความปุ่มสนับสนุนหลัก</label>
                <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm" bind:value={config.submitBtnText} />
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-400 mb-1">สีปุ่มส่งเงิน</label>
                  <div class="flex gap-2">
                    <input type="color" class="w-10 h-10 border-0 rounded cursor-pointer" bind:value={config.submitBtnColor} />
                    <input type="text" class="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs uppercase" bind:value={config.submitBtnColor} />
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-400 mb-1">สีอักษรส่งเงิน</label>
                  <div class="flex gap-2">
                    <input type="color" class="w-10 h-10 border-0 rounded cursor-pointer" bind:value={config.submitBtnTextColor} />
                    <input type="text" class="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs uppercase" bind:value={config.submitBtnTextColor} />
                  </div>
                </div>
              </div>
            </div>

            <!-- การตั้งสไตล์ Wallpaper -->
            <div class="border-t border-slate-800 pt-4 space-y-4">
              <h3 class="text-xs font-black text-slate-300">🖼️ จัดพื้นหลังและแผงกระจก</h3>
              <div class="grid grid-cols-2 gap-3">
                <button class="py-2 rounded-lg font-bold text-xs cursor-pointer border {config.bgType === 'solid' ? 'bg-pink-600 border-pink-500' : 'bg-slate-950 border-slate-800'}" onclick={() => config.bgType = 'solid'}>สีทึบพื้นหลัง</button>
                <button class="py-2 rounded-lg font-bold text-xs cursor-pointer border {config.bgType === 'image' ? 'bg-pink-600 border-pink-500' : 'bg-slate-950 border-slate-800'}" onclick={() => config.bgType = 'image'}> Wallpaper รูปภาพ</button>
              </div>
              {#if config.bgType === 'solid'}
                <div class="flex gap-2">
                  <input type="color" class="w-10 h-10 border-0 rounded cursor-pointer" bind:value={config.bgColor} />
                  <input type="text" class="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs uppercase" bind:value={config.bgColor} />
                </div>
              {:else}
                <input type="text" placeholder="https://..." class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs" bind:value={config.bgUrl} />
              {/if}
            </div>
          </div>

        {:else if activeTab === 'success'}
          <!-- TAB 2: ปรับแต่งหน้าสำเร็จ -->
          <h2 class="text-sm font-bold text-white border-b border-slate-800 pb-2">🟢 ปรับแต่งรายละเอียดหน้าสำเร็จ (ใช้ฟอนต์ตัวเดียวกันทั้งหน้า)</h2>
          
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-400 mb-1">ฟอนต์หน้าสำเร็จ (Font Family)</label>
              <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" bind:value={config.successFontFamily} />
            </div>

            <div class="grid grid-cols-3 gap-4">
              <div class="col-span-1">
                <label class="block text-xs font-bold text-slate-400 mb-1">Emoji กลาง</label>
                <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-center text-lg font-bold" bind:value={config.successEmoji} />
              </div>
              <div class="col-span-2">
                <label class="block text-xs font-bold text-slate-400 mb-1">หัวข้อสำเร็จ</label>
                <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm" bind:value={config.successTitle} />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-400 mb-1">สีของหัวข้อเด่นสำเร็จ</label>
              <div class="flex gap-2">
                <input type="color" class="w-10 h-10 border-0 rounded cursor-pointer" bind:value={config.successTitleColor} />
                <input type="text" class="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs uppercase" bind:value={config.successTitleColor} />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-400 mb-1">รายละเอียดข้อความขอบคุณ</label>
              <textarea class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm" rows="3" bind:value={config.successMessage}></textarea>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-400 mb-1">สีตัวอักษรของข้อความคำขอบคุณ</label>
              <div class="flex gap-2">
                <input type="color" class="w-10 h-10 border-0 rounded cursor-pointer" bind:value={config.successMessageColor} />
                <input type="text" class="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs uppercase" bind:value={config.successMessageColor} />
              </div>
            </div>

            <div class="border-t border-slate-800 pt-4 space-y-4">
              <h3 class="text-xs font-black text-slate-300">🔘 ดีไซน์ปุ่มย้อนกลับหน้าสำเร็จ</h3>
              <div>
                <label class="block text-xs font-bold text-slate-400 mb-1">ข้อความแสดงบนปุ่มสำเร็จ</label>
                <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm" bind:value={config.successBtnText} />
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-400 mb-1">สีปุ่มสำเร็จ</label>
                  <div class="flex gap-2">
                    <input type="color" class="w-10 h-10 border-0 rounded cursor-pointer" bind:value={config.successBtnColor} />
                    <input type="text" class="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs uppercase" bind:value={config.successBtnColor} />
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-400 mb-1">สีอักษรปุ่มสำเร็จ</label>
                  <div class="flex gap-2">
                    <input type="color" class="w-10 h-10 border-0 rounded cursor-pointer" bind:value={config.successBtnTextColor} />
                    <input type="text" class="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs uppercase" bind:value={config.successBtnTextColor} />
                  </div>
                </div>
              </div>
            </div>
          </div>

        {:else if activeTab === 'failure'}
          <!-- TAB 3: ปรับแต่งหน้าล้มเหลว -->
          <h2 class="text-sm font-bold text-white border-b border-slate-800 pb-2">🔴 ปรับแต่งรายละเอียดหน้าล้มเหลว (ใช้ฟอนต์ตัวเดียวกันทั้งหน้า)</h2>
          
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-400 mb-1">ฟอนต์หน้าล้มเหลว (Font Family)</label>
              <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" bind:value={config.failureFontFamily} />
            </div>

            <div class="grid grid-cols-3 gap-4">
              <div class="col-span-1">
                <label class="block text-xs font-bold text-slate-400 mb-1">Emoji กลาง</label>
                <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-center text-lg font-bold" bind:value={config.failureEmoji} />
              </div>
              <div class="col-span-2">
                <label class="block text-xs font-bold text-slate-400 mb-1">หัวข้อล้มเหลว</label>
                <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm" bind:value={config.failureTitle} />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-400 mb-1">สีของหัวข้อล้มเหลว</label>
              <div class="flex gap-2">
                <input type="color" class="w-10 h-10 border-0 rounded cursor-pointer" bind:value={config.failureTitleColor} />
                <input type="text" class="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs uppercase" bind:value={config.failureTitleColor} />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-400 mb-1">รายละเอียดสาเหตุข้อผิดพลาด</label>
              <textarea class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm" rows="3" bind:value={config.failureMessage}></textarea>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-400 mb-1">สีตัวอักษรสาเหตุ</label>
              <div class="flex gap-2">
                <input type="color" class="w-10 h-10 border-0 rounded cursor-pointer" bind:value={config.failureMessageColor} />
                <input type="text" class="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs uppercase" bind:value={config.failureMessageColor} />
              </div>
            </div>

            <div class="border-t border-slate-800 pt-4 space-y-4">
              <h3 class="text-xs font-black text-slate-300">🔘 ดีไซน์ปุ่มย้อนกลับหน้าล้มเหลว</h3>
              <div>
                <label class="block text-xs font-bold text-slate-400 mb-1">ข้อความแสดงบนปุ่มล้มเหลว</label>
                <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm" bind:value={config.failureBtnText} />
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-400 mb-1">สีปุ่มล้มเหลว</label>
                  <div class="flex gap-2">
                    <input type="color" class="w-10 h-10 border-0 rounded cursor-pointer" bind:value={config.failureBtnColor} />
                    <input type="text" class="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs uppercase" bind:value={config.failureBtnColor} />
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-400 mb-1">สีอักษรปุ่มล้มเหลว</label>
                  <div class="flex gap-2">
                    <input type="color" class="w-10 h-10 border-0 rounded cursor-pointer" bind:value={config.failureBtnTextColor} />
                    <input type="text" class="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs uppercase" bind:value={config.failureBtnTextColor} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        {/if}

      </div>
    </div>

    <!-- 📺 ฝั่งขวา: หน้าพรีวิวจำลองแยกอิสระ (Mockup Frame - RIGHT) -->
    <div class="flex flex-col items-center justify-center p-2 bg-slate-900 border border-slate-800 rounded-3xl min-h-[550px] relative">
      
      <!-- โครงสมาร์ทโฟนปิดฉากความเพี้ยนสี (Isolated Canvas Container) -->
      <div 
        class="relative w-full max-w-[340px] h-[580px] rounded-[36px] shadow-[0_15px_35px_rgba(0,0,0,0.6)] bg-slate-950 overflow-hidden border border-slate-800 flex flex-col"
        style="
          background-image: {config.bgType === 'image' && config.bgUrl ? `url(${config.bgUrl})` : 'none'}; 
          background-color: {config.bgType === 'solid' ? config.bgColor : '#0c111d'};
          background-size: cover;
          background-position: center;
        "
      >
        <div class="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] -z-10"></div>

        <!-- หน้าจอพรีวิวแบบแก้วใส (Glassmorphism Mockup) -->
        <div class="flex-1 overflow-y-auto p-4 flex flex-col justify-center items-center">
          
          <div 
            class="w-full rounded-2xl border text-center p-4 relative overflow-hidden transition-all duration-300"
            style="
              background-color: {hexToRgba(config.cardBgColor, config.cardOpacity)};
              border-color: {hexToRgba(config.cardBorderColor, config.cardBorderOpacity)};
              backdrop-filter: blur({config.cardBlur}px);
              --placeholder-color: {config.placeholderColor || '#64748b'};
            "
          >
            {#if activeTab === 'main'}
              <!-- 📱 พรีวิวหน้าสนับสนุนหลักแบบละเอียดเท่าหน้าจริง -->
              <div class="space-y-3 text-left" style="font-family: '{config.mainFontFamily}', sans-serif;">
                
                <!-- ส่วนหัว Banner และ อวาตาร์ Overlap 10% และชิดซ้าย -->
                <div class="relative rounded-xl overflow-hidden pb-3 border border-slate-800/30" style="background-color: {hexToRgba(config.profileAreaBgColor, config.profileAreaOpacity)};">
                  <div class="relative">
                    {#if config.bannerUrl}
                      <div class="w-full h-24 bg-cover bg-center opacity-40" style="background-image: url({config.bannerUrl});"></div>
                    {:else}
                      <div class="w-full h-24 bg-slate-900 opacity-40"></div>
                    {/if}
                    <div class="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t" style="background-image: linear-gradient(to top, {hexToRgba(config.profileAreaBgColor, config.profileAreaOpacity)}, transparent);"></div>
                  </div>

                  <div class="flex flex-col items-center sm:items-start text-center sm:text-left px-3 -mt-3 relative z-10 w-full">
                    <div class="relative flex-shrink-0">
                      <img src={config.avatarUrl || 'https://placehold.co/150'} alt="Avatar" class="w-14 h-14 rounded-full border-2 border-slate-950 object-cover" />
                    </div>
                    <div class="mt-1 w-full">
                      <h3 class="font-extrabold text-xs" style="color: {config.nameColor};">{config.vtuberName}</h3>
                      <p class="text-[9px] text-slate-300 leading-tight line-clamp-2">{config.welcomeText}</p>
                      
                      <!-- แสดง Social Links เลียนแบบหน้าจริง -->
                      <div class="flex flex-wrap gap-1 mt-1.5 justify-center sm:justify-start">
                        {#each config.socialLinks || [] as link}
                          {#if link.url}
                            <span class="px-1.5 py-0.5 rounded border text-[8px] uppercase font-black" style="border-color: {config.socialColor || '#db2777'}; color: {config.socialColor || '#db2777'}; bg-slate-950/40">
                              {link.platform}
                            </span>
                          {/if}
                        {/each}
                      </div>
                    </div>
                  </div>
                </div>

                <!-- ช่องกรอกชื่อเล่น (จำลองป้ายกำกับและ Placeholder ตามจริง) -->
                <div>
                  <span class="block text-[10px] font-bold text-slate-400 mb-1">{config.nicknameLabel}</span>
                  <div class="w-full px-3 py-2 rounded-lg bg-slate-950/40 border border-slate-800 text-[10px] text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap">{config.nicknamePlaceholder}</div>
                </div>

                <!-- ช่องข้อความ (จำลองคำกำกับและ Placeholder ตามจริง) -->
                <div>
                  <span class="block text-[10px] font-bold text-slate-400 mb-1">{config.messageLabel}</span>
                  <div class="w-full px-3 py-2 rounded-lg bg-slate-950/40 border border-slate-800 text-[10px] text-slate-500 min-h-[36px]">{config.messagePlaceholder}</div>
                </div>

                <!-- ยอดเงินด่วน (ดึงค่า PresetAmounts ที่แก้ไขเรียลไทม์มาแสดงผล) -->
                <div class="space-y-1">
                  <span class="block text-[10px] font-bold text-slate-400">{config.presetLabel}</span>
                  <div class="grid grid-cols-4 gap-1">
                    {#each config.presetAmounts as amt}
                      <button type="button" class="py-1 text-[10px] font-extrabold rounded-lg bg-slate-950/50 border border-slate-800 text-slate-300 cursor-default">{amt}฿</button>
                    {/each}
                  </div>
                </div>

                <!-- ระบุยอดเงินเอง -->
                <div>
                  <span class="block text-[10px] font-bold text-slate-400 mb-1">{config.amountLabel}</span>
                  <div class="w-full px-3 py-2 rounded-lg bg-slate-950/40 border border-slate-800 text-[10px] text-slate-500 font-extrabold">{config.amountPlaceholder}</div>
                </div>

                <!-- ปุ่มส่งโดเนทหลัก -->
                <button type="button" class="w-full py-2.5 rounded-xl text-xs font-black shadow cursor-default" style="background-color: {config.submitBtnColor}; color: {config.submitBtnTextColor};">
                  {config.submitBtnText || 'โดเนทสนับสนุน 💖'}
                </button>
              </div>

            {:else if activeTab === 'success'}
              <!-- 🟢 พรีวิวหน้าสำเร็จแบบเทียบเท่าจริง -->
              <div class="space-y-4 py-4" style="font-family: '{config.successFontFamily}', sans-serif;">
                <div class="text-5xl animate-bounce">{config.successEmoji}</div>
                <h3 class="text-sm font-black" style="color: {config.successTitleColor};">{config.successTitle}</h3>
                <p class="text-[10px] text-slate-300 leading-relaxed">{config.successMessage}</p>
                <button type="button" class="w-full py-2.5 rounded-xl text-xs font-extrabold cursor-default" style="background-color: {config.successBtnColor}; color: {config.successBtnTextColor};">
                  {config.successBtnText}
                </button>
              </div>

            {:else if activeTab === 'failure'}
              <!-- 🔴 พรีวิวหน้าล้มเหลวแบบเทียบเท่าจริง -->
              <div class="space-y-4 py-4" style="font-family: '{config.failureFontFamily}', sans-serif;">
                <div class="text-5xl animate-pulse">{config.failureEmoji}</div>
                <h3 class="text-sm font-black" style="color: {config.failureTitleColor};">{config.failureTitle}</h3>
                <p class="text-[10px] text-slate-300 leading-relaxed">{config.failureMessage}</p>
                <button type="button" class="w-full py-2.5 rounded-xl text-xs font-extrabold cursor-default" style="background-color: {config.failureBtnColor}; color: {config.failureBtnTextColor};">
                  {config.failureBtnText}
                </button>
              </div>
            {/if}
          </div>

        </div>
      </div>
    </div>

  </div>
</div>
