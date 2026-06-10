<svelte:head>
  <title>Admin Dashboard | Tips Secure</title>
</svelte:head>

<script lang="ts">
  import { onMount } from 'svelte';
  import theme from '$lib/config/theme.json';

  // 🛡️ ระบบล็อกอินด่านแรกของ Admin
  let isAuthenticated = $state(false);
  let inputPassword = $state('');
  let authenticating = $state(false);
  let authError = $state('');

  // 1. รูป Profile
  let avatarUrl = $state(theme.avatarUrl || '');

  // 2. Banner
  let bannerUrl = $state(theme.bannerUrl || '');

  // 3. Background หลัก
  let bgType = $state(theme.bgType || 'solid');
  let bgColor = $state(theme.bgColor || '#0b0f19');
  let bgUrl = $state(theme.bgUrl || '');

  // 4. Background รอง
  let cardBgColor = $state(theme.cardBgColor || 'rgba(15, 23, 42, 0.6)');
  let cardBorderColor = $state(theme.cardBorderColor || 'rgba(30, 41, 59, 0.8)');

  // 5. สีช่องกรอกข้อมูล
  let inputBgColor = $state(theme.inputBgColor || 'rgba(2, 6, 23, 0.8)');
  let inputBorderColor = $state(theme.inputBorderColor || 'rgba(30, 41, 59, 1)');

  // 6. ชื่อ, สี+Font ชื่อ
  let vtuberName = $state(theme.vtuberName || 'สตรีมเมอร์สุดน่ารัก');
  let nameColor = $state(theme.nameColor || '#db2777');
  let nameFontFamily = $state(theme.nameFontFamily || 'Mitr');

  // 7. คำทักทาย, สี+Font คำทักทาย, ชื่อช่องกรอกต่างๆ, สี+Font หัวข้อ
  let welcomeText = $state(theme.welcomeText || '');
  let welcomeColor = $state(theme.welcomeColor || '#cbd5e1');
  let welcomeFontFamily = $state(theme.welcomeFontFamily || 'Mitr');
  let nicknameLabel = $state(theme.nicknameLabel || 'ชื่อเล่นของคุณ (Nickname)');
  let messageLabel = $state(theme.messageLabel || 'ข้อความสนับสนุน (ส่งอวยพรขึ้นจอไลฟ์สด)');
  let amountLabel = $state(theme.amountLabel || 'ระบุจำนวนเงินเอง (บาท)');
  let presetLabel = $state(theme.presetLabel || 'เลือกยอดเงินสนับสนุนด่วน 🌸');
  let labelColor = $state(theme.labelColor || '#94a3b8');
  let labelFontFamily = $state(theme.labelFontFamily || 'Mitr');

  // 8. link social media + สี link social media
  let socialLinks = $state(theme.socialLinks || [
    { platform: 'youtube', url: '' },
    { platform: 'twitch', url: '' },
    { platform: 'tiktok', url: '' },
    { platform: 'twitter', url: '' },
    { platform: 'facebook', url: '' },
    { platform: 'discord', url: '' },
    { platform: 'instagram', url: '' }
  ]);
  let socialColor = $state(theme.socialColor || '#db2777');

  // 9. แก้ preset ราคา, สี+Font preset ราคา
  let presetAmount1 = $state(theme.presetAmounts?.[0] ?? 20);
  let presetAmount2 = $state(theme.presetAmounts?.[1] ?? 50);
  let presetAmount3 = $state(theme.presetAmounts?.[2] ?? 100);
  let presetAmount4 = $state(theme.presetAmounts?.[3] ?? 500);
  let presetFontFamily = $state(theme.presetFontFamily || 'Mitr');
  let presetBtnColor = $state(theme.presetBtnColor || '#0f172a');
  let presetBorderColor = $state(theme.presetBorderColor || '#1e293b');

  // 10. สี+Font ปุ่ม โดเนท, สีปุ่มโดเนท
  let submitBtnColor = $state(theme.submitBtnColor || '#db2777');
  let submitBtnTextColor = $state(theme.submitBtnTextColor || '#ffffff');
  let submitBtnFontFamily = $state(theme.submitBtnFontFamily || 'Mitr');

  let isSaving = $state(false);

  // 🛡️ ระบบจัดคิวโหลด Google Fonts อัตโนมัติใน Live Preview
  const uniqueFonts = $derived([
    ...new Set([
      nameFontFamily,
      welcomeFontFamily,
      labelFontFamily,
      presetFontFamily,
      submitBtnFontFamily
    ].filter(f => f && f.trim() !== '' && f.toLowerCase() !== 'sans-serif'))
  ]);

  onMount(() => {
    const savedAuth = sessionStorage.getItem('admin_authenticated');
    const savedPass = sessionStorage.getItem('admin_password');
    if (savedAuth === 'true' && savedPass) {
      inputPassword = savedPass;
      isAuthenticated = true;
    }
  });

  async function handleVerify(e: Event) {
    e.preventDefault();
    authenticating = true;
    authError = '';

    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: inputPassword })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        isAuthenticated = true;
        sessionStorage.setItem('admin_authenticated', 'true');
        sessionStorage.setItem('admin_password', inputPassword);
      } else {
        authError = data.error || 'รหัสผ่านไม่ถูกต้องค่ะ';
      }
    } catch (err) {
      authError = 'ระบบเครือข่ายรักษาความปลอดภัยขัดข้อง';
    } finally {
      authenticating = false;
    }
  }

  function handleLogout() {
    sessionStorage.removeItem('admin_authenticated');
    sessionStorage.removeItem('admin_password');
    isAuthenticated = false;
    inputPassword = '';
  }

  const handleSave = async (e: Event) => {
    e.preventDefault();
    isSaving = true;

    const finalPresets = [
      Number(presetAmount1),
      Number(presetAmount2),
      Number(presetAmount3),
      Number(presetAmount4)
    ];

    try {
      const response = await fetch('/api/admin/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: inputPassword,
          config: { 
            avatarUrl, bannerUrl,
            bgType, bgColor, bgUrl,
            cardBgColor, cardBorderColor,
            inputBgColor, inputBorderColor,
            vtuberName, nameColor, nameFontFamily,
            welcomeText, welcomeColor, welcomeFontFamily,
            nicknameLabel, messageLabel, amountLabel, presetLabel,
            labelColor, labelFontFamily,
            socialLinks, socialColor,
            presetAmounts: finalPresets, presetFontFamily, presetBtnColor, presetBorderColor,
            submitBtnColor, submitBtnTextColor, submitBtnFontFamily
          }
        }),
      });

      const data = await response.json();
      if (response.ok) {
        alert('บันทึกสำเร็จเรียบร้อยแล้วค่ะ! รอระบบคลาวด์สร้างเว็บใหม่ (จะแสดงผลจริงในอีกประมาณ 45 วินาทีนะคะ)');
      } else {
        alert(data.error || 'บันทึกการตกแต่งไม่สำเร็จชั่วคราวค่ะ');
      }
    } catch (err) {
      alert('ระบบเชื่อมโยงข้อมูลขัดข้อง');
    } finally {
      isSaving = false;
    }
  };
</script>

<!-- ดึง Google Font ตระกูลที่เปิดใช้งานมารันจำลองผลเรียลไทม์เบื้องหลัง -->
{#each uniqueFonts as font}
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family={font.trim().replace(/\s+/g, '+')}:wght@400;500;700&display=swap" />
{/each}

{#if !isAuthenticated}
  <!-- 🔐 หน้าต่างป้อนรหัสล็อกแอดมินก่อนเข้าเพจ (Secure Login Lock Screen) -->
  <main class="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
    <div class="w-full max-w-md bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 backdrop-blur-xl text-center">
      <div class="space-y-2">
        <span class="text-4xl block animate-bounce">🔐</span>
        <h1 class="text-2xl font-black tracking-wide text-pink-400">ควบคุมระบบส่วนตัว</h1>
        <p class="text-slate-400 text-xs">กรุณากรอก ADMIN_PASSWORD เพื่อทำการปรับปรุงเลย์เอาต์การตกแต่งค่ะ</p>
      </div>

      <form onsubmit={handleVerify} class="space-y-4 text-left">
        <div class="space-y-1.5">
          <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest" for="pass-gate">รหัสผ่านแอดมิน</label>
          <input 
            id="pass-gate"
            type="password" 
            required 
            placeholder="••••••••" 
            class="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-center tracking-widest focus:ring-2 focus:ring-pink-500/50 focus:outline-none" 
            bind:value={inputPassword} 
          />
        </div>

        {#if authError}
          <p class="text-red-400 text-xs text-center font-bold">{authError}</p>
        {/if}

        <button 
          type="submit" 
          disabled={authenticating}
          class="w-full py-3 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-extrabold rounded-xl transition-all shadow-lg text-xs tracking-wider uppercase cursor-pointer"
        >
          {#if authenticating}
            กำลังยืนยันสัญญาณรหัส...
          {:else}
            ปลดล็อกระบบควบคุม 🔓
          {/if}
        </button>
      </form>
    </div>
  </main>
{:else}
  <!-- 💅 คอนโซลตกแต่งหลัก -->
  <main class="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 md:p-8">
    <header class="max-w-7xl w-full mx-auto mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
      <div>
        <h1 class="text-3xl font-extrabold tracking-wide text-pink-400">💅 แผงดีไซน์เสรีรุ่นความสะดวกสูง</h1>
        <p class="text-slate-400 text-sm mt-1">พิมพ์แค่ชื่อ Google Fonts และปรับเลือกสีผ่านพาเนลคู่แบบพิกเซลเพอร์เฟกต์ได้ทันทีเลยนะคะ</p>
      </div>
      <button onclick={handleLogout} class="px-4 py-2 bg-slate-900 hover:bg-red-950/40 border border-slate-800 hover:border-red-500/30 text-xs font-bold text-slate-400 hover:text-red-400 rounded-xl transition-all cursor-pointer">
        ออกจากระบบหลังบ้าน 🚪
      </button>
    </header>

    <div class="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      <!-- ⚙️ ป้อนข้อมูล (7 จาก 12) -->
      <div class="lg:col-span-7 space-y-6">
        <form onsubmit={handleSave} class="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 md:p-8 backdrop-blur-md shadow-xl space-y-6">
          
          <!-- [1] รูป Profile -->
          <div class="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-3">
            <h3 class="text-xs uppercase tracking-widest font-black text-pink-400">👉 รูป Profile (Avatar)</h3>
            <div class="flex items-center gap-4">
              <div class="w-16 h-16 rounded-full border border-slate-800 overflow-hidden flex-shrink-0 bg-slate-950">
                <img src={avatarUrl || 'https://placehold.co/150'} alt="Preview" class="w-full h-full object-cover" />
              </div>
              <div class="flex-1 space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="avatar-img">ลิงก์ภาพอวาตาร์ (Avatar URL)</label>
                <input id="avatar-img" type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white" bind:value={avatarUrl} />
              </div>
            </div>
          </div>

          <!-- [2] Banner -->
          <div class="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-3">
            <h3 class="text-xs uppercase tracking-widest font-black text-pink-400">👉 Banner (แบนเนอร์กล่องโดเนทสูงขึ้น 20%)</h3>
            <div class="space-y-3">
              <div class="w-full h-24 rounded-xl border border-slate-800 bg-cover bg-center opacity-70 bg-slate-950" style="background-image: {bannerUrl ? `url(${bannerUrl})` : 'none'}">
                {#if !bannerUrl}
                  <div class="w-full h-full flex items-center justify-center text-xs text-slate-500 font-bold">ไม่มีภาพแบนเนอร์ (จะโชว์ขอบสีใสพรีเมียม)</div>
                {/if}
              </div>
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="banner-img">ลิงก์ภาพแบนเนอร์ (Banner URL)</label>
                <input id="banner-img" type="text" placeholder="ปล่อยว่างไว้เพื่อโชว์สีใสสะอาดตาค่ะ" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white" bind:value={bannerUrl} />
              </div>
            </div>
          </div>

          <!-- [3] Background หลัก -->
          <div class="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-4">
            <h3 class="text-xs uppercase tracking-widest font-black text-pink-400">👉 Background หลัก (พื้นหลังเบราว์เซอร์สากล)</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="space-y-1.5">
                <span class="block text-[10px] font-bold text-slate-400">ประเภทพื้นหลังหลัก</span>
                <div class="flex flex-col gap-2 mt-1">
                  <label class="inline-flex items-center gap-2 cursor-pointer text-xs"><input type="radio" value="solid" bind:group={bgType} /> สีเดี่ยว (Solid Color)</label>
                  <label class="inline-flex items-center gap-2 cursor-pointer text-xs"><input type="radio" value="image" bind:group={bgType} /> ภาพพื้นหลัง (Background Image)</label>
                </div>
              </div>
              <div class="space-y-1.5 col-span-2">
                {#if bgType === 'solid'}
                  <label class="block text-[10px] font-bold text-slate-400">เลือกสีพื้นหลังเดี่ยว</label>
                  <div class="flex items-center gap-2">
                    <div class="relative w-10 h-8 rounded border border-slate-800 overflow-hidden flex-shrink-0">
                      <input type="color" class="absolute inset-0 w-full h-full cursor-pointer scale-125 border-none p-0" bind:value={bgColor} />
                    </div>
                    <input type="text" class="px-2 py-1 bg-slate-950 border border-slate-850 rounded text-xs text-slate-300 w-24 font-mono uppercase" bind:value={bgColor} />
                  </div>
                {:else}
                  <label class="block text-[10px] font-bold text-slate-400" for="main-bg">ระบุ URL ภาพพื้นหลังใหญ่</label>
                  <input id="main-bg" type="text" placeholder="https://..." class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white" bind:value={bgUrl} />
                {/if}
              </div>
            </div>
          </div>

          <!-- [4] Background รอง -->
          <div class="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-3">
            <h3 class="text-xs uppercase tracking-widest font-black text-pink-400">👉 Background รอง (กล่องฟอร์มแก้วโปร่งแสง)</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400">สีพื้นหลังกล่อง (HEX / RGBA)</label>
                <div class="flex items-center gap-2">
                  <div class="relative w-10 h-8 rounded border border-slate-800 overflow-hidden flex-shrink-0">
                    <input type="color" class="absolute inset-0 w-full h-full cursor-pointer scale-125 border-none p-0" bind:value={cardBgColor} />
                  </div>
                  <input type="text" class="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono" bind:value={cardBgColor} />
                </div>
              </div>
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400">สีเส้นขอบกล่อง (HEX / RGBA)</label>
                <div class="flex items-center gap-2">
                  <div class="relative w-10 h-8 rounded border border-slate-800 overflow-hidden flex-shrink-0">
                    <input type="color" class="absolute inset-0 w-full h-full cursor-pointer scale-125 border-none p-0" bind:value={cardBorderColor} />
                  </div>
                  <input type="text" class="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono" bind:value={cardBorderColor} />
                </div>
              </div>
            </div>
          </div>

          <!-- [5] สีช่องกรอกข้อมูล -->
          <div class="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-3">
            <h3 class="text-xs uppercase tracking-widest font-black text-pink-400">👉 สีช่องกรอกข้อมูล (Inputs Field Styling)</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400">สีพื้นหลังช่องข้อความ (HEX / RGBA)</label>
                <div class="flex items-center gap-2">
                  <div class="relative w-10 h-8 rounded border border-slate-800 overflow-hidden flex-shrink-0">
                    <input type="color" class="absolute inset-0 w-full h-full cursor-pointer scale-125 border-none p-0" bind:value={inputBgColor} />
                  </div>
                  <input type="text" class="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono" bind:value={inputBgColor} />
                </div>
              </div>
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400">สีเส้นขอบช่องข้อความ (HEX / RGBA)</label>
                <div class="flex items-center gap-2">
                  <div class="relative w-10 h-8 rounded border border-slate-800 overflow-hidden flex-shrink-0">
                    <input type="color" class="absolute inset-0 w-full h-full cursor-pointer scale-125 border-none p-0" bind:value={inputBorderColor} />
                  </div>
                  <input type="text" class="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono" bind:value={inputBorderColor} />
                </div>
              </div>
            </div>
          </div>

          <!-- [6] ชื่อ, สี+Font ชื่อ -->
          <div class="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-3">
            <h3 class="text-xs uppercase tracking-widest font-black text-pink-400">👉 ชื่อแบรนด์, สี และฟอนต์สำหรับชื่อของท่าน</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="v-name">ชื่อช่องสตรีมเมอร์</label>
                <input id="v-name" type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white" bind:value={vtuberName} />
              </div>
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400">สีของชื่อช่อง (Theme Color)</label>
                <div class="flex items-center gap-2">
                  <div class="relative w-8 h-8 rounded border border-slate-800 overflow-hidden flex-shrink-0">
                    <input type="color" class="absolute inset-0 w-full h-full cursor-pointer scale-125 border-none p-0" bind:value={nameColor} />
                  </div>
                  <input type="text" class="px-2 py-1 bg-slate-950 border border-slate-850 rounded text-xs text-slate-300 w-20 font-mono uppercase" bind:value={nameColor} />
                </div>
              </div>
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="v-font">ชื่อฟอนต์กูเกิล (Font Family)</label>
                <input id="v-font" type="text" placeholder="เช่น Mitr, Kanit" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white" bind:value={nameFontFamily} />
              </div>
            </div>
          </div>

          <!-- [7] คำทักทาย, สี+Font คำทักทาย, ชื่อช่องกรอกต่างๆ, สี+Font หัวข้อ -->
          <div class="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-4">
            <h3 class="text-xs uppercase tracking-widest font-black text-pink-400">👉 คำทักทาย และตัวแก้ไขป้ายกำกับช่องกรอก (Labels)</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="space-y-1 col-span-2">
                <label class="block text-[10px] font-bold text-slate-400" for="w-text">คำทักทายต้อนรับหลัก</label>
                <textarea id="w-text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-medium" rows="2" bind:value={welcomeText}></textarea>
              </div>
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400">สีคำทักทาย</label>
                <div class="flex items-center gap-2">
                  <div class="relative w-8 h-8 rounded border border-slate-800 overflow-hidden flex-shrink-0">
                    <input type="color" class="absolute inset-0 w-full h-full cursor-pointer scale-125 border-none p-0" bind:value={welcomeColor} />
                  </div>
                  <input type="text" class="px-2 py-1 bg-slate-950 border border-slate-850 rounded text-xs text-slate-300 w-20 font-mono uppercase" bind:value={welcomeColor} />
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="w-font">ฟอนต์คำทักทาย (Font Family)</label>
                <input id="w-font" type="text" placeholder="เช่น Mitr, Sarabun" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white" bind:value={welcomeFontFamily} />
              </div>
            </div>

            <!-- เพิ่มแต่งสี+Font ของป้ายกำกับ Label ต่างๆ -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-800/40">
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400">สีหัวข้อช่องกรอก (Label Color)</label>
                <div class="flex items-center gap-2">
                  <div class="relative w-8 h-8 rounded border border-slate-800 overflow-hidden flex-shrink-0">
                    <input type="color" class="absolute inset-0 w-full h-full cursor-pointer scale-125 border-none p-0" bind:value={labelColor} />
                  </div>
                  <input type="text" class="px-2 py-1 bg-slate-950 border border-slate-850 rounded text-xs text-slate-300 w-20 font-mono uppercase" bind:value={labelColor} />
                </div>
              </div>
              <div class="space-y-1 col-span-2">
                <label class="block text-[10px] font-bold text-slate-400" for="lbl-font">ฟอนต์ของหัวข้อ (Label Font Family)</label>
                <input id="lbl-font" type="text" placeholder="เช่น Mitr, Kanit" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white" bind:value={labelFontFamily} />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800/20">
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="inp-nick">ป้ายกำกับช่องกรอกชื่อเล่น</label>
                <input id="inp-nick" type="text" class="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white" bind:value={nicknameLabel} />
              </div>
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="inp-msg">ป้ายกำกับช่องเขียนข้อความ</label>
                <input id="inp-msg" type="text" class="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white" bind:value={messageLabel} />
              </div>
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="inp-preset">ป้ายกำกับเลือกราคาด่วน</label>
                <input id="inp-preset" type="text" class="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white" bind:value={presetLabel} />
              </div>
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="inp-amt">ป้ายกำกับระบุเงินตามต้องการ</label>
                <input id="inp-amt" type="text" class="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white" bind:value={amountLabel} />
              </div>
            </div>
          </div>

          <!-- [8] link social media + สี link social media -->
          <div class="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-4">
            <h3 class="text-xs uppercase tracking-widest font-black text-pink-400">👉 ไอคอน Social Media และเฉดสีปุ่ม</h3>
            <div class="space-y-1">
              <label class="block text-[10px] font-bold text-slate-400">สีของไอคอนปุ่มโซเชียลมีเดีย</label>
              <div class="flex items-center gap-2">
                <div class="relative w-8 h-8 rounded border border-slate-800 overflow-hidden flex-shrink-0">
                  <input type="color" class="absolute inset-0 w-full h-full cursor-pointer scale-125 border-none p-0" bind:value={socialColor} />
                </div>
                <input type="text" class="px-2 py-1 bg-slate-950 border border-slate-855 rounded text-xs text-slate-300 w-20 font-mono uppercase" bind:value={socialColor} />
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {#each socialLinks as link}
                <div class="flex items-center gap-2 bg-slate-950/70 p-2.5 border border-slate-800 rounded-xl">
                  <span class="text-[10px] font-black uppercase tracking-wider text-slate-400 w-20">{link.platform}</span>
                  <input type="text" placeholder="ปล่อยว่างไว้หากยังไม่มี..." class="flex-1 bg-transparent border-b border-slate-800 py-1 text-xs text-white focus:outline-none focus:border-pink-500" bind:value={link.url} />
                </div>
              {/each}
            </div>
          </div>

          <!-- [9] แก้ preset ราคา, สี+Font preset ราคา -->
          <div class="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-4">
            <h3 class="text-xs uppercase tracking-widest font-black text-pink-400">👉 ตั้งค่าราคาด่วน (Presets) สี และฟอนต์ของปุ่มด่วน</h3>
            <div class="grid grid-cols-4 gap-2">
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="p-1">ปุ่ม 1 (฿)</label>
                <input id="p-1" type="number" class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-bold" bind:value={presetAmount1} />
              </div>
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="p-2">ปุ่ม 2 (฿)</label>
                <input id="p-2" type="number" class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-bold" bind:value={presetAmount2} />
              </div>
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="p-3">ปุ่ม 3 (฿)</label>
                <input id="p-3" type="number" class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-bold" bind:value={presetAmount3} />
              </div>
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="p-4">ปุ่ม 4 (฿)</label>
                <input id="p-4" type="number" class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-bold" bind:value={presetAmount4} />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="p-font">ตระกูลฟอนต์ของปุ่มด่วน (Font Family)</label>
                <input id="p-font" type="text" placeholder="เช่น Mitr, Kanit" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white" bind:value={presetFontFamily} />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-800/40">
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400">สีพื้นหลังปุ่มด่วนสถานะปกติ</label>
                <div class="flex items-center gap-2">
                  <div class="relative w-8 h-8 rounded border border-slate-800 overflow-hidden flex-shrink-0">
                    <input type="color" class="absolute inset-0 w-full h-full cursor-pointer scale-125 border-none p-0" bind:value={presetBtnColor} />
                  </div>
                  <input type="text" class="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono" bind:value={presetBtnColor} />
                </div>
              </div>
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400">สีเส้นขอบปุ่มด่วนสถานะปกติ</label>
                <div class="flex items-center gap-2">
                  <div class="relative w-8 h-8 rounded border border-slate-800 overflow-hidden flex-shrink-0">
                    <input type="color" class="absolute inset-0 w-full h-full cursor-pointer scale-125 border-none p-0" bind:value={presetBorderColor} />
                  </div>
                  <input type="text" class="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono" bind:value={presetBorderColor} />
                </div>
              </div>
            </div>
          </div>

          <!-- [10] สี+Font ปุ่ม โดเนท, สีปุ่มโดเนท -->
          <div class="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-4">
            <h3 class="text-xs uppercase tracking-widest font-black text-pink-400">👉 สไตล์ปุ่มโดเนทหลัก (Submit Button Config)</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400">สีปุ่มส่งสนับสนุนโดเนท (BG Color)</label>
                <div class="flex items-center gap-2">
                  <div class="relative w-8 h-8 rounded border border-slate-800 overflow-hidden flex-shrink-0">
                    <input type="color" class="absolute inset-0 w-full h-full cursor-pointer scale-125 border-none p-0" bind:value={submitBtnColor} />
                  </div>
                  <input type="text" class="px-2 py-1 bg-slate-950 border border-slate-855 rounded text-xs text-slate-300 w-20 font-mono uppercase" bind:value={submitBtnColor} />
                </div>
              </div>
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400">สีตัวอักษรของปุ่มโดเนท</label>
                <div class="flex items-center gap-2">
                  <div class="relative w-8 h-8 rounded border border-slate-800 overflow-hidden flex-shrink-0">
                    <input type="color" class="absolute inset-0 w-full h-full cursor-pointer scale-125 border-none p-0" bind:value={submitBtnTextColor} />
                  </div>
                  <input type="text" class="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono" bind:value={submitBtnTextColor} />
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-800/40">
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="sb-font">ตระกูลฟอนต์ของปุ่มโดเนท (Font Family)</label>
                <input id="sb-font" type="text" placeholder="เช่น Mitr, Kanit" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white" bind:value={submitBtnFontFamily} />
              </div>
            </div>
          </div>

          <button type="submit" disabled={isSaving} class="w-full py-4 text-white font-extrabold rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] shadow-lg text-xs tracking-wider uppercase" style="background: {nameColor}; box-shadow: 0 8px 24px rgba(0,0,0,0.3);">
            {#if isSaving}
              กำลังส่งข้อมูลประยุกต์ใช้ดีไซน์ขึ้นคลัง GitHub...
            {:else}
              บันทึกองค์ประกอบดีไซน์เสรี ✨
            {/if}
          </button>
        </form>
      </div>

      <!-- 📺 หน้าต่างจำลองแสดงผลสด (Live Preview Mockup) -->
      <div class="lg:col-span-5 flex flex-col space-y-4 sticky top-6">
        <h2 class="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <svg class="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          พรีวิวสลับดีไซน์อัตโนมัติ (Live Layout Preview)
        </h2>

        <!-- หน้าต่างมือถือจำลอง -->
        <div 
          class="w-full aspect-[9/13] rounded-3xl border border-slate-800 bg-cover bg-center relative overflow-y-auto shadow-2xl p-4 select-none pointer-events-none"
          style="
            background-image: {bgType === 'image' && bgUrl ? `url(${bgUrl})` : 'none'}; 
            background-color: {bgType === 'solid' ? bgColor : '#0b0f19'};
          "
        >
          <div class="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px]"></div>

          <div 
            class="relative w-full max-w-sm mx-auto rounded-3xl border p-4 text-xs text-white space-y-4 mt-2"
            style="
              background-color: {cardBgColor || 'rgba(15, 23, 42, 0.6)'};
              border-color: {cardBorderColor || 'rgba(30, 41, 59, 0.8)'};
            "
          >
            <!-- ส่วนแบนเนอร์สูงขึ้น 20% -->
            <div class="relative rounded-xl overflow-hidden border border-slate-800/30 pb-4 bg-slate-950/30">
              {#if bannerUrl}
                <div class="w-full h-20 bg-cover bg-center opacity-40" style="background-image: url({bannerUrl});"></div>
              {:else}
                <div class="w-full h-20 bg-slate-800/50 opacity-40"></div>
              {/if}

              <!-- โปรไฟล์อสมมาตรขนาดใหญ่ขึ้น 30% จัดสัดส่วน Left-Aligned ซ้อนกันสมบูรณ์ -->
              <div class="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3 px-3 -mt-8 sm:-mt-10 relative z-10 w-full">
                <!-- อวาตาร์โปรไฟล์ใหญ่ขึ้น -->
                <div class="relative flex-shrink-0">
                  <div class="absolute -inset-0.5 rounded-full blur-sm" style="background-color: {nameColor};"></div>
                  <img src={avatarUrl || 'https://placehold.co/100'} alt="Avatar" class="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-slate-950 object-cover shadow-xl" />
                </div>

                <!-- ข้อมูลด้านขวาและโซเชียลมีเดียห่างขึ้น -->
                <div class="flex-1 pt-8 sm:pt-10 text-left space-y-2">
                  <h4 class="font-extrabold text-[11px] truncate" style="color: {nameColor}; font-family: '{nameFontFamily}', sans-serif;">{vtuberName}</h4>
                  <p class="text-[9px] leading-relaxed" style="color: {welcomeColor}; font-family: '{welcomeFontFamily}', sans-serif;">{welcomeText}</p>
                  
                  <div class="flex gap-1.5 pt-1">
                    {#each socialLinks as link}
                      {#if link.url}
                        <span class="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold border" style="color: {socialColor}; border-color: {socialColor}; background-color: rgba(2, 6, 23, 0.6)">
                          {link.platform.substring(0,1).toUpperCase()}
                        </span>
                      {/if}
                    {/each}
                  </div>
                </div>
              </div>
            </div>

            <!-- ช่องเล่นตามลำดับ (แต่งสี + ฟอนต์หัวข้อ Label) -->
            <div class="space-y-1">
              <span class="block text-[9px] font-medium" style="color: {labelColor}; font-family: '{labelFontFamily}', sans-serif;">{nicknameLabel}</span>
              <div class="w-full h-8 rounded-lg border" style="background-color: {inputBgColor}; border-color: {inputBorderColor};"></div>
            </div>

            <div class="space-y-1">
              <span class="block text-[9px] font-medium" style="color: {labelColor}; font-family: '{labelFontFamily}', sans-serif;">{messageLabel}</span>
              <div class="w-full h-10 rounded-lg border" style="background-color: {inputBgColor}; border-color: {inputBorderColor};"></div>
            </div>

            <div class="space-y-1">
              <span class="block text-[9px] font-medium" style="color: {labelColor}; font-family: '{labelFontFamily}', sans-serif;">{presetLabel}</span>
              <div class="grid grid-cols-4 gap-1">
                <div class="py-1 text-center font-bold text-[8px] rounded border" style="background-color: {presetBtnColor}; border-color: {presetBorderColor}; color: {nameColor}; font-family: '{presetFontFamily}', sans-serif;">{presetAmount1}฿</div>
                <div class="py-1 text-center font-bold text-[8px] rounded border" style="background-color: {presetBtnColor}; border-color: {presetBorderColor}; color: {nameColor}; font-family: '{presetFontFamily}', sans-serif;">{presetAmount2}฿</div>
                <div class="py-1 text-center font-bold text-[8px] rounded border" style="background-color: {presetBtnColor}; border-color: {presetBorderColor}; color: {nameColor}; font-family: '{presetFontFamily}', sans-serif;">{presetAmount3}฿</div>
                <div class="py-1 text-center font-bold text-[8px] rounded border" style="background-color: {presetBtnColor}; border-color: {presetBorderColor}; color: {nameColor}; font-family: '{presetFontFamily}', sans-serif;">{presetAmount4}฿</div>
              </div>
            </div>

            <div class="space-y-1">
              <span class="block text-[9px] font-medium" style="color: {labelColor}; font-family: '{labelFontFamily}', sans-serif;">{amountLabel}</span>
              <div class="w-full h-8 rounded-lg border" style="background-color: {inputBgColor}; border-color: {inputBorderColor};"></div>
            </div>

            <div class="pt-2">
              <div class="w-full h-9 rounded-xl flex items-center justify-center font-extrabold text-[9px] shadow" style="background-color: {submitBtnColor}; color: {submitBtnTextColor}; font-family: '{submitBtnFontFamily}', sans-serif;">
                โดเนทสนับสนุน 💖
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  </main>
{/if}
