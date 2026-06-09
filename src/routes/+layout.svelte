<script lang="ts">
  // 🇹🇭 ได้รับ props และนำเสนอบล็อกข้อมูลโดยสอดคล้องตามมาตรฐานหลักของ Svelte 5
  let { children } = $props();
</script>

{@render children()}
