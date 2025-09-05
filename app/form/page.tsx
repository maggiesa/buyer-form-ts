// app/form/page.tsx
import dynamic from "next/dynamic";

export const metadata = {
  title: "買主屬性問卷｜日本不動產",
  description: "台灣客戶專用，日本不動產買方需求問卷",
};

// 只在瀏覽器渲染問卷，避免 SSR/Client 不一致
const JPPropertyBuyerForm = dynamic(
  () => import("../components/JPPropertyBuyerForm"),
  { ssr: false }
);

export default function FormPage() {
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: 12 }}>買主屬性問卷</h1>
      <p style={{ color: "#555", marginBottom: 24 }}>
        標示「*」為必填；送出後資料會寫入 Google 試算表。
      </p>
      <JPPropertyBuyerForm />
    </main>
  );
}
