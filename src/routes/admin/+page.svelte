<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import theme from '$lib/config/theme.json';

  let config = $state({
    ...theme,
    nicknameLabel: theme.nicknameLabel ?? 'ชื่อเล่นของคุณ',
    nicknamePlaceholder: theme.nicknamePlaceholder ?? 'พิมพ์ชื่อเล่นที่นี่...',
    messageLabel: theme.messageLabel ?? 'ข้อความสนับสนุน',
    messagePlaceholder: theme.messagePlaceholder ?? 'พิมพ์ข้อความให้สตรีมเมอร์ชื่นใจ...',
    presetLabel: theme.presetLabel ?? 'ปุ่มสนับสนุนด่วน',
    amountLabel: theme.amountLabel ?? 'ระบุจำนวนเงินเอง (บาท)',
    amountPlaceholder: theme.amountPlaceholder ?? 'ป้อนจำนวนเงิน (10 - 5,000 บาท)...',
    
    // ตั้งค่าปุ่มหลัก (เทียบเท่าปุ่มกลับหน้าหลัก)
    submitBtnText: theme.submitBtnText ?? 'โดเนทสนับสนุน 💖',
    submitBtnColor: theme.submitBtnColor ?? '#db2777',
    submitBtnTextColor: theme.submitBtnTextColor ?? '#ffffff',
    submitBtnFontFamily: theme.submitBtnFontFamily ?? 'Mitr',

    successTitle: theme.successTitle ?? 'โดเนทสำเร็จแล้วน้า! 🎉',
    successTitleColor: theme.successTitleColor ?? '#10b981',
    successTitleFontFamily: theme.successTitleFontFamily ?? 'Mitr',
    successMessage: theme.successMessage ?? 'ขอบคุณสำหรับการสนับสนุนนะคะ ระบบส่งข้อความและยอดเงินของคุณขึ้นจอ OBS ของสตรีมเมอร์เรียบร้อยแล้วค่ะ 💕',
    successMessageColor: theme.successMessageColor ?? '#cbd5e1',
    successMessageFontFamily: theme.successMessageFontFamily ?? 'Mitr',
    successEmoji: theme.successEmoji ?? '🎉',
    successBtnText: theme.successBtnText ?? 'กลับหน้าหลัก',
    successBtnColor: theme.successBtnColor ?? '#10b981',
    successBtnTextColor: theme.successBtnTextColor ?? '#ffffff',

    failureTitle: theme.failureTitle ?? 'ทำรายการไม่สำเร็จ',
    failureTitleColor: theme.failureTitleColor ?? '#ef4444',
    failureTitleFontFamily: theme.failureTitleFontFamily ?? 'Mitr',
    failureMessage: theme.failureMessage ?? 'รายการชำระเงินถูกยกเลิก หรือหมดอายุการสแกน QR Code ค่ะ',
    failureMessageColor: theme.failureMessageColor ?? '#cbd5e1',
    failureMessageFontFamily: theme.failureMessageFontFamily ?? 'Mitr',
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
      config.nameFontFamily,
      config.welcomeFontFamily,
      config.labelFontFamily,
      config.presetFontFamily,
      config.submitBtnFontFamily,
      config.successTitleFontFamily,
      config.successMessageFontFamily,
      config.failureTitleFontFamily,
      config.failureMessageFontFamily
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
        alert('🎉 บันทึกการเปลี่ยนแปลงเรียบร้อยแล้วค่ะ! กรุณารอสักครู่ให้โฮสติ้งทำการบิวด์ข้อมูลสไตล์ใหม่นะคะ');
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
    <form onsubmit={handleVerify} class="w-full max-w-sm p-8 bg-slate-900 border border-slate-800 rounded-3xl space-y-6 shadow-2xl">
      <div class="text-center">
        <span class="text-4xl text-pink-500">🔒</span>
        <h1 class="text-xl font-extrabold mt-3 text-white">แผงความปลอดภัยหลังบ้าน</h1>
        <p class="text-xs text-slate-400 mt-1">กรุณากรอกรหัสแอดมินเพื่อปลดล็อก</p>
      </div>
      {#if authError}
        <div class="p-3 bg-red-950/50 border border-red-500/30 text-red-400 text-xs text-center rounded-xl font-bold animate-pulse">{authError}</div>
      {/if}
      <div class="space-y-1">
        <label for="pwd" class="text-xs font-bold text-slate-300 uppercase tracking-wider font-sans">ADMIN PASSWORD</label>
        <input id="pwd" type="password" required placeholder="•••••••••••••••" class="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-pink-500 focus:outline-none transition-all text-white" bind:value={password} />
      </div>
      <button type="submit" disabled={authLoading} class="w-full py-3.5 bg-gradient-to-r from-pink-500 to-rose-600 font-bold rounded-xl cursor-pointer transition text-white">
        {authLoading ? 'กำลังปลดม่านหลังบ้าน...' : 'ล็อกอินเข้าแผงควบคุม'}
      </button>
    </form>
  </div>
{/if}

<div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
  <header class="border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-30">
    <div class="flex items-center gap-3">
      <span class="text-2xl">🎨</span>
      <div>
        <h1 class="font-extrabold text-lg text-white">VTuber Secure Tip Configurator</h1>
        <p class="text-xs text-slate-400">ระบบตกแต่ง ปรับเปลี่ยน และดูแลสไตล์การรับโอนเงิน</p>
      </div>
    </div>
    <div class="flex items-center gap-3 w-full sm:w-auto">
      <button onclick={handleSave} disabled={saveLoading} class="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-bold rounded-xl cursor-pointer transition flex items-center justify-center gap-2">
        {saveLoading ? '⏳ กำลังบันทึก...' : '💾 บันทึกสไตล์ทั้งหมด'}
      </button>
    </div>
  </header>

  <!-- โซนแบ่งสัดส่วน: ตกแต่งฝั่งซ้าย (Left Column Controls) VS หน้า Mockup ฝั่งขวา (Right Column Live Preview) -->
  <div class="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-8 p-6 max-w-7xl w-full mx-auto">
    
    <!-- 🎛️ ฝั่งซ้าย: โซนปรับแต่งข้อความและแผ่นสีทั้งหมด (Controls - LEFT) -->
    <div class="space-y-6">
      
      <!-- ปุ่มเปลี่ยนหน้าเพื่อเข้าไปปรับแต่งตกแต่งเฉพาะแท็บ -->
      <div class="grid grid-cols-3 gap-2 p-1.5 bg-slate-900/80 border border-slate-800 rounded-2xl">
        <button onclick={() => activeTab = 'main'} class="py-3 px-1 font-extrabold rounded-xl transition text-xs sm:text-sm cursor-pointer {activeTab === 'main' ? 'bg-pink-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}">
          📱 ตกแต่งหน้าแรก (โดเนท)
        </button>
        <button onclick={() => activeTab = 'success'} class="py-3 px-1 font-extrabold rounded-xl transition text-xs sm:text-sm cursor-pointer {activeTab === 'success' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}">
          🟢 ตกแต่งหน้าสำเร็จ
        </button>
        <button onclick={() => activeTab = 'failure'} class="py-3 px-1 font-extrabold rounded-xl transition text-xs sm:text-sm cursor-pointer {activeTab === 'failure' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}">
          🔴 ตกแต่งหน้าล้มเหลว
        </button>
      </div>

      <div class="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-6 space-y-6 max-h-[72vh] overflow-y-auto">
        
        {#if activeTab === 'main'}
          <!-- ================= TAB 1: ปรับแต่งหน้าแรกโดเนท ================= -->
          <h2 class="text-base font-bold text-white border-b border-slate-800 pb-3">📱 ตั้งค่ารายละเอียดหน้าโดเนทหลัก</h2>
          
          <div class="space-y-4">
            <!-- ข้อมูล VTuber หัวเพจ -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-400 mb-1">ชื่อสตรีมเมอร์ (VTuber Name)</label>
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
              <label class="block text-xs font-bold text-slate-400 mb-1">ฟอนต์ชื่อ VTuber (Google Fonts)</label>
              <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" bind:value={config.nameFontFamily} />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-400 mb-1">ข้อความทักทายต้อนรับ</label>
              <textarea class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm" rows="2" bind:value={config.welcomeText}></textarea>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-400 mb-1">ลิงก์รูปอวาตาร์กลม</label>
                <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs" bind:value={config.avatarUrl} />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-400 mb-1">ลิงก์ภาพแบนเนอร์ด้านหลัง</label>
                <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs" bind:value={config.bannerUrl} />
              </div>
            </div>

            <!-- 🌟 ระบบแก้ไขรายละเอียดทุกช่องข้อความตามความต้องการของคุณ -->
            <div class="border-t border-slate-800/80 pt-4 space-y-4">
              <h3 class="text-xs font-black text-pink-400 tracking-wider uppercase">✍️ ตั้งค่าข้อความและ Placeholder ทุกจุดบนฟอร์ม</h3>
              
              <!-- ช่องชื่อเล่น -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-400 mb-1">ป้ายกำกับชื่อเล่น (Nickname Label)</label>
                  <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm" bind:value={config.nicknameLabel} />
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-400 mb-1">คำแนะนำในช่องชื่อเล่น (Placeholder)</label>
                  <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm" bind:value={config.nicknamePlaceholder} />
                </div>
              </div>

              <!-- ช่องข้อความโดเนท -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-400 mb-1">ป้ายคำขอบคุณ (Message Label)</label>
                  <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm" bind:value={config.messageLabel} />
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-400 mb-1">คำแนะนำในช่องข้อความ (Placeholder)</label>
                  <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm" bind:value={config.messagePlaceholder} />
                </div>
              </div>

              <!-- ปุ่มเงินด่วนและระบุเอง -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-400 mb-1">ป้ายปุ่มสนับสนุนด่วน</label>
                  <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm" bind:value={config.presetLabel} />
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-400 mb-1">ป้ายกำกับช่องระบุเงินเอง</label>
                  <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm" bind:value={config.amountLabel} />
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-400 mb-1">คำแนะนำในช่องระบุยอดเงินเอง (Placeholder)</label>
                <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm" bind:value={config.amountPlaceholder} />
              </div>
            </div>

            <!-- 🌟 ปรับปรุงปุ่มส่งเงินสนับสนุนหลักให้ตกแต่งเทียบเท่าปุ่ม Success/Failure -->
            <div class="border-t border-slate-800/80 pt-4 space-y-4">
              <h3 class="text-xs font-black text-pink-400 tracking-wider uppercase">🔘 ตั้งค่าปุ่มส่งยอดเงินชำระเงินโดเนทหลัก</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-400 mb-1">ข้อความแสดงบนปุ่ม</label>
                  <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm" bind:value={config.submitBtnText} />
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-400 mb-1">ตระกูลฟอนต์ของปุ่มส่งเงิน</label>
                  <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm" bind:value={config.submitBtnFontFamily} />
                </div>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-400 mb-1">สีพื้นหลังปุ่มโดเนทหลัก</label>
                  <div class="flex gap-2">
                    <input type="color" class="w-10 h-10 border-0 rounded cursor-pointer" bind:value={config.submitBtnColor} />
                    <input type="text" class="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs uppercase" bind:value={config.submitBtnColor} />
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-400 mb-1">สีตัวอักษรปุ่มโดเนทหลัก</label>
                  <div class="flex gap-2">
                    <input type="color" class="w-10 h-10 border-0 rounded cursor-pointer" bind:value={config.submitBtnTextColor} />
                    <input type="text" class="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs uppercase" bind:value={config.submitBtnTextColor} />
                  </div>
                </div>
              </div>
            </div>

            <!-- สไตล์พื้นหลังทั่วไป -->
            <div class="border-t border-slate-800/80 pt-4 space-y-4">
              <h3 class="text-xs font-black text-slate-300">🖼️ พื้นหลังและแผ่นสีพื้นหน้าเว็บ (Wallpaper Configuration)</h3>
              <div class="grid grid-cols-2 gap-3">
                <button class="py-2 rounded-lg font-bold text-xs cursor-pointer border {config.bgType === 'solid' ? 'bg-pink-600 border-pink-500' : 'bg-slate-950 border-slate-800'}" onclick={() => config.bgType = 'solid'}>สีพื้นหลังทึบ</button>
                <button class="py-2 rounded-lg font-bold text-xs cursor-pointer border {config.bgType === 'image' ? 'bg-pink-600 border-pink-500' : 'bg-slate-950 border-slate-800'}" onclick={() => config.bgType = 'image'}>Wallpaper รูปภาพ</button>
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
          <!-- ================= TAB 2: ปรับแต่งหน้าสำเร็จ (ไม่มีตัวปรับขนาดฟอนต์) ================= -->
          <h2 class="text-base font-bold text-white border-b border-slate-800 pb-3">🟢 ตกแต่งรายละเอียดหน้าทำรายการสำเร็จ</h2>
          
          <div class="space-y-4">
            <div class="grid grid-cols-3 gap-4">
              <div class="col-span-1">
                <label class="block text-xs font-bold text-slate-400 mb-1">Emoji กลาง</label>
                <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-center text-lg font-bold" bind:value={config.successEmoji} />
              </div>
              <div class="col-span-2">
                <label class="block text-xs font-bold text-slate-400 mb-1">หัวข้อเด่นสำเร็จ</label>
                <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm" bind:value={config.successTitle} />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-400 mb-1">สีของหัวข้อเด่น</label>
                <div class="flex gap-2">
                  <input type="color" class="w-10 h-10 border-0 rounded cursor-pointer" bind:value={config.successTitleColor} />
                  <input type="text" class="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs uppercase" bind:value={config.successTitleColor} />
                </div>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-400 mb-1">ฟอนต์ข้อความสำเร็จ</label>
                <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm" bind:value={config.successTitleFontFamily} />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-400 mb-1">ข้อความรายละเอียดแสดงคำขอบคุณ</label>
              <textarea class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm" rows="3" bind:value={config.successMessage}></textarea>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-400 mb-1">สีของข้อความชี้แจง</label>
                <div class="flex gap-2">
                  <input type="color" class="w-10 h-10 border-0 rounded cursor-pointer" bind:value={config.successMessageColor} />
                  <input type="text" class="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs uppercase" bind:value={config.successMessageColor} />
                </div>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-400 mb-1">ฟอนต์ข้อความคำขอบคุณ</label>
                <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm" bind:value={config.successMessageFontFamily} />
              </div>
            </div>

            <!-- รายละเอียดปุ่มหน้าโอนเงินสำเร็จ -->
            <div class="border-t border-slate-800/80 pt-4 space-y-4">
              <h3 class="text-xs font-black text-slate-300">🔘 รายละเอียดการจัดดีไซน์ปุ่มย้อนกลับ</h3>
              <div>
                <label class="block text-xs font-bold text-slate-400 mb-1">ข้อความแสดงบนปุ่มสำเร็จ</label>
                <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm" bind:value={config.successBtnText} />
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-400 mb-1">สีพื้นหลังปุ่มสำเร็จ</label>
                  <div class="flex gap-2">
                    <input type="color" class="w-10 h-10 border-0 rounded cursor-pointer" bind:value={config.successBtnColor} />
                    <input type="text" class="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs uppercase" bind:value={config.successBtnColor} />
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-400 mb-1">สีตัวอักษรบนปุ่มสำเร็จ</label>
                  <div class="flex gap-2">
                    <input type="color" class="w-10 h-10 border-0 rounded cursor-pointer" bind:value={config.successBtnTextColor} />
                    <input type="text" class="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs uppercase" bind:value={config.successBtnTextColor} />
                  </div>
                </div>
              </div>
            </div>
          </div>

        {:else if activeTab === 'failure'}
          <!-- ================= TAB 3: ปรับแต่งหน้าล้มเหลว (ไม่มีตัวปรับขนาดฟอนต์) ================= -->
          <h2 class="text-base font-bold text-white border-b border-slate-800 pb-3">🔴 ตกแต่งรายละเอียดหน้าทำรายการล้มเหลว</h2>
          
          <div class="space-y-4">
            <div class="grid grid-cols-3 gap-4">
              <div class="col-span-1">
                <label class="block text-xs font-bold text-slate-400 mb-1">Emoji กลาง</label>
                <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-center text-lg font-bold" bind:value={config.failureEmoji} />
              </div>
              <div class="col-span-2">
                <label class="block text-xs font-bold text-slate-400 mb-1">หัวข้อขัดข้องชี้แจง</label>
                <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm" bind:value={config.failureTitle} />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-400 mb-1">สีหัวข้อความล้มเหลว</label>
                <div class="flex gap-2">
                  <input type="color" class="w-10 h-10 border-0 rounded cursor-pointer" bind:value={config.failureTitleColor} />
                  <input type="text" class="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs uppercase" bind:value={config.failureTitleColor} />
                </div>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-400 mb-1">ฟอนต์ชื่อหัวข้อล้มเหลว</label>
                <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm" bind:value={config.failureTitleFontFamily} />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-400 mb-1">รายละเอียดชี้แจงความเสียหาย</label>
              <textarea class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm" rows="3" bind:value={config.failureMessage}></textarea>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-400 mb-1">สีของข้อความขัดข้อง</label>
                <div class="flex gap-2">
                  <input type="color" class="w-10 h-10 border-0 rounded cursor-pointer" bind:value={config.failureMessageColor} />
                  <input type="text" class="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs uppercase" bind:value={config.failureMessageColor} />
                </div>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-400 mb-1">ฟอนต์ข้อความขัดข้อง</label>
                <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm" bind:value={config.failureMessageFontFamily} />
              </div>
            </div>

            <!-- รายละเอียดปุ่มหน้าโอนเงินล้มเหลว -->
            <div class="border-t border-slate-800/80 pt-4 space-y-4">
              <h3 class="text-xs font-black text-slate-300">🔘 รายละเอียดการจัดดีไซน์ปุ่มย้อนกลับ</h3>
              <div>
                <label class="block text-xs font-bold text-slate-400 mb-1">ข้อความแสดงบนปุ่มล้มเหลว</label>
                <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm" bind:value={config.failureBtnText} />
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-400 mb-1">สีพื้นหลังปุ่มล้มเหลว</label>
                  <div class="flex gap-2">
                    <input type="color" class="w-10 h-10 border-0 rounded cursor-pointer" bind:value={config.failureBtnColor} />
                    <input type="text" class="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs uppercase" bind:value={config.failureBtnColor} />
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-400 mb-1">สีตัวอักษรบนปุ่มล้มเหลว</label>
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

    <!-- 📺 ฝั่งขวา: หน้าต่างพรีวิวตัวอย่างตามหน้าจอปัจจุบัน (Mockup - RIGHT) -->
    <div class="flex flex-col items-center justify-center p-4 rounded-3xl relative overflow-hidden border border-slate-800/80 min-h-[500px]"
      style="
        background-image: {config.bgType === 'image' && config.bgUrl ? `url(${config.bgUrl})` : 'none'}; 
        background-color: {config.bgType === 'solid' ? config.bgColor : '#0c111d'};
        background-size: cover;
        background-position: center;
      "
    >
      <div class="absolute inset-0 bg-slate-950/75 backdrop-blur-[2px]"></div>
      
      <span class="absolute top-4 left-4 z-20 text-[10px] font-black uppercase tracking-wider px-3 py-1 bg-slate-900 border border-slate-700 rounded-md text-slate-400 font-sans">
        Live Mockup (หน้า {activeTab === 'main' ? 'แรก' : activeTab === 'success' ? 'สำเร็จ' : 'ล้มเหลว'})
      </span>

      <!-- ตู้เรนเดอร์กระจกแก้วตามความสมดุล (Responsive Layout ในเฟรม Mockup) -->
      <div 
        class="w-full max-w-sm p-6 rounded-2xl border text-center relative overflow-hidden transition-all duration-300 z-10"
        style="
          background-color: {hexToRgba(config.cardBgColor, config.cardOpacity)};
          border-color: {hexToRgba(config.cardBorderColor, config.cardBorderOpacity)};
          backdrop-filter: blur({config.cardBlur}px);
        "
      >
        
        {#if activeTab === 'main'}
          <!-- พรีวิว หน้าหลักโดเนท -->
          <div class="space-y-4 text-left">
            <div class="relative rounded-xl overflow-hidden bg-slate-950 pb-3">
              {#if config.bannerUrl}
                <div class="w-full h-24 bg-cover bg-center opacity-40" style="background-image: url({config.bannerUrl});"></div>
              {:else}
                <div class="w-full h-24 bg-slate-900 opacity-40"></div>
              {/if}
              <div class="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-slate-950 to-transparent"></div>
              <div class="flex items-center gap-3 px-4 -mt-2 relative z-10">
                <img src={config.avatarUrl || 'https://placehold.co/150'} alt="Avatar" class="w-12 h-12 rounded-full border-2 border-slate-950 object-cover" />
                <div>
                  <h3 class="font-extrabold text-xs" style="color: {config.nameColor}; font-family: '{config.nameFontFamily}', sans-serif;">{config.vtuberName}</h3>
                  <p class="text-[10px] text-slate-400 line-clamp-1" style="font-family: '{config.welcomeFontFamily}', sans-serif;">{config.welcomeText}</p>
                </div>
              </div>
            </div>

            <!-- หน้าตาข้อความ Labels และช่องกรอกข้อมูลที่จะแสดงสดตามที่ผู้ใช้แก้คำ -->
            <div class="space-y-2">
              <div>
                <label class="block text-[10px] font-bold text-slate-400 mb-1">{config.nicknameLabel}</label>
                <div class="h-8 rounded bg-slate-950/50 border border-slate-800 flex items-center px-3 text-[10px] text-slate-500">{config.nicknamePlaceholder}</div>
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-400 mb-1">{config.messageLabel}</label>
                <div class="h-8 rounded bg-slate-950/50 border border-slate-800 flex items-center px-3 text-[10px] text-slate-500">{config.messagePlaceholder}</div>
              </div>
            </div>

            <button class="w-full py-3 rounded-lg font-bold text-xs cursor-pointer transition-all" style="background-color: {config.submitBtnColor}; color: {config.submitBtnTextColor}; font-family: '{config.submitBtnFontFamily}', sans-serif;">
              {config.submitBtnText || 'โดเนทสนับสนุน 💖'}
            </button>
          </div>

        {:else if activeTab === 'success'}
          <!-- พรีวิว หน้าชำระสำเร็จ -->
          <div class="space-y-4 py-4">
            <div class="text-5xl animate-bounce">{config.successEmoji}</div>
            <h3 class="text-lg font-black" style="color: {config.successTitleColor}; font-family: '{config.successTitleFontFamily}', sans-serif;">
              {config.successTitle}
            </h3>
            <p class="text-xs font-medium leading-relaxed" style="color: {config.successMessageColor}; font-family: '{config.successMessageFontFamily}', sans-serif;">
              {config.successMessage}
            </p>
            <button class="w-full py-3 rounded-lg font-bold text-xs" style="background-color: {config.successBtnColor}; color: {config.successBtnTextColor}; font-family: '{config.submitBtnFontFamily}', sans-serif;">
              {config.successBtnText}
            </button>
          </div>

        {:else if activeTab === 'failure'}
          <!-- พรีวิว หน้าชำระล้มเหลว -->
          <div class="space-y-4 py-4">
            <div class="text-5xl animate-pulse">{config.failureEmoji}</div>
            <h3 class="text-lg font-black" style="color: {config.failureTitleColor}; font-family: '{config.failureTitleFontFamily}', sans-serif;">
              {config.failureTitle}
            </h3>
            <p class="text-xs font-medium leading-relaxed" style="color: {config.failureMessageColor}; font-family: '{config.failureMessageFontFamily}', sans-serif;">
              {config.failureMessage}
            </p>
            <button class="w-full py-3 rounded-lg font-bold text-xs" style="background-color: {config.failureBtnColor}; color: {config.failureBtnTextColor}; font-family: '{config.submitBtnFontFamily}', sans-serif;">
              {config.failureBtnText}
            </button>
          </div>
        {/if}

      </div>
    </div>

  </div>
</div>
