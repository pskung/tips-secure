<script lang="ts">
  import theme from '$lib/config/theme.json';

  let password = $state('');
  let vtuberName = $state(theme.vtuberName);
  let avatarUrl = $state(theme.avatarUrl);
  let bannerUrl = $state(theme.bannerUrl);
  let themeColor = $state(theme.themeColor);
  let welcomeText = $state(theme.welcomeText);
  let isSaving = $state(false);

  const handleSave = async (e: Event) => {
    e.preventDefault();
    isSaving = true;

    try {
      const response = await fetch('/api/admin/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          config: { vtuberName, avatarUrl, bannerUrl, themeColor, welcomeText, presetAmounts: theme.presetAmounts }
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
  <!-- 🌟 หัวข้อแดชบอร์ดหลัก -->
  <header class="max-w-7xl w-full mx-auto mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
    <div>
      <h1 class="text-3xl font-extrabold tracking-wide text-pink-400">💅 แผงตกแต่งสตรีมเมอร์</h1>
      <p class="text-slate-400 text-sm mt-1">ออกแบบหน้าต่างการโดเนทของคุณให้เข้ากับแบรนด์ได้อย่างสวยงามฟรีแบบไร้ขีดจำกัดค่ะ</p>
    </div>
    <div class="flex items-center gap-2 self-start sm:self-center">
      <span class="flex h-3 w-3 relative">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
      </span>
      <span class="text-xs font-semibold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">เชื่อมระบบคลาวด์แล้ว</span>
    </div>
  </header>

  <!-- 📦 ตารางแบ่ง 2 คอลัมน์ (ควบคุมฝั่งซ้าย - หน้าจำลองสดฝั่งขวา) -->
  <div class="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
    
    <!-- ⚙️ คอลัมน์ที่ 1: ส่วนควบคุมปรับแต่ง (สัดส่วน 7 จาก 12) -->
    <div class="lg:col-span-7 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 md:p-8 backdrop-blur-md shadow-xl">
      <form onsubmit={handleSave} class="space-y-6">
        <h2 class="text-lg font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800/80 pb-3">
          <svg class="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
          การตั้งค่ารูปลักษณ์และข้อมูลช่อง
        </h2>

        <!-- 🔐 ป้องกันรหัสผ่านแอดมิน -->
        <div class="space-y-1.5">
          <label class="block text-sm font-semibold text-slate-300" for="admin-pass">รหัสผ่านยืนยันสิทธิ์ผู้ดูแลระบบ (ADMIN_PASSWORD)</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg></span>
            <input id="admin-pass" type="password" required placeholder="กรอกรหัสยืนยันเพื่อบันทึกข้อมูล" class="w-full pl-11 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-transparent" bind:value={password} />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- 👤 ชื่อสตรีมเมอร์ -->
          <div class="space-y-1.5">
            <label class="block text-sm font-semibold text-slate-300" for="vt-name">ชื่อสตรีมเมอร์ (VTuber Name)</label>
            <input id="vt-name" type="text" placeholder="ระบุชื่อประจำช่องสตรีม" class="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50" bind:value={vtuberName} />
          </div>

          <!-- 🎨 เลือกโทนสีหลักของช่อง -->
          <div class="space-y-1.5">
            <label class="block text-sm font-semibold text-slate-300" for="color-picker">เลือกโทนสีประจำตัว (Theme Color)</label>
            <div class="flex items-center gap-3">
              <input id="color-picker" type="color" class="w-14 h-11 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer p-1" bind:value={themeColor} />
              <span class="text-xs font-mono font-bold uppercase text-slate-400 bg-slate-950/80 px-3 py-2.5 rounded-xl border border-slate-800">{themeColor}</span>
            </div>
          </div>
        </div>

        <!-- 🔗 ลิงก์อวาตาร์ -->
        <div class="space-y-1.5">
          <label class="block text-sm font-semibold text-slate-300" for="avatar-url">ลิงก์รูปโปรไฟล์อวาตาร์ทรงกลม (Avatar URL)</label>
          <input id="avatar-url" type="text" placeholder="https://..." class="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-pink-500/50" bind:value={avatarUrl} />
        </div>

        <!-- 🔗 ลิงก์แบนเนอร์พื้นหลัง -->
        <div class="space-y-1.5">
          <label class="block text-sm font-semibold text-slate-300" for="banner-url">ลิงก์ภาพพื้นหลังแบนเนอร์ใหญ่ (Banner URL - ตัวเลือก)</label>
          <input id="banner-url" type="text" placeholder="หากไม่ใส่จะแสดงเป็นพื้นหลังแบบ Glow อัตโนมัติค่ะ" class="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-pink-500/50" bind:value={bannerUrl} />
        </div>

        <!-- ✉️ ข้อความต้อนรับ -->
        <div class="space-y-1.5">
          <label class="block text-sm font-semibold text-slate-300" for="welcome-msg">คำทักทายผู้ชมและรายละเอียดโดเนท</label>
          <textarea id="welcome-msg" placeholder="ข้อความต้อนรับที่จะขึ้นแสดงใต้ชื่อของคุณ" class="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-pink-500/50" rows="3" bind:value={welcomeText}></textarea>
        </div>

        <button 
          type="submit" 
          disabled={isSaving} 
          class="w-full py-4 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-extrabold rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-pink-600/20"
        >
          {#if isSaving}
            <span class="flex items-center justify-center gap-2">
              <svg class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              กำลังส่งข้อมูลตกแต่งขึ้นคลัง GitHub...
            </span>
          {:else}
            บันทึกการตกแต่งและเปิดใช้งานทันที ✨
          {/if}
        </button>
      </form>
    </div>

    <!-- 📺 คอลัมน์ที่ 2: หน้าต่างจำลองแสดงผลสด (Live Preview Mockup - สัดส่วน 5 จาก 12) -->
    <div class="lg:col-span-5 flex flex-col space-y-4">
      <h2 class="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
        <svg class="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
        กล่องจำลองแสดงผลเรียลไทม์ (Live Preview)
      </h2>

      <!-- 📱 กรอบจำลองหน้าจอโทรศัพท์/แท็บเล็ต -->
      <div 
        class="w-full aspect-[9/14] lg:aspect-[9/13] rounded-3xl border border-slate-800 bg-cover bg-center relative overflow-y-auto shadow-2xl transition-all duration-500 select-none pointer-events-none"
        style="background-image: {bannerUrl ? `url(${bannerUrl})` : 'none'}; background-color: #0b0f19;"
      >
        <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px]"></div>

        <!-- 🌟 โครงจำลองภายในแบบเรียบหรู -->
        <div class="relative p-6 flex flex-col items-center justify-start h-full text-center space-y-6">
          <div class="relative mt-8">
            <div class="absolute -inset-0.5 rounded-full blur-sm" style="background: linear-gradient(90deg, {themeColor}, #6366f1, {themeColor});"></div>
            <img 
              src={avatarUrl || 'https://placehold.co/100'} 
              alt="Avatar Preview" 
              class="relative w-20 h-20 rounded-full border-2 border-slate-900 object-cover" 
            />
          </div>

          <div class="space-y-1">
            <h3 class="text-xl font-extrabold" style="color: {themeColor};">{vtuberName || 'ชื่อสตรีมเมอร์ของคุณ'}</h3>
            <p class="text-xs text-slate-300 max-w-xs leading-relaxed line-clamp-3">{welcomeText || 'ยินดีต้อนรับผู้ชมเข้าสู่หน้าโอนเงินสนับสนุนค่ะ...'}</p>
          </div>

          <!-- 💳 กล่องกรอกข้อมูลสมมติ -->
          <div class="w-full bg-slate-900/60 border border-slate-800/80 backdrop-blur-md rounded-2xl p-4 text-left space-y-4">
            <div class="space-y-1">
              <div class="w-24 h-3 bg-slate-800 rounded-full"></div>
              <div class="w-full h-8 bg-slate-950/80 border border-slate-800 rounded-lg"></div>
            </div>

            <!-- ปุ่มเงินสมมติที่มีสีไฮไลต์ตาม Theme Color -->
            <div class="grid grid-cols-4 gap-1.5">
              {#each [20, 50, 100, 500] as amt}
                <div class="py-1.5 text-center text-xs font-bold bg-slate-950/60 rounded-lg border border-slate-800" style="color: {themeColor}; border-color: {themeColor};">
                  {amt}฿
                </div>
              {/each}
            </div>

            <div class="w-full h-10 rounded-lg transition-all" style="background: linear-gradient(135deg, {themeColor}, #6366f1);"></div>
          </div>
        </div>
      </div>
    </div>

  </div>
</main>
