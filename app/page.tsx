// app/form/page.tsx
export const metadata = { title: "買主屬性問卷｜日本不動產" };

export default function FormPage() {
  return (
    <main style={{
      maxWidth: 960, margin: "0 auto", padding: 24, fontFamily: "system-ui, 'Microsoft JhengHei', sans-serif"
    }}>
      <h1 style={{fontSize: "1.5rem", marginBottom: 12}}>買主屬性問卷</h1>
      <p style={{color: "#555"}}>標示「*」為必填；送出後會顯示成功訊息。</p>

      <div style={{background:"#eef3ff", border:"1px dashed #9bb6ff", borderRadius:12, padding:12, margin:"12px 0"}}>
        <strong>提醒：</strong>請先到 <a href="https://formspree.io/" target="_blank">Formspree</a> 建立 endpoint，
        把下方 <code>action</code> 換成你自己的網址。
      </div>

      <form id="buyerForm" action="https://formspree.io/f/mblapzed" method="POST">
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
          <label>姓名／公司＋代表人 *<br/><input name="name" required placeholder="王小明／〇〇公司 代表人：張三"/></label>
          <label>年齡／成立年份 *<br/><input name="age_or_founded" required placeholder="35／2018"/></label>
          <label>Email *<br/><input name="email" type="email" required placeholder="you@example.com"/></label>
          <label>電話／Line（選填）<br/><input name="phone" placeholder="Line ID 或 +8869xx..."/></label>
        </div>

        <hr style={{margin:"20px 0"}}/>

        <label>希望看屋時段（1～3 個）<br/></label>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12}}>
          <input name="visit_slot_1" type="datetime-local"/>
          <input name="visit_slot_2" type="datetime-local"/>
          <input name="visit_slot_3" type="datetime-local"/>
        </div>

        <p style={{marginTop:12}}>預算與現金（萬日圓）</p>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12}}>
          <input name="budget_min" type="number" placeholder="最低"/>
          <input name="budget_max" type="number" placeholder="最高"/>
          <input name="cash_available" type="number" placeholder="可動用現金"/>
        </div>

        <p style={{marginTop:12}}>是否有日本金融帳戶 *</p>
        <label><input type="radio" name="jp_bank" value="yes" required/> 有</label>
        <label style={{marginLeft:12}}><input type="radio" name="jp_bank" value="no"/> 無</label>

        <p style={{marginTop:12}}>欲購買區域（盡量到區與町名）</p>
        <textarea name="areas" placeholder="例：東京都目黑區中目黑、澀谷區惠比壽…" style={{width:"100%", minHeight:90}}/>

        <div style={{marginTop:16, display:"flex", gap:12, alignItems:"center"}}>
          <button id="submitBtn" type="submit" style={{background:"#1f6feb", color:"#fff", border:0, borderRadius:10, padding:"12px 18px", cursor:"pointer"}}>送出表單</button>
          <span style={{color:"#666"}}>送出後將顯示成功訊息</span>
        </div>

        <div id="ok" style={{display:"none", background:"#e7f7ec", border:"1px solid #9bd3ae", color:"#1b6e3a", padding:12, borderRadius:12, marginTop:12}}>
          已收到您的資料！我們會盡快與您聯繫。
        </div>
        <div id="ng" style={{display:"none", background:"#fdeeee", border:"1px solid #f2b5b5", color:"#8a1f1f", padding:12, borderRadius:12, marginTop:12}}>
          送出失敗，請稍後再試或直接與我們聯繫。
        </div>
      </form>

      <script dangerouslySetInnerHTML={{__html: `
        const form = document.getElementById('buyerForm');
        const ok = document.getElementById('ok');
        const ng = document.getElementById('ng');
        const btn = document.getElementById('submitBtn');
        form.addEventListener('submit', async (e) => {
          e.preventDefault(); ok.style.display='none'; ng.style.display='none'; btn.disabled=true;
          try{
            const fd = new FormData(form);
            const res = await fetch(form.action, { method:'POST', body:fd, headers:{Accept:'application/json'}});
            if(res.ok){ ok.style.display='block'; form.reset(); } else { ng.style.display='block'; }
          }catch{ ng.style.display='block'; } finally { btn.disabled=false; }
        });
      `}}/>
    </main>
  );
}
