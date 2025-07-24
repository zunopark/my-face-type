/* ─────────────────────────────────────────────
   career-report.js  |  “career” 보고서 + simpleMD
   detail1~8 블러 미리보기, 로딩 바, upsertCareer
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

/* 2. reports.career 만 upsert */
function upsertCareer(reportsObj = {}, detailsArr, paid = false) {
  return {
    ...reportsObj,
    /** ■ career 키 */
    career: { paid, data: { isMulti: true, details: detailsArr } },
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

/* 4. 직업 보고서 API 호출 + 저장 */
async function analyzeCareer(feature, recId) {
  renderLoading();

  /** ■ career 엔드포인트 */
  const resp = await fetch(
    "https://port-0-momzzi-fastapi-m7ynssht4601229b.sel4.cloudtype.app/analyze/career",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feature }),
    }
  );
  if (!resp.ok) throw new Error("career api error");
  const j = await resp.json();

  /* detail1~8 */
  const arr = Array.from({ length: 8 }, (_, i) => j[`detail${i + 1}`]);

  /* DB 병합 */
  const doc = await new Promise((res) => {
    db
      .transaction(["results"], "readwrite")
      .objectStore("results")
      .get(recId).onsuccess = (e) => res(e.target.result);
  });
  if (!doc) return;

  doc.reports = upsertCareer(doc.reports, arr, false);
  await saveToIndexedDB(doc);
  finishLoading();
  return doc;
}

/* 5. 결과 렌더 */
function renderResult(rec) {
  const career = rec.reports.career;
  renderCareerNormalized({
    id: rec.id,
    sections: career.data.details,
    paid: career.paid,
  });
}

/* 5-1. 섹션 HTML */
function renderCareerNormalized(o) {
  const wrap = document.getElementById("label-container");

  const secHTML = o.sections
    .map((txt) => {
      const html = simpleMD(txt);
      if (o.paid)
        return `<section class="career-sec"><div class="career-sec-content">${html}</div></section>`;

      return `<section class="career-sec">
                   <div class="career-sec-content">${html}</div>
                   <div class="career-sec-mask"></div>
                 </section>`;
    })
    .join("");

  const payBtn = o.paid
    ? ""
    : `<div class="mask-text-btn-wrap career-bgcolor">
            <div class="mask-text-btn" onclick="trackAndStartCareerPayment('${o.id}')">
              직업 보고서 전체 확인하기
            </div>
          </div>`;

  wrap.innerHTML = `
       <div class="career-report-wrapper">${secHTML}</div>
       ${
         o.paid
           ? ""
           : `<div class="mask-text-wrap-top career-bg">
                <div class="mask-text">
                  <div class="mask-text-top career-color">직업·승진·사업 심층 관상 보고서</div>
                  <div class="mask-text-top-sub">
                    최적 직군·승진 시기·사이드잡 등<br/>8개 챕터 상세 안내
                  </div>
                  ${payBtn}
                  <div class="mask-text-btn-sub">총 9,000자 이상</div>
                </div>
              </div>`
       }`;

  /* 배너 토글 */
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
         <div class="loading-text">직업 보고서를 생성 중입니다...</div>
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

  if (rec.reports?.career?.data) return renderResult(rec);

  if (rec.features) {
    const updated = await analyzeCareer(rec.features, rec.id);
    if (updated) renderResult(updated);
  }
}
document.addEventListener("DOMContentLoaded", autoRender);

/* 10. 결제 플로우 (career 전용) */
function trackAndStartCareerPayment(id) {
  document.body.style.overflow = "hidden";
  document.getElementById("careerPaymentOverlay").style.display = "block";
  startCareerPayment(id);
}
async function startCareerPayment(id) {
  const clientKey = "live_gck_yZqmkKeP8gBaRKPg1WwdrbQRxB9l";
  const customerKey = "customer_" + Date.now();
  const origin = window.location.origin;
  try {
    const w = PaymentWidget(clientKey, customerKey);
    /** ■ 예: 6,900원 */
    w.renderPaymentMethods("#career-method", { value: 6900 });
    w.renderAgreement("#career-agreement");
    document.getElementById("career-button").onclick = () =>
      w.requestPayment({
        orderId: `career_${Date.now()}`,
        orderName: "직업 관상 보고서",
        successUrl: `${origin}/success.html?id=${encodeURIComponent(
          id
        )}&type=career`,
        failUrl: `${origin}/fail.html?id=${encodeURIComponent(id)}&type=career`,
      });
  } catch (e) {
    alert("❌ 결제 위젯 로드 실패: " + e.message);
  }
}
function closeCareerPayment() {
  document.getElementById("careerPaymentOverlay").style.display = "none";
  document.getElementById("career-method").innerHTML = "";
  document.getElementById("career-agreement").innerHTML = "";
  document.body.style.overflow = "";
}
