<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import theme from '$lib/config/theme.json';

  // 🛡️ ป้องกันหน้าเว็บพังเมื่อตรวจไม่พบตัวแปรตกแต่งใหม่ใน theme.json ด้วยการวาง Default fallback ไว้ล่วงหน้า
  let config = $state({
    ...theme,
    successTitle: theme.successTitle ?? 'โดเนทสำเร็จแล้วน้า! 🎉',
    successTitleColor: theme.successTitleColor ?? '#10b981',
    successTitleFontFamily: theme.successTitleFontFamily ?? 'Mitr',
    successTitleFontSize: theme.successTitleFontSize ?? '28px',
    successMessage: theme.successMessage ?? 'ขอบคุณสำหรับการสนับสนุนนะคะ ระบบส่งข้อความและยอดเงินของคุณขึ้นจอ OBS ของสตรีมเมอร์เรียบร้อยแล้วค่ะ 💕',
    successMessageColor: theme.successMessageColor ?? '#cbd5e1',
    successMessageFontFamily: theme.successMessageFontFamily ?? 'Mitr',
    successMessageFontSize: theme.successMessageFontSize ?? '14px',
    successEmoji: theme.successEmoji ?? '🎉',
    successBtnText: theme.successBtnText ?? 'กลับหน้าหลัก',
    successBtnColor: theme.successBtnColor ?? '#10b981',
    successBtnTextColor: theme.successBtnTextColor ?? '#ffffff',
    successBtnFontSize: theme.successBtnFontSize ?? '16px',

    failureTitle: theme.failureTitle ?? 'ทำรายการไม่สำเร็จ',
    failureTitleColor: theme.failureTitleColor ?? '#ef4444',
    failureTitleFontFamily: theme.failureTitleFontFamily ?? 'Mitr',
    failureTitleFontSize: theme.failureTitleFontSize ?? '28px',
    failureMessage: theme.failureMessage ?? 'รายการชำระเงินถูกยกเลิก หรือหมดอายุการสแกน QR Code ค่ะ',
    failureMessageColor: theme.failureMessageColor ?? '#cbd5e1',
    failureMessageFontFamily: theme.failureMessageFontFamily ?? 'Mitr',
    failureMessageFontSize: theme.failureMessageFontSize ?? '14px',
    failureEmoji: theme.failureEmoji ?? '❌',
    failureBtnText: theme.failureBtnText ?? 'กลับหน้าหลัก/ลองอีกครั้ง',
    failureBtnColor: theme.failureBtnColor ?? '#ef4444',
    failureBtnTextColor: theme.failureBtnTextColor ?? '#ffffff',
    failureBtnFontSize: theme.failureBtnFontSize ?? '16px'
  });

  // ตัวแปรระบบแผงควบคุมหลัก
  let activeTab = $state<'main' | 'success' | 'failure'>('main');
  let isAuthenticated = $state(false);
  let password = $state('');
  let authError = $state('');
  let authLoading = $state(false);
  let saveLoading = $state(false);

  // คำนวณรายชื่อฟอนต์ทั้งหมดเพื่อเรียกผ่าน Google Fonts API ครบถ้วน
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
        alert('🎉 บันทึกการเปลี่ยนแปลงและอัปโหลดข้อมูลเข้า GitHub สำเร็จแล้วค่ะ! กรุณารอสักครู่ให้ Vercel บิวด์ข้อมูลใหม่หลังบ้านนะคะ');
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
  <!-- 🛡️ ม่านสีเข้มล็อกหน้าจอ Admin Password Gate Overlay ป้องกันการดักจับเนื้อหา -->
  <div class="fixed inset-0 bg-slate-950 z-50 flex items-center justify-center p-4">
    <form onsubmit={handleVerify} class="w-full max-w-sm p-8 bg-slate-900 border border-slate-800 rounded-3xl space-y-6 shadow-2xl">
      <div class="text-center">
        <span class="text-4xl text-pink-500">🔒</span>
        <h1 class="text-xl font-extrabold mt-3 text-white">แผงความปลอดภัยหลังบ้าน</h1>
        <p class="text-xs text-slate-400 mt-1">กรุณากรอกรหัสแอดมินเพื่อปลดล็อกแผ่นสไตล์สตรีมเมอร์</p>
      </div>

      {#if authError}
        <div class="p-3 bg-red-950/50 border border-red-500/30 text-red-400 text-xs text-center rounded-xl font-bold animate-pulse">{authError}</div>
      {/if}

      <div class="space-y-1">
        <label for="pwd" class="text-xs font-bold text-slate-300 uppercase tracking-wider">ADMIN PASSWORD</label>
        <input 
          id="pwd" 
          type="password" 
          required 
          placeholder="•••••••••••••••"
          class="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-pink-500 focus:outline-none transition-all text-white"
          bind:value={password}
        />
      </div>

      <button 
        type="submit" 
        disabled={authLoading}
        class="w-full py-3.5 bg-gradient-to-r from-pink-500 to-rose-600 hover:opacity-90 font-bold rounded-xl cursor-pointer transition text-white"
      >
        {authLoading ? 'กำลังปลดม่านหลังบ้าน...' : 'ล็อกอินและถอดรหัสหลังบ้าน'}
      </button>
    </form>
  </div>
{/if}

<div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
  <!-- เมนูหัวแถวแบบ Fixed -->
  <header class="border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-30">
    <div class="flex items-center gap-3">
      <span class="text-2xl">🎨</span>
      <div>
        <h1 class="font-extrabold text-lg text-white">Secure Tip Configurator</h1>
        <p class="text-xs text-slate-400">ระบบประมวลผลสไตล์และตกแต่งเพจ VTuber เรียลไทม์</p>
      </div>
    </div>
    
    <div class="flex items-center gap-3 w-full sm:w-auto">
      <button 
        onclick={handleSave} 
        disabled={saveLoading}
        class="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-bold rounded-xl cursor-pointer transition flex items-center justify-center gap-2"
      >
        {saveLoading ? '⏳ กำลังพุชไฟล์...' : '💾 บันทึกสไตล์ขึ้นคลังโค้ด'}
      </button>
    </div>
  </header>

  <!-- พื้นที่หน้าจอแบ่งปีก: ควบคุม (ซ้าย) VS พรีวิวตัวอย่างตามหน้าจอปัจจุบัน (ขวา) -->
  <div class="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-8 p-6 max-w-7xl w-full mx-auto">
    
    <!-- โซนควบคุมและปรับแต่ง (ซ้าย) -->
    <div class="space-y-6">
      
      <!-- 🎛️ ปุ่มเลือกแท็บสไตล์พรีเมียม -->
      <div class="grid grid-cols-3 gap-2 p-1.5 bg-slate-900/80 border border-slate-800 rounded-2xl">
        <button 
          onclick={() => activeTab = 'main'} 
          class="py-3 px-1 font-extrabold rounded-xl transition text-sm cursor-pointer {activeTab === 'main' ? 'bg-pink-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}"
        >
          📱 หน้าแรก (โดเนท)
        </button>
        <button 
          onclick={() => activeTab = 'success'} 
          class="py-3 px-1 font-extrabold rounded-xl transition text-sm cursor-pointer {activeTab === 'success' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}"
        >
          🟢 หน้าโอนสำเร็จ
        </button>
        <button 
          onclick={() => activeTab = 'failure'} 
          class="py-3 px-1 font-extrabold rounded-xl transition text-sm cursor-pointer {activeTab === 'failure' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}"
        >
          🔴 หน้าโอนล้มเหลว
        </button>
      </div>

      <!-- กล่องฟอร์มกรอกค่าตกแต่ง -->
      <div class="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-6 space-y-6 max-h-[72vh] overflow-y-auto">
        
        {#if activeTab === 'main'}
          <!-- ================= TAB 1: หน้าแรก ================= -->
          <h2 class="text-lg font-bold text-white border-b border-slate-800 pb-3">📱 แต่งหน้าสนับสนุนหลัก</h2>
          
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
            <label class="block text-xs font-bold text-slate-400 mb-1">ฟอนต์ชื่อ VTuber (ชื่อ Google Font เช่น Mitr, Kanit)</label>
            <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" bind:value={config.nameFontFamily} />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-400 mb-1">ข้อความทักทายตอนโดเนท</label>
            <textarea class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" rows="2" bind:value={config.welcomeText}></textarea>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-400 mb-1">ลิงก์ภาพอวาตาร์กลม</label>
              <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs" bind:value={config.avatarUrl} />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-400 mb-1">ลิงก์ภาพแบนเนอร์หลังหัวข้อ</label>
              <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs" bind:value={config.bannerUrl} />
            </div>
          </div>

          <!-- จัดการพื้นหลัง -->
          <div class="border-t border-slate-800/80 pt-4 space-y-4">
            <h3 class="text-sm font-bold text-slate-300">🖼️ จัดการพื้นหลังเว็บไซต์หลัก (Global BG)</h3>
            <div class="grid grid-cols-2 gap-3">
              <button 
                class="py-2 rounded-lg font-bold text-xs cursor-pointer border {config.bgType === 'solid' ? 'bg-pink-600 border-pink-500' : 'bg-slate-950 border-slate-800'}"
                onclick={() => config.bgType = 'solid'}
              >
                สีพื้นหลังสีเดียว (Solid)
              </button>
              <button 
                class="py-2 rounded-lg font-bold text-xs cursor-pointer border {config.bgType === 'image' ? 'bg-pink-600 border-pink-500' : 'bg-slate-950 border-slate-800'}"
                onclick={() => config.bgType = 'image'}
              >
                ใส่รูปพื้นหลัง (Wallpaper URL)
              </button>
            </div>
            {#if config.bgType === 'solid'}
              <div class="flex gap-2">
                <input type="color" class="w-10 h-10 border-0 rounded cursor-pointer" bind:value={config.bgColor} />
                <input type="text" class="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white uppercase" bind:value={config.bgColor} />
              </div>
            {:else}
              <input type="text" placeholder="ป้อนที่อยู่รูปภาพออนไลน์ (https://...)" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs" bind:value={config.bgUrl} />
            {/if}
          </div>

        {:else}
          <!-- ================= TAB 2 & 3: ปรับสลับหน้าสำเร็จ / หน้าล้มเหลว ================= -->
          <div>
            <h2 class="text-lg font-bold text-white border-b border-slate-800 pb-3">
              {#if activeTab === 'success'}🟢 ตกแต่งแผงชำระเงินสำเร็จ{:else}🔴 ตกแต่งแผงชำระเงินล้มเหลว{/if}
            </h2>
          </div>

          {#if activeTab === 'success'}
            <!-- ชุดตั้งค่า หน้าโอนเงินสำเร็จ -->
            <div class="space-y-4">
              <div class="grid grid-cols-3 gap-4">
                <div class="col-span-1">
                  <label class="block text-xs font-bold text-slate-400 mb-1">Emoji ปลายจังหวะ</label>
                  <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-center text-lg font-bold" bind:value={config.successEmoji} />
                </div>
                <div class="col-span-2">
                  <label class="block text-xs font-bold text-slate-400 mb-1">ชื่อหัวข้อแสดงเด่น</label>
                  <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" bind:value={config.successTitle} />
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-400 mb-1">สีข้อความเด่น</label>
                  <div class="flex gap-2">
                    <input type="color" class="w-10 h-10 border-0 rounded cursor-pointer" bind:value={config.successTitleColor} />
                    <input type="text" class="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs uppercase" bind:value={config.successTitleColor} />
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-400 mb-1">ขนาดฟอนต์หัวข้อสำเร็จ ({config.successTitleFontSize})</label>
                  <input type="range" min="16" max="42" step="1" class="w-full accent-emerald-500 cursor-pointer" 
                    value={parseInt(config.successTitleFontSize)} 
                    oninput={(e) => config.successTitleFontSize = `${(e.target as HTMLInputElement).value}px`} 
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-400 mb-1">ฟอนต์ของหัวข้อเด่น</label>
                <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" bind:value={config.successTitleFontFamily} />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-400 mb-1">ข้อความสนับสนุนขอบคุณยาว</label>
                <textarea class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm" rows="3" bind:value={config.successMessage}></textarea>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-400 mb-1">สีข้อความยาว</label>
                  <div class="flex gap-2">
                    <input type="color" class="w-10 h-10 border-0 rounded cursor-pointer" bind:value={config.successMessageColor} />
                    <input type="text" class="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs uppercase" bind:value={config.successMessageColor} />
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-400 mb-1">ขนาดข้อความขอบคุณ ({config.successMessageFontSize})</label>
                  <input type="range" min="12" max="24" step="1" class="w-full accent-emerald-500 cursor-pointer" 
                    value={parseInt(config.successMessageFontSize)} 
                    oninput={(e) => config.successMessageFontSize = `${(e.target as HTMLInputElement).value}px`} 
                  />
                </div>
              </div>

              <div class="border-t border-slate-800/80 pt-4 space-y-4">
                <h3 class="text-xs font-black text-slate-300">🔘 ตกแต่งปุ่มกลับหน้าหลักหลังชำระเงิน</h3>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-bold text-slate-400 mb-1">ข้อความบนปุ่ม</label>
                    <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" bind:value={config.successBtnText} />
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-slate-400 mb-1">ขนาดอักษรบนปุ่ม ({config.successBtnFontSize})</label>
                    <input type="range" min="12" max="24" step="1" class="w-full accent-emerald-500 cursor-pointer" 
                      value={parseInt(config.successBtnFontSize)} 
                      oninput={(e) => config.successBtnFontSize = `${(e.target as HTMLInputElement).value}px`} 
                    />
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-bold text-slate-400 mb-1">สีพื้นหลังปุ่ม</label>
                    <div class="flex gap-2">
                      <input type="color" class="w-10 h-10 border-0 rounded cursor-pointer" bind:value={config.successBtnColor} />
                      <input type="text" class="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs uppercase" bind:value={config.successBtnColor} />
                    </div>
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-slate-400 mb-1">สีตัวอักษรบนปุ่ม</label>
                    <div class="flex gap-2">
                      <input type="color" class="w-10 h-10 border-0 rounded cursor-pointer" bind:value={config.successBtnTextColor} />
                      <input type="text" class="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs uppercase" bind:value={config.successBtnTextColor} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          {:else}
            <!-- ชุดตั้งค่า หน้าชำระเงินล้มเหลว -->
            <div class="space-y-4">
              <div class="grid grid-cols-3 gap-4">
                <div class="col-span-1">
                  <label class="block text-xs font-bold text-slate-400 mb-1">Emoji ปลายจังหวะ</label>
                  <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-center text-lg font-bold" bind:value={config.failureEmoji} />
                </div>
                <div class="col-span-2">
                  <label class="block text-xs font-bold text-slate-400 mb-1">ชื่อหัวข้อแสดงเด่น</label>
                  <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" bind:value={config.failureTitle} />
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-400 mb-1">สีข้อความล้มเหลวเด่น</label>
                  <div class="flex gap-2">
                    <input type="color" class="w-10 h-10 border-0 rounded cursor-pointer" bind:value={config.failureTitleColor} />
                    <input type="text" class="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs uppercase" bind:value={config.failureTitleColor} />
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-400 mb-1">ขนาดหัวข้อ ({config.failureTitleFontSize})</label>
                  <input type="range" min="16" max="42" step="1" class="w-full accent-red-500 cursor-pointer" 
                    value={parseInt(config.failureTitleFontSize)} 
                    oninput={(e) => config.failureTitleFontSize = `${(e.target as HTMLInputElement).value}px`} 
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-400 mb-1">ฟอนต์ของหัวข้อเด่น</label>
                <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" bind:value={config.failureTitleFontFamily} />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-400 mb-1">คำชี้แจงความขัดข้องระบบชำระ</label>
                <textarea class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm" rows="3" bind:value={config.failureMessage}></textarea>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-400 mb-1">สีข้อความชี้แจง</label>
                  <div class="flex gap-2">
                    <input type="color" class="w-10 h-10 border-0 rounded cursor-pointer" bind:value={config.failureMessageColor} />
                    <input type="text" class="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs uppercase" bind:value={config.failureMessageColor} />
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-400 mb-1">ขนาดฟอนต์ชี้แจง ({config.failureMessageFontSize})</label>
                  <input type="range" min="12" max="24" step="1" class="w-full accent-red-500 cursor-pointer" 
                    value={parseInt(config.failureMessageFontSize)} 
                    oninput={(e) => config.failureMessageFontSize = `${(e.target as HTMLInputElement).value}px`} 
                  />
                </div>
              </div>

              <div class="border-t border-slate-800/80 pt-4 space-y-4">
                <h3 class="text-xs font-black text-slate-300">🔘 ตกแต่งปุ่มปิดย้อนกลับ</h3>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-bold text-slate-400 mb-1">ข้อความบนปุ่ม</label>
                    <input type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" bind:value={config.failureBtnText} />
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-slate-400 mb-1">ขนาดอักษรบนปุ่ม ({config.failureBtnFontSize})</label>
                    <input type="range" min="12" max="24" step="1" class="w-full accent-red-500 cursor-pointer" 
                      value={parseInt(config.failureBtnFontSize)} 
                      oninput={(e) => config.failureBtnFontSize = `${(e.target as HTMLInputElement).value}px`} 
                    />
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-bold text-slate-400 mb-1">สีพื้นหลังปุ่ม</label>
                    <div class="flex gap-2">
                      <input type="color" class="w-10 h-10 border-0 rounded cursor-pointer" bind:value={config.failureBtnColor} />
                      <input type="text" class="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs uppercase" bind:value={config.failureBtnColor} />
                    </div>
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-slate-400 mb-1">สีตัวอักษรบนปุ่ม</label>
                    <div class="flex gap-2">
                      <input type="color" class="w-10 h-10 border-0 rounded cursor-pointer" bind:value={config.failureBtnTextColor} />
                      <input type="text" class="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs uppercase" bind:value={config.failureBtnTextColor} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          {/if}
        {/if}

      </div>
    </div>

    <!-- โซนหน้าต่างพรีวิวตามเวลากรอกเรียลไทม์ (ขวา) -->
    <div class="flex flex-col items-center justify-center p-4 rounded-3xl relative overflow-hidden border border-slate-800/80 min-h-[500px]"
      style="
        background-image: {config.bgType === 'image' && config.bgUrl ? `url(${config.bgUrl})` : 'none'}; 
        background-color: {config.bgType === 'solid' ? config.bgColor : '#0c111d'};
        background-size: cover;
        background-position: center;
      "
    >
      <div class="absolute inset-0 bg-slate-950/75 backdrop-blur-[2px]"></div>
      
      <!-- ป้ายแสตมป์แจ้งสถานะบอกโหมดพรีวิวอยู่ด้านบนมุมซ้าย -->
      <span class="absolute top-4 left-4 z-20 text-[10px] font-black uppercase tracking-wider px-3 py-1 bg-slate-900 border border-slate-700 rounded-md text-slate-400">
        Live Mockup (หน้า {activeTab === 'main' ? 'แรก' : activeTab === 'success' ? 'สำเร็จ' : 'ล้มเหลว'})
      </span>

      <!-- ⚡ ตัวพรีวิวจำลองจะถูกสับเปลี่ยนสไตล์ (Svelte Render Control) ตามแท็บที่ผู้ใช้เปิดใช้งานฝั่งซ้ายโดยทันที! -->
      <div 
        class="w-full max-w-sm p-6 rounded-2xl border text-center relative overflow-hidden transition-all duration-300 z-10"
        style="
          background-color: {hexToRgba(config.cardBgColor, config.cardOpacity)};
          border-color: {hexToRgba(config.cardBorderColor, config.cardBorderOpacity)};
          backdrop-filter: blur({config.cardBlur}px);
        "
      >
        
        {#if activeTab === 'main'}
          <!-- พรีวิว หน้าหลัก -->
          <div class="space-y-4">
            <!-- แบนเนอร์จำลองย่อขนาด -->
            <div class="relative rounded-xl overflow-hidden bg-slate-950 pb-3">
              {#if config.bannerUrl}
                <div class="w-full h-24 bg-cover bg-center opacity-40" style="background-image: url({config.bannerUrl});"></div>
              {:else}
                <div class="w-full h-24 bg-slate-900 opacity-40"></div>
              {/if}
              <div class="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-slate-950 to-transparent"></div>
              <div class="flex items-center gap-3 px-4 -mt-2 relative z-10">
                <img src={config.avatarUrl || 'https://placehold.co/150'} alt="p" class="w-12 h-12 rounded-full border-2 border-slate-950 object-cover" />
                <div class="text-left">
                  <h3 class="font-extrabold text-sm" style="color: {config.nameColor}; font-family: '{config.nameFontFamily}', sans-serif;">{config.vtuberName}</h3>
                  <p class="text-[10px] text-slate-400" style="font-family: '{config.welcomeFontFamily}', sans-serif;">{config.welcomeText}</p>
                </div>
              </div>
            </div>

            <!-- ฟิลด์รับเงินจำลอง -->
            <div class="space-y-2 text-left">
              <div class="h-8 rounded bg-slate-950/50 border border-slate-800 flex items-center px-3 text-[10px] text-slate-500">กรอกชื่อเล่น...</div>
              <div class="h-8 rounded bg-slate-950/50 border border-slate-800 flex items-center px-3 text-[10px] text-slate-500">ใส่คำทักทาย...</div>
            </div>

            <button class="w-full py-3 rounded-lg font-bold text-xs" style="background-color: {config.submitBtnColor}; color: {config.submitBtnTextColor}; font-family: '{config.submitBtnFontFamily}', sans-serif;">
              {config.submitBtnText || 'โดเนทสนับสนุน 💖'}
            </button>
          </div>

        {:else}
          <!-- พรีวิว หน้าชำระเงินสำเร็จ / ล้มเหลว -->
          <div class="space-y-4 py-4">
            <div class="text-5xl animate-pulse">
              {#if activeTab === 'success'}{config.successEmoji}{:else}{config.failureEmoji}{/if}
            </div>

            <h3 
              class="font-black"
              style="
                color: {activeTab === 'success' ? config.successTitleColor : config.failureTitleColor};
                font-family: '{activeTab === 'success' ? config.successTitleFontFamily : config.failureTitleFontFamily}', sans-serif;
                font-size: {activeTab === 'success' ? config.successTitleFontSize : config.failureTitleFontSize};
              "
            >
              {#if activeTab === 'success'}{config.successTitle}{:else}{config.failureTitle}{/if}
            </h3>

            <p 
              class="font-medium leading-relaxed"
              style="
                color: {activeTab === 'success' ? config.successMessageColor : config.failureMessageColor};
                font-family: '{activeTab === 'success' ? config.successMessageFontFamily : config.failureMessageFontFamily}', sans-serif;
                font-size: {activeTab === 'success' ? config.successMessageFontSize : config.failureMessageFontSize};
              "
            >
              {#if activeTab === 'success'}{config.successMessage}{:else}{config.failureMessage}{/if}
            </p>

            <button 
              class="w-full py-3 rounded-lg font-bold transition duration-300"
              style="
                background-color: {activeTab === 'success' ? config.successBtnColor : config.failureBtnColor}; 
                color: {activeTab === 'success' ? config.successBtnTextColor : config.failureBtnTextColor};
                font-family: '{config.submitBtnFontFamily}', sans-serif;
                font-size: {activeTab === 'success' ? config.successBtnFontSize : config.failureBtnFontSize};
              "
            >
              {#if activeTab === 'success'}{config.successBtnText}{:else}{config.failureBtnText}{/if}
            </button>
          </div>
        {/if}

      </div>
    </div>

  </div>
</div>
