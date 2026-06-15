import { MetaProvider } from "@solidjs/meta";
import { Router, RouteSectionProps } from "@solidjs/router"; // 🟢 นำเข้าประเภทข้อมูลที่ถูกต้อง
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import "./app.css";

export default function App() {
  return (
    <Router
      root={(props: RouteSectionProps) => ( // 🟢 ใส่ Type ให้ตัวแปร props
        <MetaProvider>
          <Suspense fallback={<div class="flex items-center justify-center min-h-screen bg-[#0b0f19] text-white">กำลังโหลด...</div>}>
            {props.children}
          </Suspense>
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}