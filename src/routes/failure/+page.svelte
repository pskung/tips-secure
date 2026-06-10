<script lang="ts">
  import theme from '$lib/config/theme.json';

  const failureTitle = theme.failureTitle ?? 'ทำรายการไม่สำเร็จ';
  const failureTitleColor = theme.failureTitleColor ?? '#ef4444';
  const failureTitleFontFamily = theme.failureTitleFontFamily ?? 'Mitr';

  const failureMessage = theme.failureMessage ?? 'รายการชำระเงินถูกยกเลิก หรือหมดอายุการสแกน QR Code ค่ะ';
  const failureMessageColor = theme.failureMessageColor ?? '#cbd5e1';
  const failureMessageFontFamily = theme.failureMessageFontFamily ?? 'Mitr';

  const failureEmoji = theme.failureEmoji ?? '❌';
  const failureBtnText = theme.failureBtnText ?? 'กลับหน้าหลัก/ลองอีกครั้ง';
  const failureBtnColor = theme.failureBtnColor ?? '#ef4444';
  const failureBtnTextColor = theme.failureBtnTextColor ?? '#ffffff';

  const hexToRgba = (hex: string, opacity: number): string => {
    if (!hex) return `rgba(15, 23, 42, ${opacity})`;
    const cleanHex = hex.replace('#', '');
    if (cleanHex.length !== 6) return hex;
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  const uniqueFonts = [
    ...new Set([
      failureTitleFontFamily,
      failureMessageFontFamily,
      theme.submitBtnFontFamily
    ].filter(f => f && f.trim() !== '' && f.toLowerCase() !== 'sans-serif'))
  ];
</script>

<svelte:head>
  <title>การสนับสนุนไม่สำเร็จ 🔴</title>
  {#each uniqueFonts as font}
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family={font.trim().replace(/\s+/g, '+')}:wght@400;500;700&display=swap" />
  {/each}
</svelte:head>

<main 
  class="flex min-h-screen flex-col items-center justify-center p-4 bg-cover bg-center bg-no-repeat relative transition-all duration-700"
  style="
    background-image: {theme.bgType === 'image' && theme.bgUrl ? `url(${theme.bgUrl})` : 'none'}; 
    background-color: {theme.bgType === 'solid' ? theme.bgColor : '#0b0f19'};
  "
>
  <div class="absolute inset-0 bg-slate-950/70 backdrop-blur-[4px] -z-10"></div>

  <div 
    class="w-full max-w-md p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border text-center space-y-6 relative overflow-hidden"
    style="
      background-color: {hexToRgba(theme.cardBgColor, theme.cardOpacity)};
      border-color: {hexToRgba(theme.cardBorderColor, theme.cardBorderOpacity)};
      backdrop-filter: blur({theme.cardBlur}px);
    "
  >
    <div class="text-6xl sm:text-7xl animate-pulse drop-shadow-[0_10px_15px_rgba(0,0,0,0.3)]">{failureEmoji}</div>

    <h1 class="text-xl sm:text-2xl font-black tracking-wide" style="color: {failureTitleColor}; font-family: '{failureTitleFontFamily}', sans-serif;">
      {failureTitle}
    </h1>

    <p class="text-xs sm:text-sm font-medium leading-relaxed" style="color: {failureMessageColor}; font-family: '{failureMessageFontFamily}', sans-serif;">
      {failureMessage}
    </p>

    <div class="pt-4">
      <a 
        href="/"
        class="inline-block w-full py-4 rounded-xl text-sm sm:text-base font-extrabold cursor-pointer transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg text-center uppercase"
        style="
          background-color: {failureBtnColor};
          color: {failureBtnTextColor};
          font-family: '{theme.submitBtnFontFamily}', sans-serif;
          box-shadow: 0 8px 24px rgba(0,0,0,0.25);
        "
      >
        {failureBtnText}
      </a>
    </div>
  </div>
</main>
