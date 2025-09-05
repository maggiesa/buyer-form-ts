import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

export const runtime = "nodejs";

// 表頭順序（需與 Google 試算表第 1 列一模一樣）
const HEADERS = [
  "Timestamp","姓名","Email","國籍/居留","Line ID","聯絡電話","預算上限(萬日圓)","貸款需求",
  "購買目的","目標城市","目標區域","物件類型","新/中古","屋齡上限","房型","面積下限(㎡)",
  "距離車站(分)","目標租金(月/円)","表面投報率目標(%)","自用入住頻率","是否可接受民宿/旅館業",
  "帶看時間",
  // ↓ 拆出的欄位（其他需求分拆）
  "Budget(範圍)","Identity","CompanyName","CompanyRepresentative","Funding","PreferredAreas","Size(範圍)","Layout","NeedParking","PetFriendly","Language","Notes",
  "其他需求", // 保留，但本版不寫入
  "Submission ID",
] as const;

export type BuyerForm = {
  name: string;
  email: string;
  nationalityResidence?: string;
  lineId?: string;
  phone?: string;
  budgetJpy10k?: string;
  loanNeed?: string;
  purpose?: string;
  city?: string;
  area?: string;
  propertyType?: string;
  condition?: string;
  ageMax?: string;
  layout?: string;
  sizeMin?: string;
  walkMin?: string;
  rentTarget?: string;
  yieldTarget?: string;
  selfUseFreq?: string;
  minpakuOk?: string;
  viewingTime?: string;

  // 拆出的欄位
  Budget?: string;
  Identity?: string;

  // 法人欄位
  CompanyName?: string;
  CompanyRepresentative?: string;

  Funding?: string;
  PreferredAreas?: string;
  Size?: string;
  Layout?: string;
  NeedParking?: string;
  PetFriendly?: string;
  Language?: string;
  Notes?: string;

  otherNote?: string;
  submissionId?: string;
};

function getEnv() {
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL!;
  const privateKey = (process.env.GOOGLE_SHEETS_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
  const worksheetName = process.env.GOOGLE_SHEETS_WORKSHEET_NAME || "Responses";
  return { clientEmail, privateKey, spreadsheetId, worksheetName };
}

async function getSheets() {
  const { clientEmail, privateKey } = getEnv();
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

// 0-based -> A1 欄字母（支援 AA、AB…）
function colIndexToA1(idx: number) {
  let n = idx + 1, s = "";
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

// 轉小寫＋空白正規化（含全形空白/NBSP）
function normHeader(h: string) {
  return (h || "").replace(/[\u00A0\u3000]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

function buildRow(d: BuyerForm) {
  return [
    new Date().toISOString(),
    d.name || "",
    d.email || "",
    d.nationalityResidence || "",
    d.lineId || "",
    String(d.phone ?? ""), // 電話強制字串，避免開頭 0 被吃
    d.budgetJpy10k || "",
    d.loanNeed || "",
    d.purpose || "",
    d.city || "",
    d.area || "",
    d.propertyType || "",
    d.condition || "",
    d.ageMax || "",
    d.layout || "",
    d.sizeMin || "",
    d.walkMin || "",
    d.rentTarget || "",
    d.yieldTarget || "",
    d.selfUseFreq || "",
    d.minpakuOk || "",
    d.viewingTime || "",

    // 拆出欄位（順序對齊 HEADERS）
    d.Budget || "",
    d.Identity || "",

    // 法人欄位
    d.CompanyName || "",
    d.CompanyRepresentative || "",

    d.Funding || "",
    d.PreferredAreas || "",
    d.Size || "",
    d.Layout || "",
    d.NeedParking || "",
    d.PetFriendly || "",
    d.Language || "",
    d.Notes || "",

    d.otherNote || "",
    d.submissionId || "",
  ];
}

export async function POST(req: NextRequest) {
  try {
    const data = (await req.json()) as BuyerForm;
    const { spreadsheetId, worksheetName } = getEnv();
    const sheets = await getSheets();

    // 1) 讀表頭；若空 → 寫入我們的 HEADERS
    const hdrRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${worksheetName}!A1:ZZ1`,
    });
    const hdrRow = (hdrRes.data.values?.[0] || []) as string[];

    if (hdrRow.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${worksheetName}!A1`,
        valueInputOption: "RAW",
        requestBody: { values: [Array.from(HEADERS)] },
      });
    }

    // 2) 重新取得表頭並正規化
    const hdrRes2 =
      hdrRow.length === 0
        ? await sheets.spreadsheets.values.get({ spreadsheetId, range: `${worksheetName}!A1:ZZ1` })
        : hdrRes;

    const headersRaw = (hdrRes2.data.values?.[0] || []) as string[];
    const headersNorm = headersRaw.map(normHeader);

    const subIdColIdx = headersNorm.findIndex((h) => h === normHeader("Submission ID"));
    const totalCols = Math.max(headersRaw.length, HEADERS.length);
    const rowValues = buildRow(data).slice(0, totalCols);

    // 3) 有 submissionId 且找得到該欄 → 嘗試更新同一列
    if (data.submissionId && subIdColIdx >= 0) {
      const subIdColLetter = colIndexToA1(subIdColIdx);
      const colRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${worksheetName}!${subIdColLetter}2:${subIdColLetter}`,
        majorDimension: "COLUMNS",
        valueRenderOption: "UNFORMATTED_VALUE",
      });
      const col = (colRes.data.values?.[0] || []) as (string | number)[];
      const targetIdx = col.findIndex((v) => String(v ?? "").trim() === String(data.submissionId).trim());

      if (targetIdx >= 0) {
        const targetRowNumber = targetIdx + 2; // 從第 2 列開始
        const endColLetter = colIndexToA1(totalCols - 1);
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${worksheetName}!A${targetRowNumber}:${endColLetter}${targetRowNumber}`,
          valueInputOption: "RAW",
          requestBody: { values: [rowValues] },
        });
        return NextResponse.json({ ok: true, updated: true, row: targetRowNumber });
      }
    }

    // 4) 找不到同筆 → 新增
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${worksheetName}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [rowValues] },
    });
    return NextResponse.json({ ok: true, appended: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
