// app/form/page.tsx
import JPPropertyBuyerForm from "../components/JPPropertyBuyerForm";

export const metadata = {
  title: "買主屬性問卷｜日本不動產",
  description: "台灣客戶專用，日本不動產買方需求問卷",
};

export default function FormPage() {
  return (
    <main
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: 24,
        fontFamily: "system-ui, 'Microsoft JhengHei', sans-serif",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", marginBottom: 12 }}>
        買主屬性問卷
      </h1>
      <p style={{ color: "#555", marginBottom: 24 }}>
        標示「*」為必填；送出後資料會寫入 Google 試算表。
      </p>

      {/* 直接渲染 Client Component；不要 dynamic/ssr:false */}
      <JPPropertyBuyerForm />
    </main>
  );
}
