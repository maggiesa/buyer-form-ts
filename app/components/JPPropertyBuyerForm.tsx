"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, Calendar, ChevronRight, ChevronLeft } from "lucide-react";

// ★ 你的 Google Apps Script Web App Endpoint（/exec）
const GAS_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbyBhBT3qfALSjPVmQKtFFsXoXGpq9t_j0_KK1Zm8tl25gk_1vdIKtNgunBE_tztrUWd/exec";

/* ----------------------------- 常數與工具 ----------------------------- */
const S = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

const TAIWAN_CITIES = [
  "台北市","新北市","桃園市","台中市","台南市","高雄市","基隆市","新竹市","嘉義市",
  "新竹縣","苗栗縣","彰化縣","南投縣","雲林縣","嘉義縣","屏東縣","宜蘭縣","花蓮縣","台東縣",
  "澎湖縣","金門縣","連江縣"
] as const;

const STEP_TITLES = ["基本資料", "看屋時段", "需求與預算", "地區與條件", "其他"] as const;

const PURPOSE_OPTIONS = ["自住", "投資", "度假", "其他"] as const;
const REASON_OPTIONS = ["資產配置", "子女留學", "退休規劃", "工作/調職", "其他"] as const;
const IDENTITY_OPTIONS = ["個人", "法人"] as const;
const FUNDING_OPTIONS = ["日本銀行帳戶", "海外匯入", "其他"] as const;
const LAYOUT_OPTIONS = ["1R/1K", "1DK", "1LDK", "2LDK", "3LDK", "4LDK+"] as const;
const LANGUAGE_OPTIONS = ["可使用日文", "需中文服務", "英文亦可"] as const;

const AREA_OPTIONS = [
  { group: "東京 23 區", items: ["千代田","中央","港","新宿","文京","台東","墨田","江東","品川","目黑","大田","世田谷","澀谷","中野","杉並","豐島","北","荒川","板橋","練馬","足立","葛飾","江戶川"] },
  { group: "近郊/其他", items: ["橫濱","川崎","千葉","埼玉","大阪市","京都市","札幌","福岡","那覇"] },
];

function useLocalStorageState<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => {
    try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : initial; }
    catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(state)); } catch {} }, [key, state]);
  return [state, setState] as const;
}

/* ----------------------------- 型別 ----------------------------- */
type Step = 0 | 1 | 2 | 3 | 4;
type Status = "idle" | "submitting" | "success" | "error";

/* ============================= 主元件 ============================= */
export default function JPPropertyBuyerForm() {
  // 防 Hydration：只在 client 掛載後才渲染互動式內容
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const [step, setStep] = useState<Step>(0);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [submittedCount, setSubmittedCount] = useState(0);
  const [valuesJustSent, setValuesJustSent] = useState<{ name: string; email: string }>({ name: "", email: "" });

  const [meta, setMeta] = useLocalStorageState("jp-buyer-form-meta", {
    submissionId: "" as string,
  });

  const [form, setForm] = useLocalStorageState("jp-buyer-form-v1", {
    name_or_company: "",
    contact_email: "",
    contact_phone: "",
    contact_line: "",
    viewing_slots: [{ date: "", time: "" }],
    residence_country: "台灣",
    residence_city: "",
    tw_city: "" as string,
    purpose: "投資",
    reason: "資產配置",
    identity: "個人",
    company_name: "",
    company_representative: "",
    budget_min: "",
    budget_max: "",
    funding_source: "日本銀行帳戶",
    has_jp_bank_account: "否",
    preferred_areas: [] as string[],
    size_min_sqm: "",
    size_max_sqm: "",
    layout: "1LDK",
    need_parking: false,
    pet_friendly: false,
    jp_language_ability: "需中文服務",
    notes: "",
  });

  // 一次把可能是 undefined 的值轉字串，避免非受控→受控
  useEffect(() => {
    setForm((prev: any) => ({
      ...prev,
      tw_city: S(prev.tw_city),
      name_or_company: S(prev.name_or_company),
      contact_email: S(prev.contact_email),
      contact_phone: S(prev.contact_phone),
      contact_line: S(prev.contact_line),
      residence_country: S(prev.residence_country) || "台灣",
      residence_city: S(prev.residence_city),
      purpose: S(prev.purpose) || "投資",
      reason: S(prev.reason) || "資產配置",
      identity: S(prev.identity) || "個人",
      company_name: S(prev.company_name),
      company_representative: S(prev.company_representative),
      budget_min: S(prev.budget_min),
      budget_max: S(prev.budget_max),
      funding_source: S(prev.funding_source) || "日本銀行帳戶",
      has_jp_bank_account: S(prev.has_jp_bank_account) || "否",
      preferred_areas: Array.isArray(prev.preferred_areas) ? prev.preferred_areas : [],
      size_min_sqm: S(prev.size_min_sqm),
      size_max_sqm: S(prev.size_max_sqm),
      layout: S(prev.layout) || "1LDK",
      need_parking: Boolean(prev.need_parking),
      pet_friendly: Boolean(prev.pet_friendly),
      jp_language_ability: S(prev.jp_language_ability) || "需中文服務",
      notes: S(prev.notes),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canNext = useMemo(() => {
    if (step === 0) {
      const hasContact =
        S(form.contact_email).trim() !== "" ||
        S(form.contact_phone).trim() !== "" ||
        S(form.contact_line).trim() !== "";
      const countryOk = S(form.residence_country).trim() !== "";
      const cityOk = S(form.residence_country) === "台灣" ? S(form.tw_city).trim() !== "" : true;
      const corpOk =
        S(form.identity) === "法人"
          ? S(form.company_name).trim() !== "" && S(form.company_representative).trim() !== ""
          : true;
      return S(form.name_or_company).trim() !== "" && hasContact && countryOk && cityOk && corpOk;
    }
    if (step === 1) return form.viewing_slots.some((s) => s.date && s.time);
    if (step === 2) {
      const min = Number(form.budget_min || 0);
      const max = Number(form.budget_max || 0);
      return max === 0 || (min > 0 && max >= min);
    }
    if (step === 3) return form.preferred_areas.length > 0 && (form.size_min_sqm || form.size_max_sqm || form.layout);
    return true;
  }, [step, form]);

  const sortedPreviewSlots = useMemo(
    () =>
      [...form.viewing_slots]
        .filter((s) => s.date && s.time)
        .sort((a, b) => new Date(`${a.date}T${a.time}:00`).getTime() - new Date(`${b.date}T${b.time}:00`).getTime()),
    [form.viewing_slots]
  );

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }
  function updateViewingSlot(idx: number, field: "date" | "time", value: string) {
    setForm((prev) => {
      const next = [...prev.viewing_slots];
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, viewing_slots: next };
    });
  }
  function addViewingSlot() { setForm((prev) => ({ ...prev, viewing_slots: [...prev.viewing_slots, { date: "", time: "" }] })); }
  function removeViewingSlot(idx: number) { setForm((prev) => ({ ...prev, viewing_slots: prev.viewing_slots.filter((_, i) => i !== idx) })); }

  function ensureSubmissionId() {
    if (!meta.submissionId) {
      const id = `SUB-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setMeta({ submissionId: id });
      return id;
    }
    return meta.submissionId;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setError("");

    const sortedSlots = [...form.viewing_slots]
      .filter((s) => s.date && s.time)
      .sort((a, b) => new Date(`${a.date}T${a.time}:00`).getTime() - new Date(`${b.date}T${b.time}:00`).getTime());
    const viewing = sortedSlots.map((s) => `${s.date} ${s.time}`).join("、");

    const areas = form.preferred_areas.join("、");
    const budgetDisplay =
      form.budget_min && form.budget_max
        ? `${form.budget_min}~${form.budget_max} 萬日圓`
        : form.budget_max
        ? `最高 ${form.budget_max} 萬日圓`
        : form.budget_min
        ? `最低 ${form.budget_min} 萬日圓`
        : "";

    const nationalityResidence =
      form.residence_country === "台灣"
        ? `台灣 ${form.tw_city || ""}`.trim()
        : `${form.residence_country || ""} ${form.residence_city || ""}`.trim();

    const submissionId = ensureSubmissionId();

    // 送往 Google Apps Script 的 payload（key 清晰好維護）
    const payload = {
      name: form.name_or_company,
      email: form.contact_email,
      phone: String(form.contact_phone || ""),
      lineId: form.contact_line,
      nationalityResidence,
      purpose: form.purpose,
      reason: form.reason,
      identity: form.identity,
      company_name: form.identity === "法人" ? form.company_name : "",
      company_representative: form.identity === "法人" ? form.company_representative : "",
      budget_min: form.budget_min,
      budget_max: form.budget_max,
      budget_display: budgetDisplay,
      funding_source: form.funding_source,
      has_jp_bank_account: form.has_jp_bank_account,
      preferred_areas: areas,
      size_min_sqm: form.size_min_sqm,
      size_max_sqm: form.size_max_sqm,
      layout: form.layout,
      need_parking: form.need_parking ? "需要" : "不一定",
      pet_friendly: form.pet_friendly ? "可" : "不限",
      jp_language_ability: form.jp_language_ability,
      notes: form.notes,
      viewing_time: viewing,
      submissionId,
    };

    try {
      const res = await fetch(GAS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const text = await res.text().catch(() => "");
      if (!res.ok || (text && !/success/i.test(text))) {
        throw new Error(text || `HTTP ${res.status}`);
      }

      setValuesJustSent({ name: form.name_or_company, email: form.contact_email });
      setStatus("success");
      setSubmittedCount((n) => n + 1);
    } catch (e: any) {
      setError(e?.message || "送出失敗，請稍後再試");
      setStatus("error");
    }
  }

  /* ----------------------------- 成功畫面 ----------------------------- */
  if (status === "success") {
    const firstTime = submittedCount === 1;
    return (
      <main className="min-h-screen p-6 bg-gray-50 grid place-items-center">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow p-6 space-y-3">
          <h1 className="text-2xl font-semibold">已收到你的資訊 ✅</h1>
          <p>姓名：<b>{valuesJustSent.name}</b></p>
          <p>Email：<b>{valuesJustSent.email}</b></p>

          <div className="flex gap-2 pt-2">
            {firstTime && (
              <button className="px-4 py-2 rounded-xl border" onClick={() => { setStatus("idle"); setStep(0); }}>
                返回修改一次
              </button>
            )}
            <button
              className="px-4 py-2 rounded-xl shadow bg-black text-white"
              onClick={() => {
                localStorage.removeItem("jp-buyer-form-v1");
                localStorage.removeItem("jp-buyer-form-meta");
                window.location.href = "/";
              }}
            >
              結束
            </button>
          </div>

          {!firstTime && <p className="text-xs text-slate-500">已更新同一筆資料；為避免重複，請按「結束」。</p>}
        </div>
      </main>
    );
  }

  /* ----------------------------- 表單畫面 ----------------------------- */
  const progress = Math.round(((step + 1) / STEP_TITLES.length) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">日本不動產買方需求問卷@株式会社大和</h1>
          <p className="text-sm text-slate-600 mt-1">台灣客戶專用｜填寫約 3–5 分鐘｜資料僅供配對物件與行程安排</p>
        </header>

        <div className="w-full bg-slate-200 rounded-full h-2 mb-6">
          <div className="bg-slate-900 h-2 rounded-full" style={{ width: `${progress}%` }} />
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-medium">步驟 {step + 1}／{STEP_TITLES.length}：{STEP_TITLES[step]}</div>
          <div className="text-xs text-slate-500">已完成 {progress}%</div>
        </div>

        {/* ✅ 這裡只有一個 <form>，避免巢狀 */}
        <form onSubmit={handleSubmit} className="grid gap-6">
          <AnimatePresence mode="wait">
            {/* 步驟 0 */}
            {step === 0 && (
              <motion.section key="step-0" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium">姓名／公司名稱 <span className="text-red-500">*</span></label>
                  <input className="mt-1 w-full rounded-2xl border p-3" placeholder="例：王小明 或 明鑫股份有限公司" value={form.name_or_company} onChange={(e) => update("name_or_company", e.target.value)} />
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium">Email</label>
                    <input type="email" className="mt-1 w-full rounded-2xl border p-3" placeholder="you@example.com" value={form.contact_email} onChange={(e) => update("contact_email", e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">手機</label>
                    <input className="mt-1 w-full rounded-2xl border p-3" placeholder="09xx-xxx-xxx / 含國碼" value={form.contact_phone} onChange={(e) => update("contact_phone", e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">LINE ID</label>
                    <input className="mt-1 w-full rounded-2xl border p-3" placeholder="@yourlineid" value={form.contact_line} onChange={(e) => update("contact_line", e.target.value)} />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium">目前居住地（國家）</label>
                    <select className="mt-1 w-full rounded-2xl border p-3"
                      value={form.residence_country}
                      onChange={(e) => {
                        const v = e.target.value;
                        setForm((prev) => ({
                          ...prev,
                          residence_country: v,
                          tw_city: v === "台灣" ? prev.tw_city : "",
                          residence_city: v === "台灣" ? "" : prev.residence_city,
                        }));
                      }}>
                      {["台灣","日本","香港","新加坡","其他"].map((c) => (<option key={c} value={c}>{c}</option>))}
                    </select>
                  </div>
                  {form.residence_country === "台灣" ? (
                    <div>
                      <label className="block text-sm font-medium">縣市（台灣）<span className="text-red-500">*</span></label>
                      <select className="mt-1 w-full rounded-2xl border p-3" value={form.tw_city} onChange={(e) => update("tw_city", e.target.value)}>
                        <option value="">— 請選擇 —</option>
                        {TAIWAN_CITIES.map((city) => (<option key={city} value={city}>{city}</option>))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium">城市</label>
                      <input className="mt-1 w-full rounded-2xl border p-3" placeholder="例：台北市 / Tokyo" value={form.residence_city} onChange={(e) => update("residence_city", e.target.value)} />
                    </div>
                  )}
                </div>
                {form.identity === "法人" && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium">公司名稱 <span className="text-red-500">*</span></label>
                      <input className="mt-1 w-full rounded-2xl border p-3" value={form.company_name} onChange={(e) => update("company_name", e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">代表人姓名 <span className="text-red-500">*</span></label>
                      <input className="mt-1 w-full rounded-2xl border p-3" value={form.company_representative} onChange={(e) => update("company_representative", e.target.value)} />
                    </div>
                  </div>
                )}
              </motion.section>
            )}

            {/* 步驟 1 */}
            {step === 1 && (
              <motion.section key="step-1" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="grid gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" /><h3 className="font-semibold">看屋日期與時間（至少填 1 個時段）</h3>
                </div>
                {form.viewing_slots.map((slot, idx) => (
                  <div key={idx} className="grid md:grid-cols-3 gap-3 items-end">
                    <div><label className="block text-sm font-medium">日期</label>
                      <input type="date" className="mt-1 w-full rounded-2xl border p-3" value={slot.date} onChange={(e) => updateViewingSlot(idx, "date", e.target.value)} /></div>
                    <div><label className="block text-sm font-medium">時間</label>
                      <input type="time" className="mt-1 w-full rounded-2xl border p-3" value={slot.time} onChange={(e) => updateViewingSlot(idx, "time", e.target.value)} /></div>
                    <div className="flex gap-2">
                      <button type="button" className="rounded-2xl border px-4 py-3" onClick={() => removeViewingSlot(idx)}>刪除</button>
                      {idx === form.viewing_slots.length - 1 && (
                        <button type="button" className="rounded-2xl border px-4 py-3" onClick={addViewingSlot}>新增時段</button>
                      )}
                    </div>
                  </div>
                ))}
              </motion.section>
            )}

            {/* 步驟 2 */}
            {step === 2 && (
              <motion.section key="step-2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="grid gap-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div><label className="block text-sm font-medium">購買目的</label>
                    <Select value={form.purpose} onChange={(v) => update("purpose", v)} options={PURPOSE_OPTIONS} /></div>
                  <div><label className="block text-sm font-medium">購買理由</label>
                    <Select value={form.reason} onChange={(v) => update("reason", v)} options={REASON_OPTIONS} /></div>
                  <div><label className="block text-sm font-medium">身份別</label>
                    <Select value={form.identity} onChange={(v) => update("identity", v)} options={IDENTITY_OPTIONS} /></div>
                </div>
                {form.identity === "法人" && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium">公司名稱</label>
                      <input className="mt-1 w-full rounded-2xl border p-3" value={form.company_name} onChange={(e) => update("company_name", e.target.value)} /></div>
                    <div><label className="block text-sm font-medium">代表人姓名</label>
                      <input className="mt-1 w-full rounded-2xl border p-3" value={form.company_representative} onChange={(e) => update("company_representative", e.target.value)} /></div>
                  </div>
                )}
                <div className="grid md:grid-cols-4 gap-4">
                  <div><label className="block text-sm font-medium">預算（最低，萬日圓）</label>
                    <input type="number" className="mt-1 w-full rounded-2xl border p-3" placeholder="例如 3000" value={form.budget_min} onChange={(e) => update("budget_min", e.target.value)} /></div>
                  <div><label className="block text-sm font-medium">預算（最高，萬日圓）</label>
                    <input type="number" className="mt-1 w-full rounded-2xl border p-3" placeholder="例如 8000" value={form.budget_max} onChange={(e) => update("budget_max", e.target.value)} /></div>
                  <div><label className="block text-sm font-medium">資金來源</label>
                    <Select value={form.funding_source} onChange={(v) => update("funding_source", v)} options={FUNDING_OPTIONS} /></div>
                  <div><label className="block text-sm font-medium">日本銀行帳戶</label>
                    <Select value={form.has_jp_bank_account} onChange={(v) => update("has_jp_bank_account", v)} options={["是","否","不適用"]} /></div>
                </div>
              </motion.section>
            )}

            {/* 步驟 3 */}
            {step === 3 && (
              <motion.section key="step-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium">偏好地區（可多選）</label>
                  <AreaMultiSelect value={form.preferred_areas} onChange={(v) => update("preferred_areas", v)} />
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div><label className="block text-sm font-medium">面積（最小，㎡）</label>
                    <input type="number" className="mt-1 w-full rounded-2xl border p-3" value={form.size_min_sqm} onChange={(e) => update("size_min_sqm", e.target.value)} /></div>
                  <div><label className="block text-sm font-medium">面積（最大，㎡）</label>
                    <input type="number" className="mt-1 w-full rounded-2xl border p-3" value={form.size_max_sqm} onChange={(e) => update("size_max_sqm", e.target.value)} /></div>
                  <div><label className="block text-sm font-medium">格局</label>
                    <Select value={form.layout} onChange={(v) => update("layout", v)} options={LAYOUT_OPTIONS} /></div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <Toggle label="需要停車位" checked={form.need_parking} onChange={(v) => update("need_parking", v)} />
                  <Toggle label="可養寵物" checked={form.pet_friendly} onChange={(v) => update("pet_friendly", v)} />
                </div>
              </motion.section>
            )}

            {/* 步驟 4 */}
            {step === 4 && (
              <motion.section key="step-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="grid gap-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium">語言需求</label>
                    <Select value={form.jp_language_ability} onChange={(v) => update("jp_language_ability", v)} options={LANGUAGE_OPTIONS} /></div>
                  <div><label className="block text-sm font-medium">其他備註</label>
                    <input className="mt-1 w-full rounded-2xl border p-3" placeholder="例如：需要無障礙、靠近地鐵、可短租等" value={form.notes} onChange={(e) => update("notes", e.target.value)} /></div>
                </div>
                <SummaryCard form={{ ...form, viewing_slots: sortedPreviewSlots }} />
              </motion.section>
            )}
          </AnimatePresence>

          {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

          <div className="flex items-center justify-between gap-2">
            <button type="button" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, (s as number) - 1) as Step)} className="inline-flex items-center gap-1 rounded-2xl border px-4 py-3 disabled:opacity-50">
              <ChevronLeft className="w-4 h-4" /> 上一步
            </button>
            <div className="flex items-center gap-2">
              {step < STEP_TITLES.length - 1 && (
                <button type="button" disabled={!canNext} onClick={() => setStep((s) => Math.min(STEP_TITLES.length - 1, (s as number) + 1) as Step)} className="inline-flex items-center gap-1 rounded-2xl bg-slate-900 text-white px-4 py-3 disabled:opacity-50">
                  下一步 <ChevronRight className="w-4 h-4" />
                </button>
              )}
              {step === STEP_TITLES.length - 1 && (
                <button
                  suppressHydrationWarning
                  type="submit"
                  disabled={!canNext || status === "submitting"}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-6 py-3 disabled:opacity-50"
                >
                  {status === "submitting" ? (<><Loader2 className="w-4 h-4 animate-spin" /> 送出中</>) : (<><Check className="w-4 h-4" /> 送出</>)}
                </button>
              )}
            </div>
          </div>
        </form>

        <footer className="mt-10 text-xs text-slate-500">
          第一次送出後可「返回修改一次」；再次送出會「更新同一筆」而不是新增第二筆。
        </footer>
      </div>
    </div>
  );
}

/* ----------------------------- 小元件 ----------------------------- */
function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: readonly string[] }) {
  return (
    <div className="relative">
      <select className="mt-1 w-full rounded-2xl border p-3 appearance-none" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
      </select>
      <ChevronDownIcon />
    </div>
  );
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-2xl border p-3 cursor-pointer select-none">
      <span className="text-sm font-medium">{label}</span>
      <button type="button" onClick={() => onChange(!checked)} className={`w-12 h-6 rounded-full transition relative ${checked ? "bg-slate-900" : "bg-slate-300"}`}>
        <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition ${checked ? "translate-x-6" : "translate-x-0"}`} />
      </button>
    </label>
  );
}
function ChevronDownIcon() {
  return (
    <svg className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}
function AreaMultiSelect({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  function toggle(area: string) {
    const next = value.includes(area) ? value.filter((a) => a !== area) : [...value, area];
    onChange(next);
  }
  return (
    <div className="grid gap-3">
      {AREA_OPTIONS.map(({ group, items }) => (
        <div key={group} className="rounded-2xl border p-3">
          <div className="text-xs font-semibold text-slate-500 mb-2">{group}</div>
          <div className="flex flex-wrap gap-2">
            {items.map((area) => (
              <button key={area} type="button" onClick={() => toggle(area)} className={`px-3 py-1.5 rounded-full border text-sm ${value.includes(area) ? "bg-slate-900 text-white" : "bg-white"}`}>
                {area}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-12 gap-2 text-sm">
      <div className="col-span-4 md:col-span-3 text-slate-500">{label}</div>
      <div className="col-span-8 md:col-span-9">{children}</div>
    </div>
  );
}
function SummaryCard({ form }: { form: any }) {
  const slots: Array<{date: string; time: string}> = form.viewing_slots || [];
  return (
    <div className="rounded-2xl border p-4 bg-slate-50">
      <h4 className="font-semibold mb-3">送出前快速確認</h4>
      <div className="grid gap-2">
        <SummaryRow label="姓名/公司">{S(form.name_or_company) || "—"}</SummaryRow>
        <SummaryRow label="聯絡方式">{[S(form.contact_email), S(form.contact_phone), S(form.contact_line)].filter(Boolean).join(" / ") || "—"}</SummaryRow>
        <SummaryRow label="看屋時段">
          {slots.length === 0 ? "—" : (
            <ul className="list-disc ml-5">
              {slots.map((s, i) => (<li key={i}>{s.date} {s.time}</li>))}
            </ul>
          )}
        </SummaryRow>
        <SummaryRow label="居住地">{form.residence_country === "台灣" ? `台灣 ${S(form.tw_city) || ""}` : `${S(form.residence_country) || "—"} ${S(form.residence_city) || ""}`}</SummaryRow>
        <SummaryRow label="目的/理由">{`${S(form.purpose)} / ${S(form.reason)}`}</SummaryRow>
        <SummaryRow label="身份">{S(form.identity)}</SummaryRow>
        {S(form.identity) === "法人" && (
          <>
            <SummaryRow label="公司名稱">{S(form.company_name) || "—"}</SummaryRow>
            <SummaryRow label="代表人">{S(form.company_representative) || "—"}</SummaryRow>
          </>
        )}
        <SummaryRow label="預算">{`${S(form.budget_min) || "?"} ~ ${S(form.budget_max) || "?"} 萬日圓`}</SummaryRow>
        <SummaryRow label="資金來源/帳戶">{`${S(form.funding_source)} / ${S(form.has_jp_bank_account)}`}</SummaryRow>
        <SummaryRow label="偏好地區">{(form.preferred_areas || []).length ? form.preferred_areas.join("、") : "—"}</SummaryRow>
        <SummaryRow label="面積/格局">{`${S(form.size_min_sqm) || "?"}~${S(form.size_max_sqm) || "?"}㎡ / ${S(form.layout)}`}</SummaryRow>
        <SummaryRow label="停車/寵物">{`${form.need_parking ? "需要" : "不一定"} / ${form.pet_friendly ? "可" : "不限"}`}</SummaryRow>
        <SummaryRow label="語言">{S(form.jp_language_ability)}</SummaryRow>
        <SummaryRow label="備註">{S(form.notes) || "—"}</SummaryRow>
      </div>
    </div>
  );
}
