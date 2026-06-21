import { MetaProvider } from "@solidjs/meta";
import { Router, Route } from "@solidjs/router";
import { Suspense, lazy } from "solid-js";
import "./app.css";

// โหลดคอมโพเนนต์สกินหน้าต่าง ๆ แบบ Lazy Loading เพื่อถนอมความเร็วการดาวน์โหลดเว็บครั้งแรก
const Home = lazy(() => import("./routes/index"));
const Admin = lazy(() => import("./routes/admin/index"));

export default function App() {
  return (
    <MetaProvider>
      <Router>
        <Suspense
          fallback={
            <div class="flex items-center justify-center min-h-screen bg-[#0b0f19] text-white font-bold">
              Loading... ⏳
            </div>
          }
        >
          <Route path="/" component={Home} />
          <Route path="/admin" component={Admin} />
        </Suspense>
      </Router>
    </MetaProvider>
  );
}
