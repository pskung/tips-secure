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
        alert('บันทึกสำเร็จแล้วค่ะ! รอระบบคลาวด์สร้างเว็บใหม่ (จะเสร็จสิ้นและแสดงหน้าดีไซน์ใหม่บนหน้าจริงของคุณในเวลาประมาณ 45 วินาทีค่ะ)');
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

<main class="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-white">
  <form onsubmit={handleSave} class="w-full max-w-lg p-8 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
    <h1 class="text-xl font-bold text-pink-400">💅 แผงควบคุมและตกแต่งหน้าโดเนทของสตรีมเมอร์ (SvelteKit)</h1>
    
    <div>
      <label class="block text-sm mb-1" for="admin-pass">รหัสผ่านยืนยันสิทธิ์แอดมินเจ้าของช่อง</label>
      <input id="admin-pass" type="password" required class="w-full p-2 bg-slate-800 border border-slate-700 rounded text-white" bind:value={password} />
    </div>
    <div>
      <label class="block text-sm mb-1" for="vt-name">ชื่อสตรีมเมอร์ (VTuber Name)</label>
      <input id="vt-name" type="text" class="w-full p-2 bg-slate-800 border border-slate-700 rounded text-white" bind:value={vtuberName} />
    </div>
    <div>
      <label class="block text-sm mb-1" for="avatar-url">ลิงก์ภาพอวาตาร์ทรงกลม (Avatar URL)</label>
      <input id="avatar-url" type="text" class="w-full p-2 bg-slate-800 border border-slate-700 rounded text-white" bind:value={avatarUrl} />
    </div>
    <div>
      <label class="block text-sm mb-1" for="banner-url">ลิงก์ภาพพื้นหลังแบนเนอร์ (Banner URL)</label>
      <input id="banner-url" type="text" class="w-full p-2 bg-slate-800 border border-slate-700 rounded text-white" bind:value={bannerUrl} />
    </div>
    <div>
      <label class="block text-sm mb-1" for="color-picker">เลือกโทนสีประจำตัวของสตรีมเมอร์ (Theme Color)</label>
      <input id="color-picker" type="color" class="w-12 h-10 bg-transparent cursor-pointer" bind:value={themeColor} />
    </div>
    <div>
      <label class="block text-sm mb-1" for="welcome-msg">พิมพ์ข้อความทักทายผู้ชมในช่อง</label>
      <textarea id="welcome-msg" class="w-full p-2 bg-slate-800 border border-slate-700 rounded text-white" bind:value={welcomeText}></textarea>
    </div>

    <button type="submit" disabled={isSaving} class="w-full p-3 bg-pink-600 hover:bg-pink-700 font-bold rounded cursor-pointer transition-colors">
      {isSaving ? 'กำลังบันทึกและส่งข้อมูลดีไซน์ขึ้นสู่คลัง GitHub...' : 'บันทึกการตกแต่งและเปิดใช้งานทันที'}
    </button>
  </form>
</main>
