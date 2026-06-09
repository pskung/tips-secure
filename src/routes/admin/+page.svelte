<svelte:head>
  <title>Admin {theme.vtuberName}| Tips</title>
</svelte:head>
<script lang="ts">
  import theme from '$lib/config/theme.json';

  let password = $state('');
  let vtuberName = $state(theme.vtuberName);
  let avatarUrl = $state(theme.avatarUrl);
  let bannerUrl = $state(theme.bannerUrl);
  let themeColor = $state(theme.themeColor);
  let themeColorEnd = $state(theme.themeColorEnd || '#6366f1'); // สีกรณีไล่คู่สไลด์ปลายทาง
  let welcomeText = $state(theme.welcomeText);
  let isSaving = $state(false);

  // สกัดค่า preset 4 ปุ่มออกมาแก้ไขเป็นรายตัว
  let preset1 = $state(theme.presetAmounts[0] || 20);
  let preset2 = $state(theme.presetAmounts[1] || 50);
  let preset3 = $state(theme.presetAmounts[2] || 100);
  let preset4 = $state(theme.presetAmounts[3] || 500);

  const handleSave = async (e: Event) => {
    e.preventDefault();
    isSaving = true;

    try {
      const response = await fetch('/api/admin/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          config: { 
            vtuberName, 
            avatarUrl, 
            bannerUrl, 
            themeColor, 
            themeColorEnd, 
            welcomeText, 
            // รวมค่ากลับเป็นชุด Array ขนาด 4 ปุ่มพอดี
            presetAmounts: [Number(preset1), Number(preset2), Number(preset3), Number(preset4)] 
          }
        }),
      });

      const data = await response.json();
      if (response.ok) {
        alert('บันทึกสำเร็จเรียบร้อยแล้วค่ะ! รอระบบคลาวด์สร้างเว็บใหม่ (จะเสร็จสิ้นและแสดงผลจริงบนเว็บของท่านในอีกประมาณ 45 วินาทีนะคะ)');
      } else {
        alert(data.error || 'บันทึกการตกแต่งไม่สำเร็จชั่วคราวค่ะ');
      }
    } catch (err) {
      alert('ระบบเชื่อมโยงข้อมูลกับเครือข่ายขัดข้อง');
    } finally {
      isSaving = false;
    }
  };
</script>

<main class="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 md:p-8">
  <header class="max-w-7xl w-full mx-auto mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
    <div>
      <h1 class="text-3xl font-extrabold tracking-wide text-pink-400">💅 แผงควบคุมและแก้ไขธีมสีแบบไล่เฉด</h1>
      <p class="text-slate-400 text-sm mt-1">กำหนดคู่สีไล่เฉด (Gradient) และตัวเลขปุ่มยอดเงินสนับสนุน 4 ปุ่มอย่างลงตัวค่ะ</p>
    </div>
    <div class="flex items-center gap-2 self-start sm:self-center">
      <span class="flex h-3 w-3 relative">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
      </span>
      <span class="text-xs font-semibold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">ระบบพร้อมทำงาน</span>
    </div>
  </header>

  <div class="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
    
    <!-- ⚙️ คอลัมน์ที่ 1: ส่วนควบคุมปรับแต่ง (สัดส่วน 7 จาก 12) -->
    <div class="lg:col-span-7 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 md:p-8 backdrop-blur-md shadow-xl">
      <form onsubmit={handleSave} class="space-y-6">
        <h2 class="text-lg font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800/80 pb-3">
          <svg class="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
          ข้อมูลดีไซน์และการจัดวางคู่สี
        </h2>

        <!-- 🔐 รหัสผ่านแอดมิน -->
        <div class="space-y-1.5">
          <label class="block text-sm font-semibold text-slate-300" for="admin-pass">รหัสผ่านแอดมินยืนยันสิทธิ์เพื่อความปลอดภัย (ADMIN_PASSWORD)</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg></span>
            <input id="admin-pass" type="password" required placeholder="กรอกรหัสยืนยันเพื่อบันทึกข้อมูล" class="w-full pl-11 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-transparent" bind:value={password} />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- 👤 ชื่อสตรีมเมอร์ -->
          <div class="space-y-1.5">
            <label class="block text-sm font-semibold text-slate-300" for="vt-name">ชื่อสตรีมเมอร์ (VTuber Name)</label>
            <input id="vt-name" type="text" class="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50" bind:value={vtuberName} />
          </div>

          <!-- 🎨 เลือกสัดส่วนคู่สีไล่ระดับ Gradient -->
          <div class="space-y-1.5">
            <label class="block text-sm font-semibold text-slate-300" for="color-picker-start">ตั้งค่าคู่สีไล่เฉด (Gradient Colors)</label>
            <div class="flex items-center gap-2">
              <div class="flex flex-col items-center">
                <input id="color-picker-start" type="color" class="w-12 h-10 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer p-0.5" bind:value={themeColor} />
                <span class="text-[10px] text-slate-400 font-mono mt-1">สีเริ่มต้น</span>
              </div>
              <div class="text-slate-500 font-bold">➔</div>
              <div class="flex flex-col items-center">
                <input id="color-picker-end" type="color" class="w-12 h-10 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer p-0.5" bind:value={themeColorEnd} />
                <span class="text-[10px] text-slate-400 font-mono mt-1">สีปลายทาง</span>
              </div>
              <!-- แสดงผลแถบไล่เฉดสีสมบูรณ์ให้เห็น -->
              <div class="h-10 flex-1 rounded-xl border border-slate-800 ml-1" style="background: linear-gradient(90deg, {themeColor}, {themeColorEnd});"></div>
            </div>
          </div>
        </div>

        <!-- 💰 แก้ไขค่าเงิน Preset 4 ปุ่มหลัก -->
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-slate-300" for="preset-1">กำหนดตัวเลขปุ่มสนับสนุนด่วน (ระบุจำนวน 4 ยอดพอดี)</label>
          <div class="grid grid-cols-4 gap-3">
            <div>
              <span class="text-[11px] text-slate-400 block mb-1">ปุ่มที่ 1 (บาท)</span>
              <input id="preset-1" type="number" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-center font-bold" bind:value={preset1} />
            </div>
            <div>
              <span class="text-[11px] text-slate-400 block mb-1">ปุ่มที่ 2 (บาท)</span>
              <input id="preset-2" type="number" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-center font-bold" bind:value={preset2} />
            </div>
            <div>
              <span class="text-[11px] text-slate-400 block mb-1">ปุ่มที่ 3 (บาท)</span>
              <input id="preset-3" type="number" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-center font-bold" bind:value={preset3} />
            </div>
            <div>
              <span class="text-[11px] text-slate-400 block mb-1">ปุ่มที่ 4 (บาท)</span>
              <input id="preset-4" type="number" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-center font-bold" bind:value={preset4} />
            </div>
          </div>
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm font-semibold text-slate-300" for="avatar-url">ลิงก์รูปโปรไฟล์อวาตาร์ทรงกลม (Avatar URL)</label>
          <input id="avatar-url" type="text" placeholder="https://..." class="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2" bind:value={avatarUrl} />
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm font-semibold text-slate-300" for="banner-url">ลิงก์ภาพพื้นหลังแบนเนอร์ใหญ่ (Banner URL - ตัวเลือก)</label>
          <input id="banner-url" type="text" placeholder="ปล่อยว่างไว้ได้หากต้องการใช้พื้นหลัง Glow ไล่เฉดของระบบค่ะ" class="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2" bind:value={bannerUrl} />
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm font-semibold text-slate-300" for="welcome-msg">คำทักทายผู้ชมและรายละเอียดโดเนท</label>
          <textarea id="welcome-msg" placeholder="คำทักทายข้างล่างชื่อช่องสตรีมเมอร์" class="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2" rows="3" bind:value={welcomeText}></textarea>
        </div>

        <button 
          type="submit" 
          disabled={isSaving} 
          class="w-full py-4 text-white font-extrabold rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] shadow-lg"
          style="background: linear-gradient(135deg, {themeColor}, {themeColorEnd}); box-shadow: 0 8px 24px rgba(219, 39, 119, 0.2);"
        >
          {#if isSaving}
            <span class="flex items-center justify-center gap-2">
              <svg class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              กำลังส่งข้อมูลดีไซน์เฉดสีคู่ขึ้น GitHub...
            </span>
          {:else}
            บันทึกการตกแต่งสีสันและยอดเงิน ✨
          {/if}
        </button>
      </form>
    </div>

    <!-- 📺 คอลัมน์ที่ 2: หน้าต่างจำลองแสดงผลสด (Live Preview Mockup) -->
    <div class="lg:col-span-5 flex flex-col space-y-4">
      <h2 class="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
        <svg class="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
        แสดงผลจำลองทันทีตามคู่สีจริง (Real-time Preview)
      </h2>

      <div 
        class="w-full aspect-[9/14] lg:aspect-[9/13] rounded-3xl border border-slate-800 bg-cover bg-center relative overflow-y-auto shadow-2xl transition-all duration-500 select-none pointer-events-none"
        style="background-image: {bannerUrl ? `url(${bannerUrl})` : 'none'}; background-color: #0b0f19;"
      >
        <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px]"></div>

        <div class="relative p-6 flex flex-col items-center justify-start h-full text-center space-y-6">
          <div class="relative mt-8">
            <!-- ขอบเรืองแสงไล่เฉดสีจำลองตามดีไซน์ล่าสุด -->
            <div class="absolute -inset-0.5 rounded-full blur-sm" style="background: linear-gradient(90deg, {themeColor}, {themeColorEnd});"></div>
            <img 
              src={avatarUrl || 'https://placehold.co/100'} 
              alt="Avatar Preview" 
              class="relative w-20 h-20 rounded-full border-2 border-slate-900 object-cover" 
            />
          </div>

          <div class="space-y-1">
            <h3 class="text-xl font-extrabold" style="background: linear-gradient(135deg, {themeColor}, {themeColorEnd}); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">{vtuberName || 'ชื่อสตรีมเมอร์'}</h3>
            <p class="text-xs text-slate-300 max-w-xs leading-relaxed line-clamp-3">{welcomeText || 'คำต้อนรับผู้ชมของคุณ...'}</p>
          </div>

          <div class="w-full bg-slate-900/60 border border-slate-800/80 backdrop-blur-md rounded-2xl p-4 text-left space-y-4">
            <div class="space-y-1">
              <div class="w-24 h-3 bg-slate-800 rounded-full"></div>
              <div class="w-full h-8 bg-slate-950/80 border border-slate-800 rounded-lg"></div>
            </div>

            <!-- แสดงยอดเงิน 4 ปุ่มแบบสมมาตรพอดีกับช่องตารางด้านล่าง -->
            <div class="grid grid-cols-4 gap-1.5">
              {#each [preset1, preset2, preset3, preset4] as amt}
                <div class="py-1.5 text-center text-[10px] font-bold bg-slate-950/60 rounded-lg border" style="color: {themeColor}; border-color: {themeColor}aa;">
                  {amt || 0}฿
                </div>
              {/each}
            </div>

            <div class="w-full h-10 rounded-lg transition-all" style="background: linear-gradient(135deg, {themeColor}, {themeColorEnd});"></div>
          </div>
        </div>
      </div>
    </div>

  </div>
</main>
