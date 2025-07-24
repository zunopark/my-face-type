/* ─────────────────────────────────────────────
   love-report.js  |  “love” 보고서 전용 스크립트 + simpleMD
   detail1~7 미리보기, 섹션별 블러, 로딩 바, upsertLove
   ───────────────────────────────────────────── */

let db;

/* 1. IndexedDB 초기화 */
async function initDB() {
  return new Promise((resolve) => {
    const req = indexedDB.open("FaceAnalysisDB", 1);
    req.onsuccess = (e) => {
      db = e.target.result;
      resolve();
    };
    req.onerror = () => resolve();
  });
}

/* 2. reports.love 만 추가/갱신 ────────────────────────── */
function upsertLove(reportsObj = {}, detailsArr, paid = false) {
  return {
    ...reportsObj, // 다른 보고서(base·wealth 등) 유지
    love: { paid, data: { isMulti: true, details: detailsArr } },
  };
}
const saveToIndexedDB = (d) =>
  new Promise((res, rej) => {
    db
      .transaction(["results"], "readwrite")
      .objectStore("results")
      .put(d).onsuccess = res;
  });

/* 3. URL 파라미터 */
const qs = new URLSearchParams(location.search);
const pageId = (qs.get("id") || "").trim();

/* 4. 연애 보고서 API 호출 + 저장 */
async function analyzeLove(feature, recId) {
  renderLoading();
  const resp = await fetch(
    "https://port-0-momzzi-fastapi-m7ynssht4601229b.sel4.cloudtype.app/analyze/love",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feature }),
    }
  );
  if (!resp.ok) throw new Error("love api error");
  const j = await resp.json();
  const arr = [
    j.detail1,
    j.detail2,
    j.detail3,
    j.detail4,
    j.detail5,
    j.detail6,
    j.detail7,
  ];

  /* 기존 문서 읽어서 love 만 upsert */
  const doc = await new Promise((res) => {
    db
      .transaction(["results"], "readwrite")
      .objectStore("results")
      .get(recId).onsuccess = (e) => res(e.target.result);
  });
  if (!doc) return;

  doc.reports = upsertLove(doc.reports, arr, false); // ★ 핵심
  await saveToIndexedDB(doc);
  finishLoading();
  return doc;
}

/* 5. 결과 렌더 */
function renderResult(rec) {
  const love = rec.reports.love;
  renderLoveNormalized({
    id: rec.id,
    sections: love.data.details,
    paid: love.paid,
  });
}

function renderLoveNormalized(o) {
  const wrap = document.getElementById("label-container");

  /* 섹션별 HTML */
  const sectionsHTML = o.sections
    .map((txt) => {
      const html = simpleMD(txt);

      /* 결제 완료 → 그대로 출력 */
      if (o.paid) {
        return `<section class="love-sec">
                  <div class="love-sec-content">${html}</div>
                </section>`;
      }

      /* 미결제 → 전체 출력 + 블러 마스크 */
      return `<section class="love-sec">
                <div class="love-sec-content">${html}</div>
                <div class="love-sec-mask"></div>
              </section>`;
    })
    .join("");

  /* “전체 보기” 버튼 */
  const payBtn = o.paid
    ? ""
    : `<div class="mask-text-btn-wrap love-bgcolor">
         <div class="mask-text-btn" onclick="trackAndStartLovePayment('${o.id}')">
           연애 보고서 전체 확인하기
         </div>
       </div>`;

  /* DOM 삽입 */
  wrap.innerHTML = `
    <div class="love-report-wrapper">${sectionsHTML}</div>
    ${
      o.paid
        ? ""
        : `<div class="mask-text-wrap-top love-bg">
             <div class="mask-text">
               <div class="mask-text-top love-color">연애 심층 관상 보고서</div>
               <div class="mask-text-top-sub">
                 총 연애 횟수·운명 상대 위치·끌어당김 전략 등<br/>7개 챕터 상세 안내
               </div>
               ${payBtn}
               <div class="mask-text-btn-sub">총 13,000자 이상</div>
             </div>
           </div>`
    }`;

  /* 스크롤 시 배너 토글 */
  if (!o.paid) {
    requestAnimationFrame(() => {
      const banner = document.querySelector(".mask-text-wrap-top");
      if (!banner) return;
      banner.style.opacity = "0";
      banner.style.transition = "opacity .3s";
      const TH = 400;
      const toggle = () =>
        (banner.style.opacity = window.scrollY > TH ? "1" : "0");
      toggle();
      window.addEventListener("scroll", toggle);
    });
  }
}

/* 6. 이미지 표시 */
function renderImage(b64) {
  document.getElementById("face-image").src = b64;
  document.querySelector(".file-upload-content").style.display = "block";
  document.querySelector(".image-upload-wrap").style.display = "none";
}

/* 7. 로딩 UI (base 와 동일) */
let progInt = null;
function renderLoading() {
  document.getElementById("label-container").innerHTML = `
       <div class="loading-box dark-mode">
         <div class="loading-text">연애 보고서를 생성 중입니다...</div>
         <div class="progress-bar-container">
           <div id="progress-bar" class="progress-bar-fill" style="width:0%"></div>
         </div>
       </div>`;
  const bar = document.getElementById("progress-bar");
  let p = 0;
  clearInterval(progInt);
  progInt = setInterval(() => {
    if (p < 95) {
      p += Math.random() * 0.8;
      bar.style.width = `${p}%`;
    }
  }, 300);
}
function finishLoading() {
  clearInterval(progInt);
  const bar = document.getElementById("progress-bar");
  if (bar) bar.style.width = "100%";
}

/* 8. Markdown + Escape (simpleMD 함수 그대로) */
const escapeHTML = (s = "") =>
  s.replace(
    /[&<>"'`]/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
        "`": "&#96;",
      }[m])
  );
const simpleMD = (src = "") =>
  src
    .replace(
      /```([\s\S]*?)```/g,
      (_, c) => `<pre><code>${escapeHTML(c)}</code></pre>`
    )
    .replace(/`([^`]+?)`/g, (_, c) => `<code>${escapeHTML(c)}</code>`)
    .replace(/^###### (.*$)/gim, "<h6>$1</h6>")
    .replace(/^##### (.*$)/gim, "<h5>$1</h5>")
    .replace(/^#### (.*$)/gim, "<h4>$1</h4>")
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/___(.+?)___/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/~~(.+?)~~/g, "<del>$1</del>")
    .replace(/!\[([^\]]*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">')
    .replace(
      /\[([^\]]+?)\]\((.*?)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>'
    )
    .replace(/^\s*(\*\s*\*\s*\*|-{3,}|_{3,})\s*$/gm, "<hr>")
    .replace(/^>\s+(.*)$/gm, "<blockquote>$1</blockquote>")
    .replace(/^\s*[*+-]\s+(.+)$/gm, "<ul><li>$1</li></ul>")
    .replace(/(<\/ul>\s*)<ul>/g, "")
    .replace(/^\s*\d+\.\s+(.+)$/gm, "<ol><li>$1</li></ol>")
    .replace(/(<\/ol>\s*)<ol>/g, "")
    .replace(/([^\n]) (✅|⚠️|📌|💡|⭐️|🔥)/g, "$1\n\n$2")
    .replace(
      /^(?!<h\d>|<ul>|<ol>|<li>|<pre>|<blockquote>|<img|<p>|<\/?ul>|<\/?ol>|<\/?li>|<\/?pre>|<\/?blockquote>|<\/?h\d>)(.+)$/gm,
      "<p>$1</p>"
    );

/* 9. 초기 로드 */
async function autoRender() {
  if (!pageId) return;
  await initDB();

  const rec = await new Promise((res) => {
    db
      .transaction(["results"], "readonly")
      .objectStore("results")
      .get(pageId).onsuccess = (e) => res(e.target.result);
  });
  if (!rec) return;

  if (rec.imageBase64) renderImage(rec.imageBase64);

  /* love 이미 있으면 바로 렌더 */
  if (rec.reports?.love?.data) return renderResult(rec);

  /* 없으면 API 호출 */
  if (rec.features) {
    const updated = await analyzeLove(rec.features, rec.id);
    if (updated) renderResult(updated);
  }
}

document.addEventListener("DOMContentLoaded", autoRender);

/* 10. 결제 플로우 (love 전용) */
function trackAndStartLovePayment(id) {
  document.body.style.overflow = "hidden";
  document.getElementById("lovePaymentOverlay").style.display = "block";
  startLovePayment(id);
}
async function startLovePayment(id) {
  const clientKey = "live_gck_yZqmkKeP8gBaRKPg1WwdrbQRxB9l";
  const customerKey = "customer_" + Date.now();
  const origin = window.location.origin;
  try {
    const w = PaymentWidget(clientKey, customerKey);
    w.renderPaymentMethods("#love-method", { value: 7900 });
    w.renderAgreement("#love-agreement");
    document.getElementById("love-button").onclick = () =>
      w.requestPayment({
        orderId: `love_${Date.now()}`,
        orderName: "연애 관상 보고서",
        successUrl: `${origin}/success.html?id=${encodeURIComponent(
          id
        )}&type=love`,
        failUrl: `${origin}/fail.html?id=${encodeURIComponent(id)}&type=love`,
      });
  } catch (e) {
    alert("❌ 결제 위젯 로드 실패: " + e.message);
  }
}
function closeLovePayment() {
  document.getElementById("lovePaymentOverlay").style.display = "none";
  document.getElementById("love-method").innerHTML = "";
  document.getElementById("love-agreement").innerHTML = "";
  document.body.style.overflow = "";
}
