/* ─────────────────────────────────────────────
   marriage-report.js  |  “marriage” 보고서 전용 스크립트 + simpleMD
   detail1~6 블러 미리보기, 로딩 바, upsertMarriage
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

/* 2. reports.marriage 만 추가/갱신 ────────────────── */
function upsertMarriage(reportsObj = {}, detailsArr, paid = false) {
  return {
    ...reportsObj,
    /** ■ 키만 marriage 로 변경 */
    marriage: { paid, data: { isMulti: true, details: detailsArr } },
  };
}
const saveToIndexedDB = (doc) =>
  new Promise((res) => {
    db
      .transaction(["results"], "readwrite")
      .objectStore("results")
      .put(doc).onsuccess = res;
  });

/* 3. URL 파라미터 */
const qs = new URLSearchParams(location.search);
const pageId = (qs.get("id") || "").trim();

/* 4. 결혼 보고서 API 호출 + 저장 ────────────────── */
async function analyzeMarriage(feature, recId) {
  renderLoading();

  /** ■ 엔드포인트·결제액만 변경 */
  const resp = await fetch(
    "https://port-0-momzzi-fastapi-m7ynssht4601229b.sel4.cloudtype.app/analyze/marriage",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feature }),
    }
  );
  if (!resp.ok) throw new Error("marriage api error");
  const j = await resp.json();

  /* detail1~6 */
  const arr = Array.from({ length: 6 }, (_, i) => j[`detail${i + 1}`]);

  /* DB 에 저장 */
  const doc = await new Promise((res) => {
    db
      .transaction(["results"], "readwrite")
      .objectStore("results")
      .get(recId).onsuccess = (e) => res(e.target.result);
  });
  if (!doc) return;

  doc.reports = upsertMarriage(doc.reports, arr, false);
  await saveToIndexedDB(doc);
  finishLoading();
  return doc;
}

/* 5. 결과 렌더 */
function renderResult(rec) {
  const marriage = rec.reports.marriage;
  renderMarriageNormalized({
    id: rec.id,
    sections: marriage.data.details,
    paid: marriage.paid,
  });
}

/* 5-1. 섹션별 HTML 조립 */
function renderMarriageNormalized(o) {
  const wrap = document.getElementById("label-container");

  const sectionsHTML = o.sections
    .map((txt) => {
      const html = simpleMD(txt);
      if (o.paid)
        return `<section class="marriage-sec"><div class="marriage-sec-content">${html}</div></section>`;

      return `<section class="marriage-sec">
                   <div class="marriage-sec-content">${html}</div>
                   <div class="marriage-sec-mask"></div>
                 </section>`;
    })
    .join("");

  const payBtn = o.paid
    ? ""
    : `<div class="mask-text-btn-wrap marriage-bgcolor">
            <div class="mask-text-btn" onclick="trackAndStartMarriagePayment('${o.id}')">
              결혼 보고서 전체 확인하기
            </div>
          </div>`;

  wrap.innerHTML = `
       <div class="marriage-report-wrapper">${sectionsHTML}</div>
       ${
         o.paid
           ? ""
           : `<div class="mask-text-wrap-top marriage-bg">
                <div class="mask-text">
                  <div class="mask-text-top marriage-color">결혼 심층 관상 보고서</div>
                  <div class="mask-text-top-sub">
                    배우자 상·궁합·결혼 타이밍 등<br/>6개 챕터 상세 안내
                  </div>
                  ${payBtn}
                  <div class="mask-text-btn-sub">총 8,000자 이상</div>
                </div>
              </div>`
       }`;

  /* 스크롤 배너 토글 */
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

/* 7. 로딩 UI */
let progInt = null;
function renderLoading() {
  document.getElementById("label-container").innerHTML = `
       <div class="loading-box dark-mode">
         <div class="loading-text">결혼 보고서를 생성 중입니다...</div>
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

  if (rec.reports?.marriage?.data) return renderResult(rec);

  if (rec.features) {
    const updated = await analyzeMarriage(rec.features, rec.id);
    if (updated) renderResult(updated);
  }
}
document.addEventListener("DOMContentLoaded", autoRender);

/* 10. 결제 플로우 (marriage 전용) */
function trackAndStartMarriagePayment(id) {
  document.body.style.overflow = "hidden";
  document.getElementById("marriagePaymentOverlay").style.display = "block";
  startMarriagePayment(id);
}
async function startMarriagePayment(id) {
  const clientKey = "live_gck_yZqmkKeP8gBaRKPg1WwdrbQRxB9l";
  const customerKey = "customer_" + Date.now();
  const origin = window.location.origin;
  try {
    const w = PaymentWidget(clientKey, customerKey);
    /** ■ 가격 예시 5,900원 */
    w.renderPaymentMethods("#marriage-method", { value: 5900 });
    w.renderAgreement("#marriage-agreement");
    document.getElementById("marriage-button").onclick = () =>
      w.requestPayment({
        orderId: `marriage_${Date.now()}`,
        orderName: "결혼 관상 보고서",
        successUrl: `${origin}/success.html?id=${encodeURIComponent(
          id
        )}&type=marriage`,
        failUrl: `${origin}/fail.html?id=${encodeURIComponent(
          id
        )}&type=marriage`,
      });
  } catch (e) {
    alert("❌ 결제 위젯 로드 실패: " + e.message);
  }
}
function closeMarriagePayment() {
  document.getElementById("marriagePaymentOverlay").style.display = "none";
  document.getElementById("marriage-method").innerHTML = "";
  document.getElementById("marriage-agreement").innerHTML = "";
  document.body.style.overflow = "";
}
