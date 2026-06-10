<svelte:head>
  <title>Admin Panel | Tips Configuration</title>
</svelte:head>

<script lang="ts">
  import { onMount } from 'svelte';
  import theme from '$lib/config/theme.json';

  // 🛡️ ระบบรหัสผ่านด่านแรกสุด (Authentication Gate)
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

  // 6. ชื่อ, สี+url font ชื่อ
  let vtuberName = $state(theme.vtuberName || 'ชื่อสตรีมเมอร์');
  let nameColor = $state(theme.nameColor || '#db2777');
  let nameFontUrl = $state(theme.nameFontUrl || '');
  let nameFontFamily = $state(theme.nameFontFamily || 'sans-serif');

  // 7. คำทักทาย, สี+url font คำทักทาย, ชื่อช่องกรอกต่างๆ
  let welcomeText = $state(theme.welcomeText || '');
  let welcomeColor = $state(theme.welcomeColor || '#cbd5e1');
  let welcomeFontUrl = $state(theme.welcomeFontUrl || '');
  let welcomeFontFamily = $state(theme.welcomeFontFamily || 'sans-serif');
  let nicknameLabel = $state(theme.nicknameLabel || 'ชื่อเล่นของคุณ (Nickname)');
  let messageLabel = $state(theme.messageLabel || 'ข้อความสนับสนุน (ส่งอวยพรขึ้นจอไลฟ์สด)');
  let amountLabel = $state(theme.amountLabel || 'ระบุจำนวนเงินเอง (บาท)');
  let presetLabel = $state(theme.presetLabel || 'เลือกยอดเงินสนับสนุนด่วน 🌸');

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

  // 9. แก้ preset ราคา, สี+url font preset ราคา
  let presetAmount1 = $state(theme.presetAmounts?.[0] ?? 20);
  let presetAmount2 = $state(theme.presetAmounts?.[1] ?? 50);
  let presetAmount3 = $state(theme.presetAmounts?.[2] ?? 100);
  let presetAmount4 = $state(theme.presetAmounts?.[3] ?? 500);
  let presetFontUrl = $state(theme.presetFontUrl || '');
  let presetFontFamily = $state(theme.presetFontFamily || 'sans-serif');
  let presetBtnColor = $state(theme.presetBtnColor || '#0f172a');
  let presetBorderColor = $state(theme.presetBorderColor || '#1e293b');

  // 10. สี+url font ปุ่ม โดเนท, สีปุ่มโดเนท
  let submitBtnColor = $state(theme.submitBtnColor || '#db2777');
  let submitBtnTextColor = $state(theme.submitBtnTextColor || '#ffffff');
  let submitBtnFontUrl = $state(theme.submitBtnFontUrl || '');
  let submitBtnFontFamily = $state(theme.submitBtnFontFamily || 'sans-serif');

  let isSaving = $state(false);

  onMount(() => {
    // โหลดประวัติการผ่านรหัสผ่านมาใช้เพื่อไม่ให้ขัดจังหวะการจัดตกแต่งตอนรีเพรชหน้าเว็บ
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
      authError = 'เกิดข้อผิดพลาดด้านการติดต่อสื่อสารกับระบบรักษาความปลอดภัยค่ะ';
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
            vtuberName, nameColor, nameFontUrl, nameFontFamily,
            welcomeText, welcomeColor, welcomeFontUrl, welcomeFontFamily,
            nicknameLabel, messageLabel, amountLabel, presetLabel,
            socialLinks, socialColor,
            presetAmounts: finalPresets, presetFontUrl, presetFontFamily, presetBtnColor, presetBorderColor,
            submitBtnColor, submitBtnTextColor, submitBtnFontUrl, submitBtnFontFamily
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

{#if !isAuthenticated}
  <!-- 🔐 หน้าด่านกรอกรหัสผ่านก่อนเข้าเพจ (Password Overlay) -->
  <main class="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
    <div class="w-full max-w-md bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 backdrop-blur-xl text-center">
      <div class="space-y-2">
        <span class="text-4xl block animate-pulse">🔐</span>
        <h1 class="text-2xl font-black tracking-wide text-pink-400">ควบคุมระบบส่วนตัว</h1>
        <p class="text-slate-400 text-xs">กรุณากรอก ADMIN_PASSWORD เพื่อเชื่อมสัญญาณแก้ไขหน้าบ้าน</p>
      </div>

      <form onsubmit={handleVerify} class="space-y-4 text-left">
        <div class="space-y-1.5">
          <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest" for="verify-pass">รหัสผ่านแอดมิน</label>
          <input 
            id="verify-pass" 
            type="password" 
            required 
            placeholder="••••••••" 
            class="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-center tracking-widest focus:ring-2 focus:ring-pink-500/50 focus:outline-none" 
            bind:value={inputPassword} 
          />
        </div>

        {#if authError}
          <p class="text-red-400 text-xs text-center font-bold animate-bounce">{authError}</p>
        {/if}

        <button 
          type="submit" 
          disabled={authenticating}
          class="w-full py-3 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-extrabold rounded-xl transition-all shadow-lg text-xs tracking-wider uppercase cursor-pointer"
        >
          {#if authenticating}
            กำลังส่งสัญญานตรวจสอบ...
          {:else}
            ยืนยันรหัสผ่าน 🔓
          {/if}
        </button>
      </form>
    </div>
  </main>
{:else}
  <!-- 💅 แผงควบคุมตกแต่งหลักเมื่อตรวจสอบผ่านแล้ว -->
  <main class="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 md:p-8">
    <header class="max-w-7xl w-full mx-auto mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
      <div>
        <h1 class="text-3xl font-extrabold tracking-wide text-pink-400">💅 แผงตั้งค่าดีไซน์เสรี</h1>
        <p class="text-slate-400 text-sm mt-1">ตกแต่ง ป้อน Google Fonts ปรับสีกล่อง และคุมช่องกรอกได้ทั้งหมดในหน้านี้เลยนะคะ</p>
      </div>
      <button onclick={handleLogout} class="px-4 py-2 bg-slate-900 hover:bg-red-950/40 border border-slate-800 hover:border-red-500/30 text-xs font-bold text-slate-400 hover:text-red-400 rounded-xl transition-all cursor-pointer">
        ออกจากระบบผู้รักษาความปลอดภัย 🚪
      </button>
    </header>

    <div class="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      <!-- ⚙️ ส่วนแก้ไขข้อมูล (สัดส่วน 7 จาก 12) -->
      <div class="lg:col-span-7 space-y-6">
        <form onsubmit={handleSave} class="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 md:p-8 backdrop-blur-md shadow-xl space-y-6">
          
          <!-- ขั้นตอนที่ 1: รูป Profile -->
          <div class="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-3">
            <h3 class="text-xs uppercase tracking-widest font-black text-pink-400">👉 รูป Profile (Avatar)</h3>
            <div class="flex items-center gap-4">
              <div class="w-16 h-16 rounded-full border border-slate-800 overflow-hidden flex-shrink-0 bg-slate-950">
                <img src={avatarUrl || 'https://placehold.co/150'} alt="Preview" class="w-full h-full object-cover" />
              </div>
              <div class="flex-1 space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="avatar">ลิงก์ภาพอวาตาร์ (Avatar URL)</label>
                <input id="avatar" type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white" bind:value={avatarUrl} />
              </div>
            </div>
          </div>

          <!-- ขั้นตอนที่ 2: Banner -->
          <div class="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-3">
            <h3 class="text-xs uppercase tracking-widest font-black text-pink-400">👉 Banner (แบนเนอร์กล่องโดเนท)</h3>
            <div class="space-y-3">
              <div class="w-full h-24 rounded-xl border border-slate-800 bg-cover bg-center opacity-70 bg-slate-950" style="background-image: {bannerUrl ? `url(${bannerUrl})` : 'none'}">
                {#if !bannerUrl}
                  <div class="w-full h-full flex items-center justify-center text-xs text-slate-500 font-bold">ไม่มีภาพแบนเนอร์ (จะโชว์เป็นขอบใส)</div>
                {/if}
              </div>
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="banner">ลิงก์ภาพแบนเนอร์ (Banner URL)</label>
                <input id="banner" type="text" placeholder="ปล่อยว่างไว้เพื่อโชว์สีใสสะอาดตาค่ะ" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white" bind:value={bannerUrl} />
              </div>
            </div>
          </div>

          <!-- ขั้นตอนที่ 3: Background หลัก -->
          <div class="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-4">
            <h3 class="text-xs uppercase tracking-widest font-black text-pink-400">👉 Background หลัก (พื้นหลังหน้าเว็บสากล)</h3>
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
                  <label class="block text-[10px] font-bold text-slate-400" for="bg-color">เลือกสีพื้นหลังเดี่ยว</label>
                  <div class="flex items-center gap-2">
                    <input id="bg-color" type="color" class="w-10 h-8 bg-slate-950 border border-slate-850 rounded cursor-pointer p-0.5" bind:value={bgColor} />
                    <input type="text" class="px-2 py-1 bg-slate-950 border border-slate-850 rounded text-xs text-slate-300 w-24 font-mono uppercase focus:outline-none" bind:value={bgColor} />
                  </div>
                {:else}
                  <label class="block text-[10px] font-bold text-slate-400" for="bg-url">ระบุ URL ภาพพื้นหลังใหญ่</label>
                  <input id="bg-url" type="text" placeholder="https://..." class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white" bind:value={bgUrl} />
                {/if}
              </div>
            </div>
          </div>

          <!-- ขั้นตอนที่ 4: Background รอง -->
          <div class="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-3">
            <h3 class="text-xs uppercase tracking-widest font-black text-pink-400">👉 Background รอง (ดีไซน์ตัวกล่องฟอร์มโดเนท)</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="card-bg">สีและระดับความโปร่งใสกล่อง (HEX / RGBA)</label>
                <input id="card-bg" type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono" bind:value={cardBgColor} />
              </div>
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="card-border">สีและขอบกล่อง (HEX / RGBA)</label>
                <input id="card-border" type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono" bind:value={cardBorderColor} />
              </div>
            </div>
          </div>

          <!-- ขั้นตอนที่ 5: สีช่องกรอกข้อมูล -->
          <div class="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-3">
            <h3 class="text-xs uppercase tracking-widest font-black text-pink-400">👉 สีช่องกรอกข้อมูล (Inputs Field Styling)</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="input-bg">สีพื้นหลังช่องข้อความ (HEX / RGBA)</label>
                <input id="input-bg" type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono" bind:value={inputBgColor} />
              </div>
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="input-border">สีเส้นขอบช่องข้อความ (HEX / RGBA)</label>
                <input id="input-border" type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono" bind:value={inputBorderColor} />
              </div>
            </div>
          </div>

          <!-- ขั้นตอนที่ 6: ชื่อ, สี+url font ชื่อ -->
          <div class="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-3">
            <h3 class="text-xs uppercase tracking-widest font-black text-pink-400">👉 ชื่อแบรนด์, สี และฟอนต์สำหรับชื่อของท่าน</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="vt-name">ชื่อช่องสตรีมเมอร์</label>
                <input id="vt-name" type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white" bind:value={vtuberName} />
              </div>
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="n-color">สีของชื่อช่อง (Theme color)</label>
                <div class="flex items-center gap-2">
                  <input id="n-color" type="color" class="w-8 h-8 bg-slate-950 border border-slate-800 rounded cursor-pointer p-0.5" bind:value={nameColor} />
                  <input type="text" class="px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-slate-300 w-20 font-mono uppercase" bind:value={nameColor} />
                </div>
              </div>
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="n-font-fam">ชื่อตระกูลฟอนต์ (Font Family)</label>
                <input id="n-font-fam" type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white" bind:value={nameFontFamily} />
              </div>
            </div>
            <div class="space-y-1">
              <label class="block text-[10px] font-bold text-slate-400" for="n-font-url">Google Fonts Import URL สำหรับชื่อ</label>
              <input id="n-font-url" type="text" placeholder="https://fonts.googleapis.com/css2?family=..." class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono" bind:value={nameFontUrl} />
            </div>
          </div>

          <!-- ขั้นตอนที่ 7: คำทักทาย, สี+url font คำทักทาย, ชื่อช่องกรอกต่างๆ -->
          <div class="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-4">
            <h3 class="text-xs uppercase tracking-widest font-black text-pink-400">👉 คำทักทายต้อนรับ และตัวแก้ไขหัวข้อช่องกรอก (Labels)</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="space-y-1 col-span-2">
                <label class="block text-[10px] font-bold text-slate-400" for="wel-text">คำทักทายต้อนรับหลัก</label>
                <textarea id="wel-text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-medium" rows="2" bind:value={welcomeText}></textarea>
              </div>
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="wel-color">สีคำทักทาย</label>
                <div class="flex items-center gap-2">
                  <input id="wel-color" type="color" class="w-8 h-8 bg-slate-950 border border-slate-800 rounded cursor-pointer p-0.5" bind:value={welcomeColor} />
                  <input type="text" class="px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-slate-300 w-20 font-mono uppercase" bind:value={welcomeColor} />
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="wel-font-fam">ตระกูลฟอนต์คำทักทาย & ป้ายกำกับ</label>
                <input id="wel-font-fam" type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white" bind:value={welcomeFontFamily} />
              </div>
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="wel-font-url">Google Fonts Import URL คำทักทาย & ป้ายกำกับ</label>
                <input id="wel-font-url" type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono" bind:value={welcomeFontUrl} />
              </div>
            </div>

            <!-- ปรับหัวข้อป้ายกรอก -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800/60">
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="l-nick">หัวข้อช่องระบุชื่อเล่น</label>
                <input id="l-nick" type="text" class="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white" bind:value={nicknameLabel} />
              </div>
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="l-msg">หัวข้อช่องเขียนข้อความ</label>
                <input id="l-msg" type="text" class="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white" bind:value={messageLabel} />
              </div>
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="l-preset">หัวข้อปุ่มเลือกเงินสนับสนุนด่วน</label>
                <input id="l-preset" type="text" class="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white" bind:value={presetLabel} />
              </div>
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="l-amt">หัวข้อช่องเขียนราคาตามใจชอบ</label>
                <input id="l-amt" type="text" class="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white" bind:value={amountLabel} />
              </div>
            </div>
          </div>

          <!-- ขั้นตอนที่ 8: link social media + สี link social media -->
          <div class="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-4">
            <h3 class="text-xs uppercase tracking-widest font-black text-pink-400">👉 บัญชี Social Media และเฉดสีปุ่มของท่าน</h3>
            <div class="space-y-1">
              <label class="block text-[10px] font-bold text-slate-400" for="soc-color">โทนสีหลักของไอคอน Social Media</label>
              <div class="flex items-center gap-2">
                <input id="soc-color" type="color" class="w-8 h-8 bg-slate-950 border border-slate-800 rounded cursor-pointer p-0.5" bind:value={socialColor} />
                <input type="text" class="px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-slate-300 w-20 font-mono uppercase" bind:value={socialColor} />
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {#each socialLinks as link}
                <div class="flex items-center gap-2 bg-slate-950/70 p-2.5 border border-slate-800 rounded-xl">
                  <span class="text-[10px] font-black uppercase tracking-wider text-slate-400 w-20">{link.platform}</span>
                  <input type="text" placeholder="ปล่อยว่างหากไม่มี..." class="flex-1 bg-transparent border-b border-slate-800 py-1 text-xs text-white focus:outline-none focus:border-pink-500" bind:value={link.url} />
                </div>
              {/each}
            </div>
          </div>

          <!-- ขั้นตอนที่ 9: แก้ preset ราคา, สี+url font preset ราคา -->
          <div class="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-4">
            <h3 class="text-xs uppercase tracking-widest font-black text-pink-400">👉 ยอดเงินด่วน (Presets) ฟอนต์และสีของปุ่มยอดเงินด่วน</h3>
            <div class="grid grid-cols-4 gap-2">
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="pre-1">ปุ่มที่ 1 (฿)</label>
                <input id="pre-1" type="number" class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-bold" bind:value={presetAmount1} />
              </div>
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="pre-2">ปุ่มที่ 2 (฿)</label>
                <input id="pre-2" type="number" class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-bold" bind:value={presetAmount2} />
              </div>
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="pre-3">ปุ่มที่ 3 (฿)</label>
                <input id="pre-3" type="number" class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-bold" bind:value={presetAmount3} />
              </div>
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="pre-4">ปุ่มที่ 4 (฿)</label>
                <input id="pre-4" type="number" class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-bold" bind:value={presetAmount4} />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="pre-font-fam">ตระกูลฟอนต์ของปุ่มด่วน</label>
                <input id="pre-font-fam" type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white" bind:value={presetFontFamily} />
              </div>
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="pre-font-url">Google Fonts Import URL ปุ่มด่วน</label>
                <input id="pre-font-url" type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono" bind:value={presetFontUrl} />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-800/40">
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="pre-bg-col">สีพื้นหลังปุ่มด่วนปกติ (HEX / RGBA)</label>
                <input id="pre-bg-col" type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono" bind:value={presetBtnColor} />
              </div>
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="pre-border-col">สีเส้นขอบปุ่มด่วนปกติ (HEX / RGBA)</label>
                <input id="pre-border-col" type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono" bind:value={presetBorderColor} />
              </div>
            </div>
          </div>

          <!-- ขั้นตอนที่ 10: สี+url font ปุ่ม โดเนท, สีปุ่มโดเนท -->
          <div class="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-4">
            <h3 class="text-xs uppercase tracking-widest font-black text-pink-400">👉 สไตล์ปุ่มโดเนท (Submit Button Config)</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="sub-bg-col">สีพื้นหลังของปุ่มโดเนท</label>
                <div class="flex items-center gap-2">
                  <input id="sub-bg-col" type="color" class="w-8 h-8 bg-slate-950 border border-slate-800 rounded cursor-pointer p-0.5" bind:value={submitBtnColor} />
                  <input type="text" class="px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-slate-300 w-20 font-mono uppercase" bind:value={submitBtnColor} />
                </div>
              </div>
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="sub-txt-col">สีตัวอักษรของปุ่มโดเนท (HEX / RGBA)</label>
                <input id="sub-txt-col" type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono" bind:value={submitBtnTextColor} />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-800/40">
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="sub-font-fam">ตระกูลฟอนต์ของปุ่มโดเนท</label>
                <input id="sub-font-fam" type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white" bind:value={submitBtnFontFamily} />
              </div>
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400" for="sub-font-url">Google Fonts Import URL ปุ่มโดเนท</label>
                <input id="sub-font-url" type="text" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono" bind:value={submitBtnFontUrl} />
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

      <!-- 📺 คอลัมน์ที่ 2: หน้าต่างจำลองแสดงผลสด (Live Preview Mockup) -->
      <div class="lg:col-span-5 flex flex-col space-y-4 sticky top-6">
        <h2 class="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <svg class="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          พรีวิวสลับดีไซน์อัตโนมัติ (Live Layout Preview)
        </h2>

        <!-- หน้าต่างมือถือจำลอง (อัปเกรดให้ตรงกับสัดส่วนใหม่ทั้งหมด) -->
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
            <!-- ส่วนแบนเนอร์สูงขึ้น 1/3 พร้อมโปรไฟล์อสมมาตร Left-Aligned -->
            <div class="relative rounded-xl overflow-hidden border border-slate-800/30 pb-2 bg-slate-950/30">
              {#if bannerUrl}
                <div class="w-full h-16 bg-cover bg-center opacity-40" style="background-image: url({bannerUrl});"></div>
              {:else}
                <div class="w-full h-16 bg-slate-800/50 opacity-40"></div>
              {/if}

              <div class="flex items-center gap-3 px-3 -mt-6 relative z-10 w-full">
                <div class="relative flex-shrink-0">
                  <div class="absolute -inset-0.5 rounded-full blur-sm" style="background-color: {nameColor};"></div>
                  <img src={avatarUrl || 'https://placehold.co/80'} alt="Avatar" class="relative w-11 h-11 rounded-full border border-slate-950 object-cover" />
                </div>

                <div class="flex-1 pt-6 text-left">
                  <h4 class="font-extrabold text-[10px] truncate" style="color: {nameColor};">{vtuberName}</h4>
                  <p class="text-[8px] text-slate-300 line-clamp-1" style="color: {welcomeColor};">{welcomeText}</p>
                  
                  <!-- ไอคอนลิงก์โซเชียลขวามือด้านล่าง -->
                  <div class="flex gap-1 pt-1">
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

            <!-- ช่องเล่นตามลำดับ -->
            <div class="space-y-1">
              <span class="block text-[9px] text-slate-400 font-medium">{nicknameLabel}</span>
              <div class="w-full h-8 rounded-lg border" style="background-color: {inputBgColor}; border-color: {inputBorderColor};"></div>
            </div>

            <div class="space-y-1">
              <span class="block text-[9px] text-slate-400 font-medium">{messageLabel}</span>
              <div class="w-full h-10 rounded-lg border" style="background-color: {inputBgColor}; border-color: {inputBorderColor};"></div>
            </div>

            <div class="space-y-1">
              <span class="block text-[9px] text-slate-400 font-medium">{presetLabel}</span>
              <div class="grid grid-cols-4 gap-1">
                <div class="py-1 text-center font-bold text-[8px] rounded border" style="background-color: {presetBtnColor}; border-color: {presetBorderColor}; color: {nameColor};">{presetAmount1}฿</div>
                <div class="py-1 text-center font-bold text-[8px] rounded border" style="background-color: {presetBtnColor}; border-color: {presetBorderColor}; color: {nameColor};">{presetAmount2}฿</div>
                <div class="py-1 text-center font-bold text-[8px] rounded border" style="background-color: {presetBtnColor}; border-color: {presetBorderColor}; color: {nameColor};">{presetAmount3}฿</div>
                <div class="py-1 text-center font-bold text-[8px] rounded border" style="background-color: {presetBtnColor}; border-color: {presetBorderColor}; color: {nameColor};">{presetAmount4}฿</div>
              </div>
            </div>

            <div class="space-y-1">
              <span class="block text-[9px] text-slate-400 font-medium">{amountLabel}</span>
              <div class="w-full h-8 rounded-lg border" style="background-color: {inputBgColor}; border-color: {inputBorderColor};"></div>
            </div>

            <div class="pt-2">
              <div class="w-full h-9 rounded-xl flex items-center justify-center font-extrabold text-[9px] shadow" style="background-color: {submitBtnColor}; color: {submitBtnTextColor};">
                โดเนทสนับสนุน 💖
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  </main>
{/if}
