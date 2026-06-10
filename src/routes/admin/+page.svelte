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
  let welcomeText = $state(theme.welcomeText);
  let isSaving = $state(false);

  // ตั้งค่าฟอนต์และพื้นหลัง
  let bgType = $state(theme.bgType || 'solid');
  let bgColor = $state(theme.bgColor || '#0b0f19');
  let bgUrl = $state(theme.bgUrl || '');
  let fontUrl = $state(theme.fontUrl || '');

  // โซเชียลมีเดีย
  let socialLinks = $state(theme.socialLinks || [
    { platform: 'youtube', url: '' },
    { platform: 'twitch', url: '' },
    { platform: 'tiktok', url: '' },
    { platform: 'twitter', url: '' },
    { platform: 'facebook', url: '' },
    { platform: 'discord', url: '' },
    { platform: 'instagram', url: '' }
  ]);

  // เลรย์เอาต์แบบยืดหยุ่นที่ลากวางได้
  let layout = $state(theme.layout || [
    { id: 'profile', width: 'large', padding: 'medium' },
    { id: 'nickname', width: 'large', padding: 'medium' },
    { id: 'message', width: 'large', padding: 'medium' },
    { id: 'presets', width: 'large', padding: 'medium' },
    { id: 'amount', width: 'large', padding: 'medium' },
    { id: 'socials', width: 'large', padding: 'medium' },
    { id: 'submit', width: 'large', padding: 'medium' }
  ]);

  // แมปปิ้งแปลชื่อไทยให้คนจัดง่าย
  const blockNames: Record<string, string> = {
    profile: '👑 บล็อกโปรไฟล์ (รูปภาพ + ชื่อช่อง)',
    nickname: '👤 ช่องกรอกชื่อเล่น (Nickname)',
    message: '✉️ ช่องกรอกข้อความอวยพร (Message)',
    presets: '🌸 ปุ่มเลือกยอดเงินสนับสนุนด่วน',
    amount: '💰 ช่องกรอกระบุจำนวนเงินเอง',
    socials: '🌐 แถบลิงก์โซเชียลมีเดียต่างๆ',
    submit: '💖 ปุ่มกดส่งเงินเพื่อโดเนท'
  };

  // 🛡️ ระบบ Drag & Drop เชิงตอบสนองของ Svelte 5
  let draggedIndex = $state<number | null>(null);

  function handleDragStart(index: number) {
    draggedIndex = index;
  }

  function handleDragOver(e: DragEvent, index: number) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const temp = [...layout];
    const [draggedItem] = temp.splice(draggedIndex, 1);
    temp.splice(index, 0, draggedItem);
    layout = temp;
    draggedIndex = index;
  }

  function handleDragEnd() {
    draggedIndex = null;
  }

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
            vtuberName, avatarUrl, bannerUrl, themeColor, welcomeText,
            presetAmounts: theme.presetAmounts,
            bgType, bgColor, bgUrl, fontUrl, socialLinks, layout
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

<main class="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 md:p-8">
  <header class="max-w-7xl w-full mx-auto mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
    <div>
      <h1 class="text-3xl font-extrabold tracking-wide text-pink-400">💅 แผงตกแต่งเลย์เอาต์เสรี</h1>
      <p class="text-slate-400 text-sm mt-1">ลากสลับบล็อก ย่อขยายสัดส่วน ป้อน Google Fonts และเปิดไอคอนโซเชียลตามต้องการได้เลยนะคะ</p>
    </div>
  </header>

  <div class="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
    
    <!-- ⚙️ คอลัมน์ที่ 1: ส่วนควบคุมปรับแต่ง (สัดส่วน 7 จาก 12) -->
    <div class="lg:col-span-7 space-y-6">
      
      <!-- ฟอร์มส่งบันทึกหลัก -->
      <form onsubmit={handleSave} class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 md:p-8 backdrop-blur-md shadow-xl space-y-6">
        
        <div class="space-y-1.5">
          <label class="block text-sm font-semibold text-slate-300" for="admin-pass">รหัสผ่านแอดมินเพื่อเซฟข้อมูล (ADMIN_PASSWORD)</label>
          <input id="admin-pass" type="password" required placeholder="กรอกรหัสผ่านเพื่อยืนยัน" class="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-pink-500/50 focus:outline-none" bind:value={password} />
        </div>

        <!-- ⠿ แผงลากวางเลย์เอาต์ยืดหยุ่น (Drag-and-Drop) -->
        <div class="space-y-3">
          <h3 class="text-md font-bold text-slate-200 border-b border-slate-800 pb-2">👉 1. จัดตำแหน่ง เลื่อนสลับตำแหน่ง และย่อขยายบล็อก</h3>
          <p class="text-xs text-slate-400">กดค้างที่แถบสลัก ⠿ แล้วลากเลื่อนเพื่อสลับบล็อกขึ้นลงได้ทันทีค่ะ พร้อมปรับความกว้างและความสูงตามต้องการ:</p>
          
          <div class="space-y-2.5">
            {#each layout as item, index}
              <div 
                draggable="true"
                ondragstart={() => handleDragStart(index)}
                ondragover={(e) => handleDragOver(e, index)}
                ondragend={handleDragEnd}
                class="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-xl gap-3 cursor-move hover:border-pink-500/30 transition-all duration-150 {draggedIndex === index ? 'opacity-40 border-pink-500 border-dashed' : ''}"
              >
                <div class="flex items-center gap-3">
                  <span class="text-slate-500 font-extrabold text-lg select-none">⠿</span>
                  <span class="text-sm font-bold text-slate-300">{blockNames[item.id]}</span>
                </div>
                
                <div class="flex items-center gap-2 self-end sm:self-center">
                  <!-- ปรับแต่งความกว้าง (Width) -->
                  <div class="flex items-center gap-1 bg-slate-900 border border-slate-800/60 rounded-lg px-2 py-1">
                    <span class="text-[10px] text-slate-500 font-semibold uppercase">กว้าง</span>
                    <select class="bg-transparent text-xs text-slate-200 border-none outline-none cursor-pointer" bind:value={item.width}>
                      <option value="small" class="bg-slate-950">เล็ก (1/3)</option>
                      <option value="medium" class="bg-slate-950">กลาง (1/2)</option>
                      <option value="large" class="bg-slate-950">ใหญ่ (เต็ม)</option>
                    </select>
                  </div>
                  <!-- ปรับแต่งความสูง/เว้นช่อง (Padding) -->
                  <div class="flex items-center gap-1 bg-slate-900 border border-slate-800/60 rounded-lg px-2 py-1">
                    <span class="text-[10px] text-slate-500 font-semibold uppercase">เว้นระยะ</span>
                    <select class="bg-transparent text-xs text-slate-200 border-none outline-none cursor-pointer" bind:value={item.padding}>
                      <option value="small" class="bg-slate-950">แคบ</option>
                      <option value="medium" class="bg-slate-950">ปกติ</option>
                      <option value="large" class="bg-slate-950">กว้าง</option>
                    </select>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>

        <!-- 🎨 การจัดการสีคู่เดี่ยว ฟอนต์ และภาพแบนเนอร์/อวาตาร์ -->
        <div class="space-y-4 pt-4 border-t border-slate-800">
          <h3 class="text-md font-bold text-slate-200">👉 2. รายละเอียดตกแต่งพื้นหลัง สีฟอนต์ และแบรนดิ้ง</h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="block text-sm font-semibold text-slate-300" for="vt-name">ชื่อสตรีมเมอร์ (VTuber Name)</label>
              <input id="vt-name" type="text" class="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50" bind:value={vtuberName} />
            </div>

            <!-- สีเด่นปุ่มสนับสนุน (เดี่ยวทั้งหมด) -->
            <div class="space-y-1.5">
              <label class="block text-sm font-semibold text-slate-300" for="theme-color">สีปุ่มและไอคอนเด่น (Theme Color)</label>
              <div class="flex items-center gap-2">
                <input id="theme-color" type="color" class="w-14 h-11 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer p-1" bind:value={themeColor} />
                <span class="text-xs font-mono font-bold uppercase text-slate-400 bg-slate-950/80 px-3 py-2.5 rounded-xl border border-slate-800">{themeColor}</span>
              </div>
            </div>
          </div>

          <!-- จัดการระบบพื้นหลังเว็บโดเนท -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl">
            <div class="space-y-1.5">
              <span class="block text-sm font-semibold text-slate-300">ประเภทพื้นหลังหลัก</span>
              <div class="flex flex-col gap-2">
                <label class="inline-flex items-center gap-2 cursor-pointer text-xs"><input type="radio" value="solid" bind:group={bgType} /> สีเดี่ยว (Solid Color)</label>
                <label class="inline-flex items-center gap-2 cursor-pointer text-xs"><input type="radio" value="image" bind:group={bgType} /> ภาพพื้นหลัง (Background Image)</label>
              </div>
            </div>

            <div class="space-y-1.5 col-span-2">
              {#if bgType === 'solid'}
                <label class="block text-sm font-semibold text-slate-300" for="bg-color">เลือกสีพื้นหลังเดี่ยว</label>
                <div class="flex items-center gap-2">
                  <input id="bg-color" type="color" class="w-12 h-10 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer p-1" bind:value={bgColor} />
                  <span class="text-xs font-mono text-slate-300 bg-slate-950 px-2 py-2.5 rounded-lg border border-slate-800">{bgColor}</span>
                </div>
              {:else}
                <label class="block text-sm font-semibold text-slate-300" for="bg-url">ระบุ URL ภาพพื้นหลังใหญ่</label>
                <input id="bg-url" type="text" placeholder="https://..." class="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs" bind:value={bgUrl} />
              {/if}
            </div>
          </div>

          <!-- ผูกคัดลอกฟอนต์ Google Fonts -->
          <div class="space-y-1.5">
            <label class="block text-sm font-semibold text-slate-300" for="font-url">ระบุ URL นำเข้าฟอนต์ Google Fonts (Import CSS URL)</label>
            <input id="font-url" type="text" placeholder="https://fonts.googleapis.com/css2?family=Mitr..." class="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-pink-500/50" bind:value={fontUrl} />
            <span class="text-[10px] text-slate-500 block leading-normal">วาง URL แผ่นสไตล์ที่ต้องการจากกูเกิลฟอนต์ ระบบจะคัดแยกฟอนต์ไปสวมใส่ให้เองอัตโนมัติค่ะ</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="block text-sm font-semibold text-slate-300" for="avatar-url">ลิงก์ภาพอวาตาร์ (Avatar URL)</label>
              <input id="avatar-url" type="text" class="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs" bind:value={avatarUrl} />
            </div>
            <div class="space-y-1.5">
              <label class="block text-sm font-semibold text-slate-300" for="banner-url">ลิงก์ภาพแบนเนอร์กล่อง (หากไม่ใส่จะเป็นขอบสีใส)</label>
              <input id="banner-url" type="text" placeholder="ปล่อยว่างไว้เพื่อโชว์สีใสสะอาดตาค่ะ" class="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs" bind:value={bannerUrl} />
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="block text-sm font-semibold text-slate-300" for="welcome-text">คำทักทายต้อนรับผู้ชมในช่อง</label>
            <textarea id="welcome-text" class="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs" rows="2" bind:value={welcomeText}></textarea>
          </div>
        </div>

        <!-- 🌐 กำหนดลิงก์โซเชียลมีเดียของสตรีมเมอร์ -->
        <div class="space-y-4 pt-4 border-t border-slate-800">
          <h3 class="text-md font-bold text-slate-200">👉 3. เชื่อมโยงบัญชี Social Media ต่างๆ</h3>
          <p class="text-xs text-slate-400">ระบุลิงก์โซเชียลของคุณเพื่อแสดงเป็นไอคอนค่ายที่กล่องโดเนทหลัก (ปล่อยว่างหากยังไม่มีค่ะ):</p>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {#each socialLinks as link}
              <div class="flex items-center gap-2 bg-slate-950/70 p-2.5 border border-slate-800 rounded-xl">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-400 w-20">{link.platform}</span>
                <input type="text" placeholder="ลิงก์บัญชีของคุณ" class="flex-1 bg-transparent border-b border-slate-800 py-1 text-xs text-white focus:outline-none focus:border-pink-500" bind:value={link.url} />
              </div>
            {/each}
          </div>
        </div>

        <button type="submit" disabled={isSaving} class="w-full py-4 text-white font-extrabold rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] shadow-lg" style="background: {themeColor}; box-shadow: 0 8px 24px rgba(0,0,0,0.3);">
          {#if isSaving}
            กำลังเซฟการตั้งค่าเลย์เอาต์เสรีขึ้นคลัง GitHub...
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
        แสดงจำลองตัวอย่างสดตามสัดส่วนย่อขยาย
      </h2>

      <!-- หน้าต่างมือถือจำลอง -->
      <div 
        class="w-full aspect-[9/13] rounded-3xl border border-slate-800 bg-cover bg-center relative overflow-y-auto shadow-2xl select-none pointer-events-none p-4"
        style="
          background-image: {bgType === 'image' && bgUrl ? `url(${bgUrl})` : 'none'}; 
          background-color: {bgType === 'solid' ? bgColor : '#0b0f19'};
        "
      >
        <div class="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px]"></div>

        <div class="relative w-full max-w-sm mx-auto bg-slate-900/60 rounded-3xl border border-slate-800/80 backdrop-blur-md p-4 grid grid-cols-12 gap-2 mt-4 text-xs text-white">
          
          {#each layout as block}
            {#if block.id === 'profile'}
              <div class="col-span-12 flex flex-col items-center text-center py-2 relative w-full">
                {#if bannerUrl}
                  <div class="absolute top-0 left-0 right-0 h-10 bg-cover bg-center rounded-t-xl -z-10 opacity-30" style="background-image: url({bannerUrl});"></div>
                {/if}
                <div class="relative mt-1">
                  <div class="absolute -inset-0.5 rounded-full blur-sm" style="background-color: {themeColor};"></div>
                  <img src={avatarUrl || 'https://placehold.co/80'} alt="avatar" class="relative w-12 h-12 rounded-full border-2 border-slate-900 object-cover" />
                </div>
                <h4 class="font-extrabold mt-1" style="color: {themeColor};">{vtuberName || 'ชื่อสตรีมเมอร์'}</h4>
                <p class="text-[10px] text-slate-400 line-clamp-1">{welcomeText || 'คำต้อนรับ...'}</p>
              </div>

            {:else if block.id === 'nickname'}
              <div class="col-span-12 py-1 space-y-1">
                <span class="block text-[10px] text-slate-400">ช่องกรอกชื่อผู้โอน (จำลอง)</span>
                <div class="w-full h-8 bg-slate-950/80 border border-slate-800 rounded-lg"></div>
              </div>

            {:else if block.id === 'message'}
              <div class="col-span-12 py-1 space-y-1">
                <span class="block text-[10px] text-slate-400">ช่องกรอกความอวยพร (จำลอง)</span>
                <div class="w-full h-12 bg-slate-950/80 border border-slate-800 rounded-lg"></div>
              </div>

            {:else if block.id === 'presets'}
              <div class="col-span-12 py-1 space-y-1">
                <span class="block text-[10px] text-slate-400">ปุ่มเลือกราคาด่วน (จำลอง)</span>
                <div class="grid grid-cols-4 gap-1">
                  {#each theme.presetAmounts.slice(0, 4) as amt}
                    <div class="py-1 text-center font-bold text-[9px] bg-slate-950 border border-slate-800 rounded-lg" style="color: {themeColor}; border-color: {themeColor}55;">{amt}฿</div>
                  {/each}
                </div>
              </div>

            {:else if block.id === 'amount'}
              <div class="col-span-12 py-1 space-y-1">
                <span class="block text-[10px] text-slate-400">ช่องระบุจำนวนเงินเอง (จำลอง)</span>
                <div class="w-full h-8 bg-slate-950/80 border border-slate-800 rounded-lg"></div>
              </div>

            {:else if block.id === 'socials'}
              <div class="col-span-12 py-2 flex justify-center gap-2">
                {#each socialLinks as link}
                  {#if link.url}
                    <div class="w-6 h-6 rounded-full bg-slate-950/80 border border-slate-800 flex items-center justify-center text-[8px] font-bold" style="color: {themeColor};">{link.platform.substring(0,2)}</div>
                  {/if}
                {/each}
              </div>

            {:else if block.id === 'submit'}
              <div class="col-span-12 py-1">
                <div class="w-full h-9 rounded-xl flex items-center justify-center font-extrabold text-[10px]" style="background-color: {themeColor};">โดเนทสนับสนุน 💖</div>
              </div>
            {/if}
          {/each}

        </div>
      </div>
    </div>

  </div>
</main>
  </div>
</main>
