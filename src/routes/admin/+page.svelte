<svelte:head>
  <title>Admin Dashboard | Tips Secure Setup</title>
</svelte:head>

<script lang="ts">
  import { onMount } from 'svelte';
  import theme from '$lib/config/theme.json';

  // 🛡️ ระบบรหัสผ่านความปลอดภัยสูง
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

  // 4. Background รอง (กล่องฟอร์มแก้วโปร่งแสง)
  let cardBgColor = $state(theme.cardBgColor || '#0f172a');
  let cardOpacity = $state(theme.cardOpacity ?? 0.6);
  let cardBorderColor = $state(theme.cardBorderColor || '#1e293b');
  let cardBorderOpacity = $state(theme.cardBorderOpacity ?? 0.8);
  let cardBlur = $state(theme.cardBlur ?? 16);

  // 5. พื้นที่สีชื่อโปรไฟล์
  let profileAreaBgColor = $state(theme.profileAreaBgColor || '#020617');
  let profileAreaOpacity = $state(theme.profileAreaOpacity ?? 0.3);

  // 6. สีช่องกรอกข้อมูล
  let inputBgColor = $state(theme.inputBgColor || '#020617');
  let inputBgOpacity = $state(theme.inputBgOpacity ?? 0.8);
  let inputBorderColor = $state(theme.inputBorderColor || '#1e293b');

  // 7. ชื่อ, สี + Font ชื่อ + ขนาด Font ชื่อ
  let vtuberName = $state(theme.vtuberName || 'ชื่อสตรีมเมอร์');
  let nameColor = $state(theme.nameColor || '#db2777');
  let nameFontFamily = $state(theme.nameFontFamily || 'Mitr');
  let nameFontSize = $state(parseInt(theme.nameFontSize || '28'));

  // 8. คำทักทาย, สี + Font คำทักทาย + ขนาด Font คำทักทาย
  let welcomeText = $state(theme.welcomeText || '');
  let welcomeColor = $state(theme.welcomeColor || '#cbd5e1');
  let welcomeFontFamily = $state(theme.welcomeFontFamily || 'Mitr');
  let welcomeFontSize = $state(parseInt(theme.welcomeFontSize || '14'));

  // 9. ชื่อหัวข้อช่องกรอกต่างๆ (Labels), สี + Font หัวข้อ + ขนาด Font หัวข้อ
  let nicknameLabel = $state(theme.nicknameLabel || 'ชื่อเล่นของคุณ (Nickname)');
  let messageLabel = $state(theme.messageLabel || 'ข้อความสนับสนุน (ส่งอวยพรขึ้นจอไลฟ์สด)');
  let amountLabel = $state(theme.amountLabel || 'ระบุจำนวนเงินเอง (บาท)');
  let presetLabel = $state(theme.presetLabel || 'เลือกยอดเงินสนับสนุนด่วน 🌸');
  let labelColor = $state(theme.labelColor || '#94a3b8');
  let labelFontFamily = $state(theme.labelFontFamily || 'Mitr');
  let labelFontSize = $state(parseInt(theme.labelFontSize || '14'));

  // 10. Link social media + สี link social media
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

  // 11. แก้ preset ราคา, สี + Font preset ราคา + ขนาด Font preset ราคา
  let presetAmount1 = $state(theme.presetAmounts?.[0] ?? 20);
  let presetAmount2 = $state(theme.presetAmounts?.[1] ?? 50);
  let presetAmount3 = $state(theme.presetAmounts?.[2] ?? 100);
  let presetAmount4 = $state(theme.presetAmounts?.[3] ?? 500);
  let presetFontFamily = $state(theme.presetFontFamily || 'Mitr');
  let presetFontSize = $state(parseInt(theme.presetFontSize || '14'));
  let presetBtnColor = $state(theme.presetBtnColor || '#0f172a');
  let presetBorderColor = $state(theme.presetBorderColor || '#1e293b');

  // 12. สี + Font ปุ่มโดเนท + ขนาด Font ปุ่มโดเนท, สีปุ่มโดเนท, สีตัวอักษรปุ่มโดเนท, ข้อความปุ่มโดเนท
  let submitBtnColor = $state(theme.submitBtnColor || '#db2777');
  let submitBtnTextColor = $state(theme.submitBtnTextColor || '#ffffff');
  let submitBtnFontFamily = $state(theme.submitBtnFontFamily || 'Mitr');
  let submitBtnFontSize = $state(parseInt(theme.submitBtnFontSize || '16'));
  let submitBtnText = $state(theme.submitBtnText || 'โดเนทสนับสนุน 💖');

  let isSaving = $state(false);

  // 🛠️ แปลง HEX เป็น RGBA ให้ประมวลผลความโปร่งแสงสดๆ
  const hexToRgba = (hex: string, opacity: number): string => {
    if (!hex) return `rgba(15, 23, 42, ${opacity})`;
    const cleanHex = hex.replace('#', '');
    if (cleanHex.length !== 6) return hex;
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  // 🛡️ โหลดคิว Google Fonts เรียลไทม์
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
        authError = data.error || 'รหัสผ่านไม่ถูกต้องกรุณาลองใหม่อีกครั้งค่ะ';
      }
    } catch (err) {
      authError = 'เครือข่ายความปลอดภัยหลังบ้านปฏิเสธคำขอ';
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
            cardBgColor, cardOpacity, cardBorderColor, cardBorderOpacity, cardBlur,
            profileAreaBgColor, profileAreaOpacity,
            inputBgColor, inputBgOpacity, inputBorderColor,
            vtuberName, nameColor, nameFontFamily, nameFontSize: `${nameFontSize}px`,
            welcomeText, welcomeColor, welcomeFontFamily, welcomeFontSize: `${welcomeFontSize}px`,
            nicknameLabel, messageLabel, amountLabel, presetLabel,
            labelColor, labelFontFamily, labelFontSize: `${labelFontSize}px`,
            socialLinks, socialColor,
            presetAmounts: finalPresets, presetFontFamily, presetFontSize: `${presetFontSize}px`, presetBtnColor, presetBorderColor,
            submitBtnColor, submitBtnTextColor, submitBtnFontFamily, submitBtnFontSize: `${submitBtnFontSize}px`, submitBtnText
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

{#each uniqueFonts as font}
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family={font.trim().replace(/\s+/g, '+')}:wght@400;500;700&display=swap" />
{/each}

{#if !isAuthenticated}
  <!-- 🔐 ด่านล็อกอินเพื่อปลดล็อก Dashboard -->
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
            กำลังตรวจสอบสิทธิ์...
          {:else}
            ปลดล็อกระบบควบคุม 🔓
          {/if}
        </button>
      </form>
    </div>
  </main>
{:else}
  <!-- 💅 คอนโซลหลังบ้าน -->
  <main class="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 md:p-8">
    <header class="max-w-7xl w-full mx-auto mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
      <div>
        <h1 class="text-3xl font-extrabold tracking-wide text-pink-400">💅 แผงตั้งค่าดีไซน์เสรีระดับพรีเมียม</h1>
        <p class="text-slate-400 text-sm mt-1">คุมดีไซน์ ความเบลอกระจกฝ้า ขนาดฟอนต์ และเฉดสีโปร่งใสได้อย่างเบ็ดเสร็จค่ะ</p>
      </div>
      <button onclick={handleLogout} class="px-4 py-2 bg-slate-900 hover:bg-red-950/40 border border-slate-800 hover:border-red-500/30 text-xs font-bold text-slate-400 hover:text-red-400 rounded-xl transition-all cursor-pointer">
        ออกจากระบบผู้รักษาความปลอดภัย 🚪
      </button>
    </header>

    <div class="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      <!-- ⚙️ แถบควบคุมปรับสไตล์ (7 จาก 12) -->
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
                <input id="avatar-img" type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono" bind:value={avatarUrl} />
              </div>
            </div>
          </div>

          <!-- [2] Banner -->
          <div class="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-3">
            <h3 class="text-xs uppercase tracking-widest font-black text-pink-400">👉 Banner (ขยายขนาดแบนเนอร์เพิ่มอีก 20% + Fade Blending)</h3>
            <div class="space-y-3">
              <div class="w-full h-32 rounded-xl border border-slate-800 bg-cover bg-center opacity-70 bg-slate-950" style="background-image: {bannerUrl ? `url(${bannerUrl})` : 'none'}">
                {#if !bannerUrl}
                  <div class="w-full h-full flex items-center justify-center text-xs text-slate-500 font-bold">ไม่มีภาพแบนเนอร์ (จะแสดงเป็นสีใส)</div>
                {/if}
              </div>
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="banner-img">ลิงก์ภาพแบนเนอร์ใหญ่ (Banner URL)</label>
                <input id="banner-img" type="text" placeholder="ปล่อยว่างไว้เพื่อโชว์สีใสสะอาดตาค่ะ" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono" bind:value={bannerUrl} />
              </div>
            </div>
          </div>

          <!-- [3] Background หลัก -->
          <div class="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-4">
            <h3 class="text-xs uppercase tracking-widest font-black text-pink-400">👉 Background หลัก (พื้นหลังหน้าเว็บ)</h3>
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

          <!-- [4] Background รอง (กล่องฟอร์มแก้วโปร่งแสง) -->
          <div class="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-4">
            <h3 class="text-xs uppercase tracking-widest font-black text-pink-400">👉 Background รอง (กล่องฟอร์มกระจกฝ้าโปร่งแสง)</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="block text-[10px] font-bold text-slate-400">สีพื้นหลังกล่อง (HEX)</label>
                <div class="flex items-center gap-2">
                  <div class="relative w-8 h-8 rounded border border-slate-800 overflow-hidden flex-shrink-0">
                    <input type="color" class="absolute inset-0 w-full h-full cursor-pointer scale-125 border-none p-0" bind:value={cardBgColor} />
                  </div>
                  <input type="text" class="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono" bind:value={cardBgColor} />
                </div>
              </div>
              <div class="space-y-1.5">
                <label class="block text-[10px] font-bold text-slate-400">ระดับความโปร่งใสกล่อง (Opacity: {cardOpacity})</label>
                <input type="range" min="0" max="1" step="0.05" class="w-full accent-pink-500" bind:value={cardOpacity} />
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-800/30">
              <div class="space-y-1.5">
                <label class="block text-[10px] font-bold text-slate-400">สีขอบกล่อง (HEX)</label>
                <div class="flex items-center gap-2">
                  <div class="relative w-8 h-8 rounded border border-slate-800 overflow-hidden flex-shrink-0">
                    <input type="color" class="absolute inset-0 w-full h-full cursor-pointer scale-125 border-none p-0" bind:value={cardBorderColor} />
                  </div>
                  <input type="text" class="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono" bind:value={cardBorderColor} />
                </div>
              </div>
              <div class="space-y-1.5">
                <label class="block text-[10px] font-bold text-slate-400">ความโปร่งขอบ (Border Opacity: {cardBorderOpacity})</label>
                <input type="range" min="0" max="1" step="0.05" class="w-full accent-pink-500" bind:value={cardBorderOpacity} />
              </div>
              <div class="space-y-1.5">
                <label class="block text-[10px] font-bold text-slate-400">ความเบลอกล่องกระจก (Blur: {cardBlur}px)</label>
                <input type="range" min="0" max="40" step="1" class="w-full accent-pink-500" bind:value={cardBlur} />
              </div>
            </div>
          </div>

          <!-- [5] พื้นที่สีชื่อโปรไฟล์ (Profile Area Background) -->
          <div class="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-4">
            <h3 class="text-xs uppercase tracking-widest font-black text-pink-400">👉 พื้นหลังบริเวณส่วนหัวโปรไฟล์ (Profile Header Background)</h3>
            <p class="text-[10px] text-slate-400">ช่วยให้พื้นที่ ชื่อ, คำทักทาย และ Social Media มีฉากหลังเป็นของตัวเอง เพื่อผสาน Fade กับภาพแบนเนอร์ด้านบนค่ะ</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="block text-[10px] font-bold text-slate-400">สีพื้นหลังส่วนหัว (HEX)</label>
                <div class="flex items-center gap-2">
                  <div class="relative w-8 h-8 rounded border border-slate-800 overflow-hidden flex-shrink-0">
                    <input type="color" class="absolute inset-0 w-full h-full cursor-pointer scale-125 border-none p-0" bind:value={profileAreaBgColor} />
                  </div>
                  <input type="text" class="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono" bind:value={profileAreaBgColor} />
                </div>
              </div>
              <div class="space-y-1.5">
                <label class="block text-[10px] font-bold text-slate-400">ความโปร่งฉากหลังส่วนหัว (Opacity: {profileAreaOpacity})</label>
                <input type="range" min="0" max="1" step="0.05" class="w-full accent-pink-500" bind:value={profileAreaOpacity} />
              </div>
            </div>
          </div>

          <!-- [6] สีช่องกรอกข้อมูล -->
          <div class="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-3">
            <h3 class="text-xs uppercase tracking-widest font-black text-pink-400">👉 สีช่องกรอกข้อมูล (Inputs Field Styling)</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400">สีพื้นหลังช่องข้อความ (HEX)</label>
                <div class="flex items-center gap-2">
                  <div class="relative w-8 h-8 rounded border border-slate-800 overflow-hidden flex-shrink-0">
                    <input type="color" class="absolute inset-0 w-full h-full cursor-pointer scale-125 border-none p-0" bind:value={inputBgColor} />
                  </div>
                  <input type="text" class="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono" bind:value={inputBgColor} />
                </div>
              </div>
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400">ความโปร่งหลังช่องกรอก (Opacity: {inputBgOpacity})</label>
                <input type="range" min="0" max="1" step="0.05" class="w-full accent-pink-500" bind:value={inputBgOpacity} />
              </div>
              <div class="space-y-1 col-span-2 pt-2 border-t border-slate-800/30">
                <label class="block text-[10px] font-bold text-slate-400">สีเส้นขอบช่องข้อความ (HEX)</label>
                <div class="flex items-center gap-2">
                  <div class="relative w-8 h-8 rounded border border-slate-800 overflow-hidden flex-shrink-0">
                    <input type="color" class="absolute inset-0 w-full h-full cursor-pointer scale-125 border-none p-0" bind:value={inputBorderColor} />
                  </div>
                  <input type="text" class="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono" bind:value={inputBorderColor} />
                </div>
              </div>
            </div>
          </div>

          <!-- [7] ชื่อ, สี + Font ชื่อ + ขนาด Font ชื่อ -->
          <div class="p-5 bg-slate-950/60 border border-slate-855 rounded-2xl space-y-4">
            <h3 class="text-xs uppercase tracking-widest font-black text-pink-400">👉 ชื่อสตรีมเมอร์ สี และฟอนต์ขนาดพิกเซล</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="v-name">ชื่อช่องสตรีมเมอร์</label>
                <input id="v-name" type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-semibold" bind:value={vtuberName} />
              </div>
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400">สีของชื่อช่อง</label>
                <div class="flex items-center gap-2">
                  <div class="relative w-8 h-8 rounded border border-slate-800 overflow-hidden flex-shrink-0">
                    <input type="color" class="absolute inset-0 w-full h-full cursor-pointer scale-125 border-none p-0" bind:value={nameColor} />
                  </div>
                  <input type="text" class="px-2 py-1.5 bg-slate-950 border border-slate-855 rounded text-xs text-slate-300 w-20 font-mono uppercase" bind:value={nameColor} />
                </div>
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800/30">
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="v-font">ชื่อฟอนต์กูเกิล (Font Family)</label>
                <input id="v-font" type="text" placeholder="เช่น Mitr, Kanit" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-semibold" bind:value={nameFontFamily} />
              </div>
              <div class="space-y-1.5">
                <label class="block text-[10px] font-bold text-slate-400">ขนาดตัวอักษรชื่อช่อง (Font Size: {nameFontSize}px)</label>
                <input type="range" min="14" max="60" step="1" class="w-full accent-pink-500" bind:value={nameFontSize} />
              </div>
            </div>
          </div>

          <!-- [8] คำทักทาย, สี + Font คำทักทาย + ขนาด Font คำทักทาย -->
          <div class="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-4">
            <h3 class="text-xs uppercase tracking-widest font-black text-pink-400">👉 คำทักทาย สี และฟอนต์ขนาดพิกเซล</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="space-y-1 col-span-2">
                <label class="block text-[10px] font-bold text-slate-400" for="wel-text">คำทักทายต้อนรับหลัก</label>
                <textarea id="wel-text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-medium" rows="2" bind:value={welcomeText}></textarea>
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
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800/30">
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="wel-font">ฟอนต์คำทักทาย (Font Family)</label>
                <input id="wel-font" type="text" placeholder="เช่น Mitr, Sarabun" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-semibold" bind:value={welcomeFontFamily} />
              </div>
              <div class="space-y-1.5">
                <label class="block text-[10px] font-bold text-slate-400">ขนาดฟอนต์คำทักทาย (Font Size: {welcomeFontSize}px)</label>
                <input type="range" min="10" max="36" step="1" class="w-full accent-pink-500" bind:value={welcomeFontSize} />
              </div>
            </div>
          </div>

          <!-- [9] ชื่อหัวข้อช่องกรอกต่างๆ (Labels), สี + Font หัวข้อ + ขนาด Font หัวข้อ -->
          <div class="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-4">
            <h3 class="text-xs uppercase tracking-widest font-black text-pink-400">👉 ชื่อช่องกรอก และขนาดฟอนต์หัวข้อ Label</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400">สีหัวข้อป้ายช่องกรอก</label>
                <div class="flex items-center gap-2">
                  <div class="relative w-8 h-8 rounded border border-slate-800 overflow-hidden flex-shrink-0">
                    <input type="color" class="absolute inset-0 w-full h-full cursor-pointer scale-125 border-none p-0" bind:value={labelColor} />
                  </div>
                  <input type="text" class="px-2 py-1 bg-slate-950 border border-slate-850 rounded text-xs text-slate-300 w-20 font-mono uppercase" bind:value={labelColor} />
                </div>
              </div>
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="lbl-font-f">ฟอนต์หัวข้อ (Font Family)</label>
                <input id="lbl-font-f" type="text" placeholder="เช่น Mitr, Kanit" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-semibold" bind:value={labelFontFamily} />
              </div>
              <div class="space-y-1.5">
                <label class="block text-[10px] font-bold text-slate-400">ขนาดฟอนต์ (Font Size: {labelFontSize}px)</label>
                <input type="range" min="10" max="32" step="1" class="w-full accent-pink-500" bind:value={labelFontSize} />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800/20">
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="l-nick">ป้ายช่องชื่อเล่น</label>
                <input id="l-nick" type="text" class="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-semibold" bind:value={nicknameLabel} />
              </div>
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="l-msg">ป้ายช่องเขียนข้อความ</label>
                <input id="l-msg" type="text" class="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-semibold" bind:value={messageLabel} />
              </div>
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="l-preset">ป้ายปุ่มเลือกเงินด่วน</label>
                <input id="l-preset" type="text" class="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-semibold" bind:value={presetLabel} />
              </div>
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="l-amt">ป้ายระบุเงินกำหนดเอง</label>
                <input id="l-amt" type="text" class="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-semibold" bind:value={amountLabel} />
              </div>
            </div>
          </div>

          <!-- [10] Link social media + สี link social media -->
          <div class="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-4">
            <h3 class="text-xs uppercase tracking-widest font-black text-pink-400">👉 บัญชีโซเชียลมีเดีย และสีปุ่มทางออก</h3>
            <div class="space-y-1">
              <label class="block text-[10px] font-bold text-slate-400">สีปุ่ม Social Media</label>
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
                  <input type="text" placeholder="ปล่อยว่างไว้หากไม่มี..." class="flex-1 bg-transparent border-b border-slate-800 py-1 text-xs text-white focus:outline-none focus:border-pink-500" bind:value={link.url} />
                </div>
              {/each}
            </div>
          </div>

          <!-- [11] แก้ preset ราคา, สี + Font preset ราคา + ขนาด Font preset ราคา -->
          <div class="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-4">
            <h3 class="text-xs uppercase tracking-widest font-black text-pink-400">👉 ตั้งค่าเงินด่วน (Presets) สี ขนาด และฟอนต์ปุ่มด่วน</h3>
            <div class="grid grid-cols-4 gap-2">
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400">ปุ่ม 1 (฿)</label>
                <input type="number" class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-bold" bind:value={presetAmount1} />
              </div>
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400">ปุ่ม 2 (฿)</label>
                <input type="number" class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-bold" bind:value={presetAmount2} />
              </div>
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400">ปุ่ม 3 (฿)</label>
                <input type="number" class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-bold" bind:value={presetAmount3} />
              </div>
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400">ปุ่ม 4 (฿)</label>
                <input type="number" class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-bold" bind:value={presetAmount4} />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="p-font">ฟอนต์ปุ่มด่วน (Font Family)</label>
                <input id="p-font" type="text" placeholder="เช่น Mitr, Kanit" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-semibold" bind:value={presetFontFamily} />
              </div>
              <div class="space-y-1.5">
                <label class="block text-[10px] font-bold text-slate-400">ขนาดฟอนต์ปุ่มด่วน (Font Size: {presetFontSize}px)</label>
                <input type="range" min="10" max="32" step="1" class="w-full accent-pink-500" bind:value={presetFontSize} />
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

          <!-- [12] สี + Font ปุ่มโดเนท + ขนาด Font ปุ่มโดเนท, สีปุ่มโดเนท, สีตัวอักษรปุ่มโดเนท, ข้อความปุ่มโดเนท -->
          <div class="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-4">
            <h3 class="text-xs uppercase tracking-widest font-black text-pink-400">👉 ดีไซน์ปุ่มส่งสนับสนุนโดเนทหลัก (Submit Button)</h3>
            <div class="space-y-2">
              <label class="block text-[10px] font-bold text-slate-400" for="btn-txt">ข้อความแสดงบนปุ่มโดเนทหลัก</label>
              <input id="btn-txt" type="text" class="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-bold" bind:value={submitBtnText} />
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800/30">
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400">สีพื้นหลังของปุ่มโดเนท</label>
                <div class="flex items-center gap-2">
                  <div class="relative w-8 h-8 rounded border border-slate-800 overflow-hidden flex-shrink-0">
                    <input type="color" class="absolute inset-0 w-full h-full cursor-pointer scale-125 border-none p-0" bind:value={submitBtnColor} />
                  </div>
                  <input type="text" class="px-2 py-1.5 bg-slate-950 border border-slate-855 rounded text-xs text-slate-300 w-20 font-mono uppercase" bind:value={submitBtnColor} />
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
                <label class="block text-[10px] font-bold text-slate-400" for="btn-font">ฟอนต์ปุ่มโดเนท (Font Family)</label>
                <input id="btn-font" type="text" placeholder="เช่น Mitr, Kanit" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-semibold" bind:value={submitBtnFontFamily} />
              </div>
              <div class="space-y-1.5">
                <label class="block text-[10px] font-bold text-slate-400">ขนาดฟอนต์ปุ่มโดเนท (Font Size: {submitBtnFontSize}px)</label>
                <input type="range" min="12" max="36" step="1" class="w-full accent-pink-500" bind:value={submitBtnFontSize} />
              </div>
            </div>
          </div>

          <button type="submit" disabled={isSaving} class="w-full py-4 text-white font-extrabold rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] shadow-lg text-xs tracking-wider uppercase" style="background: {nameColor}; box-shadow: 0 8px 24px rgba(0,0,0,0.3);">
            {#if isSaving}
              กำลังบันทึกดีไซน์ส่งขึ้นคลัง GitHub...
            {:else}
              บันทึกสไตล์การแต่งแบรนด์เสรี ✨
            {/if}
          </button>
        </form>
      </div>

      <!-- 📺 พรีวิวจำลองผลแบบ Live (5 จาก 12) -->
      <div class="lg:col-span-5 flex flex-col space-y-4 sticky top-6">
        <h2 class="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <svg class="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          สลับพรีวิวเรียลไทม์ (Live Layout Preview)
        </h2>

        <!-- หน้าต่างมือถือจำลองสัดส่วนใหม่ทั้งหมด -->
        <div 
          class="w-full aspect-[9/13] rounded-3xl border border-slate-800 bg-cover bg-center relative overflow-y-auto shadow-2xl p-4 select-none pointer-events-none"
          style="
            background-image: {bgType === 'image' && bgUrl ? `url(${bgUrl})` : 'none'}; 
            background-color: {bgType === 'solid' ? bgColor : '#0b0f19'};
          "
        >
          <div class="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px]"></div>

          <div 
            class="relative w-full max-w-sm mx-auto rounded-3xl border p-4 text-xs text-white space-y-4 mt-2 transition-all duration-300"
            style="
              background-color: {hexToRgba(cardBgColor, cardOpacity)};
              border-color: {hexToRgba(cardBorderColor, cardBorderOpacity)};
              backdrop-filter: blur({cardBlur}px);
            "
          >
            <!-- ส่วนหัวรวมแบนเนอร์ขยายขนาดขึ้นอีก 20% + Fade Blending -->
            <div 
              class="relative rounded-xl overflow-hidden border border-slate-800/30 pb-4 transition-all duration-500"
              style="background-color: {hexToRgba(profileAreaBgColor, profileAreaOpacity)};"
            >
              {#if bannerUrl}
                <div class="w-full h-24 bg-cover bg-center opacity-40" style="background-image: url({bannerUrl});"></div>
              {:else}
                <div class="w-full h-24 bg-slate-800/50 opacity-40"></div>
              {/if}
              
              <!-- Gradient Blend ทับระหว่าง แบนเนอร์ กับฉากหลังส่วนหัว -->
              <div 
                class="absolute top-12 left-0 right-0 h-12 bg-gradient-to-t"
                style="background-image: linear-gradient(to top, {hexToRgba(profileAreaBgColor, profileAreaOpacity)}, transparent);"
              ></div>

              <!-- โปรไฟล์จัดเกยทับ banner ลงมาเพียง 10% (ใช้ -mt-3.5) -->
              <div class="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3 px-3 -mt-3.5 relative z-10 w-full">
                <!-- อวาตาร์โปรไฟล์ขนาด 30% -->
                <div class="relative flex-shrink-0">
                  <div class="absolute -inset-0.5 rounded-full blur-sm" style="background-color: {nameColor};"></div>
                  <img src={avatarUrl || 'https://placehold.co/100'} alt="Avatar" class="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-slate-950 object-cover shadow-xl" />
                </div>

                <!-- ข้อมูลด้านขวาและโซเชียลมีเดียห่างขึ้น -->
                <div class="flex-1 pt-4 text-left space-y-3">
                  <h4 class="font-extrabold truncate" style="color: {nameColor}; font-family: '{nameFontFamily}', sans-serif; font-size: {nameFontSize * 0.4}px;">{vtuberName}</h4>
                  <p class="leading-relaxed" style="color: {welcomeColor}; font-family: '{welcomeFontFamily}', sans-serif; font-size: {welcomeFontSize * 0.7}px;">{welcomeText}</p>
                  
                  <div class="flex gap-2 pt-1">
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
              <span class="block font-medium" style="color: {labelColor}; font-family: '{labelFontFamily}', sans-serif; font-size: {labelFontSize * 0.7}px;">{nicknameLabel}</span>
              <div class="w-full h-8 rounded-lg border" style="background-color: {hexToRgba(inputBgColor, inputBgOpacity)}; border-color: {inputBorderColor};"></div>
            </div>

            <div class="space-y-1">
              <span class="block font-medium" style="color: {labelColor}; font-family: '{labelFontFamily}', sans-serif; font-size: {labelFontSize * 0.7}px;">{messageLabel}</span>
              <div class="w-full h-10 rounded-lg border" style="background-color: {hexToRgba(inputBgColor, inputBgOpacity)}; border-color: {inputBorderColor};"></div>
            </div>

            <div class="space-y-1">
              <span class="block font-medium" style="color: {labelColor}; font-family: '{labelFontFamily}', sans-serif; font-size: {labelFontSize * 0.7}px;">{presetLabel}</span>
              <div class="grid grid-cols-4 gap-1">
                <div class="py-1 text-center font-bold border rounded" style="background-color: {presetBtnColor}; border-color: {presetBorderColor}; color: {nameColor}; font-family: '{presetFontFamily}', sans-serif; font-size: {presetFontSize * 0.7}px;">{presetAmount1}฿</div>
                <div class="py-1 text-center font-bold border rounded" style="background-color: {presetBtnColor}; border-color: {presetBorderColor}; color: {nameColor}; font-family: '{presetFontFamily}', sans-serif; font-size: {presetFontSize * 0.7}px;">{presetAmount2}฿</div>
                <div class="py-1 text-center font-bold border rounded" style="background-color: {presetBtnColor}; border-color: {presetBorderColor}; color: {nameColor}; font-family: '{presetFontFamily}', sans-serif; font-size: {presetFontSize * 0.7}px;">{presetAmount3}฿</div>
                <div class="py-1 text-center font-bold border rounded" style="background-color: {presetBtnColor}; border-color: {presetBorderColor}; color: {nameColor}; font-family: '{presetFontFamily}', sans-serif; font-size: {presetFontSize * 0.7}px;">{presetAmount4}฿</div>
              </div>
            </div>

            <div class="space-y-1">
              <span class="block font-medium" style="color: {labelColor}; font-family: '{labelFontFamily}', sans-serif; font-size: {labelFontSize * 0.7}px;">{amountLabel}</span>
              <div class="w-full h-8 rounded-lg border" style="background-color: {hexToRgba(inputBgColor, inputBgOpacity)}; border-color: {inputBorderColor};"></div>
            </div>

            <div class="pt-2">
              <div class="w-full h-9 rounded-xl flex items-center justify-center font-extrabold shadow" style="background-color: {submitBtnColor}; color: {submitBtnTextColor}; font-family: '{submitBtnFontFamily}', sans-serif; font-size: {submitBtnFontSize * 0.7}px;">
                {submitBtnText}
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  </main>
{/if}
