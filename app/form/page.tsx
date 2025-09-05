// app/form/page.tsx  ← 直接覆蓋這個檔案
import JPPropertyBuyerForm from "../components/JPPropertyBuyerForm";

export default function FormPage() {
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: 12 }}>買主屬性問卷</h1>
      <p style={{ color: "#555", marginBottom: 24 }}>
        標示「*」為必填；送出後資料會寫入 Google 試算表。
      </p>
      {/* 直接渲染 Client Component，不要 dynamic/ssr:false */}
      <JPPropertyBuyerForm />
    </main>
  );
}
