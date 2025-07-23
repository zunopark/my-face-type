let db;
const qs = new URLSearchParams(location.search);
const coupleId = qs.get("id");

// 1. IndexedDB 초기화
function initCoupleDB() {
  const request = indexedDB.open("ReunionAnalysisDB", 1);
  request.onupgradeneeded = function (event) {
    db = event.target.result;
    if (!db.objectStoreNames.contains("results")) {
      db.createObjectStore("results", { keyPath: "id" });
    }
  };
  request.onsuccess = function (event) {
    db = event.target.result;
    autoRenderCoupleReport();
  };
  request.onerror = function (event) {
    console.error("❌ DB error", event);
  };
}
initCoupleDB();

// 2. 로딩 UI
function renderLoading() {
  document.getElementById("loading").style.display = "block";
  document.getElementById("report").style.display = "none";
}
function showReportSection() {
  document.getElementById("loading").style.display = "none";
  document.getElementById("report").style.display = "block";
}

// 3. 마크다운 렌더링
function simpleMD(src = "") {
  // 1) 코드블록 – 먼저 보존
  src = src.replace(
    /```([\s\S]*?)```/g,
    (_, c) => `<pre><code>${escapeHTML(c)}</code></pre>`
  );

  // 2) 인라인 코드 보존
  src = src.replace(/`([^`]+?)`/g, (_, c) => `<code>${escapeHTML(c)}</code>`);

  // 3) 헤딩
  src = src
    .replace(/^###### (.*$)/gim, "<h6>$1</h6>")
    .replace(/^##### (.*$)/gim, "<h5>$1</h5>")
    .replace(/^#### (.*$)/gim, "<h4>$1</h4>")
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>");

  // 4) 굵게 / 이탤릭 / 취소선
  src = src
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/___(.+?)___/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/~~(.+?)~~/g, "<del>$1</del>");

  // 5) 링크 / 이미지
  src = src
    .replace(/!\[([^\]]*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">')
    .replace(
      /\[([^\]]+?)\]\((.*?)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>'
    );

  // 6) 가로줄
  src = src.replace(/^\s*(\*\s*\*\s*\*|-{3,}|_{3,})\s*$/gm, "<hr>");

  // 7) 블록인용
  src = src.replace(/^>\s+(.*)$/gm, "<blockquote>$1</blockquote>");

  // 8) 리스트 (단순 1-level)
  //    * item / - item / + item
  src = src
    .replace(/^\s*[*+-]\s+(.+)$/gm, "<ul><li>$1</li></ul>")
    .replace(/(<\/ul>\s*)<ul>/g, "") // 인접 <ul> 병합
    // 1. item
    .replace(/^\s*\d+\.\s+(.+)$/gm, "<ol><li>$1</li></ol>")
    .replace(/(<\/ol>\s*)<ol>/g, ""); // 인접 <ol> 병합

  // 9) 남은 개행을 <br>로
  // src = src
  //   .replace(/\n{2,}/g, "</p><p>")
  //   .replace(/\n/g, "<br>");

  return `<p>${src}</p>`;
}
function escapeHTML(str) {
  return str.replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[m])
  );
}

// 4. 리포트 렌더링
function renderCoupleReport({ summary, score, details }, paid = false) {
  document.getElementById("score1").textContent = score;
  document.getElementById("score2").innerHTML = simpleMD(summary);
  document.getElementById("detail1").innerHTML = simpleMD(details[0]);
  document.getElementById("detail2").innerHTML = simpleMD(details[1]);
  document.getElementById("detail3").innerHTML = simpleMD(details[2]);
  document.getElementById("detail4").innerHTML = simpleMD(details[3]);
  document.getElementById("detail5").innerHTML = simpleMD(details[4]);
  showReportSection();

  if (paid) {
    // 🔓 결제 완료시 → 마스크 제거 & 버튼 숨김
    document.querySelectorAll(".result-mask").forEach((el) => el.remove());
    const viewBtn = document.getElementById("viewFullBtn-wrap");
    if (viewBtn) viewBtn.style.display = "none";

    const viewBtn2 = document.getElementById("view-full-btn-wrap2");
    if (viewBtn2) viewBtn2.style.display = "none";
  }
}

// 5. 자동 실행
async function autoRenderCoupleReport() {
  if (!coupleId) return;
  renderLoading();

  const tx = db.transaction(["results"], "readonly");
  const req = tx.objectStore("results").get(coupleId);

  req.onsuccess = async function () {
    const rec = req.result;
    if (!rec || !rec.features1 || !rec.features2) {
      document.getElementById("loading").innerHTML =
        "<div style='padding:24px; color:red;'>올바른 데이터가 없습니다.</div>";
      return;
    }

    // 사진 표시
    if (rec.image1Base64)
      document.getElementById("photo-self").src = rec.image1Base64;
    if (rec.image2Base64)
      document.getElementById("photo-partner").src = rec.image2Base64;

    // 이미 저장된 리포트 있으면 렌더링
    const saved = rec.reports?.couple?.data;
    const paid = rec.reports?.couple?.paid ?? false;

    if (saved?.details?.length === 5) {
      renderCoupleReport(saved, paid);
      return;
    }

    // 리포트 생성
    try {
      const reportRes = await fetch(
        "https://port-0-momzzi-fastapi-m7ynssht4601229b.sel4.cloudtype.app/analyze/reunion/report",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            features1: rec.features1,
            features2: rec.features2,
            relationshipType: rec.relationshipType,
            relationshipFeeling: rec.relationshipFeeling,
          }),
        }
      );
      const report = await reportRes.json();

      const scoreRes = await fetch(
        "https://port-0-momzzi-fastapi-m7ynssht4601229b.sel4.cloudtype.app/analyze/reunion/chance",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ detail1: report.detail1 }),
        }
      );
      const score = await scoreRes.json();

      const coupleData = {
        paid: false,
        purchasedAt: null,
        data: {
          summary: score.chance2,
          score: score.chance1,
          details: [
            report.detail1,
            report.detail2,
            report.detail3,
            report.detail4,
            report.detail5,
          ],
        },
      };

      const saveTx = db.transaction(["results"], "readwrite");
      const store = saveTx.objectStore("results");
      const updated = {
        ...rec,
        reports: { ...(rec.reports || {}), couple: coupleData },
      };
      store.put(updated);

      renderCoupleReport(coupleData.data, false);
    } catch (err) {
      console.error("❌ 보고서 생성 실패:", err);
      document.getElementById("loading").innerHTML =
        "<div style='padding:24px; color:red;'>보고서 생성 중 오류가 발생했습니다.</div>";
    }
  };
}

// 6. 결제 버튼 → Toss Payments
async function startCoupleTossPayment(resultId) {
  const clientKey = "live_gck_yZqmkKeP8gBaRKPg1WwdrbQRxB9l";
  const customerKey = "customer_" + Date.now();

  document.getElementById("lovePaymentOverlay").style.display = "block";

  try {
    const paymentWidget = PaymentWidget(clientKey, customerKey);
    paymentWidget.renderPaymentMethods("#love-method", { value: 16900 });
    paymentWidget.renderAgreement("#love-agreement");

    document.getElementById("love-button").onclick = async () => {
      try {
        await paymentWidget.requestPayment({
          orderId: `order_${Date.now()}`,
          orderName: "재회 상담 보고서",
          customerName: "고객",
          successUrl: `${window.location.origin}/success.html?id=${resultId}&type=couple`,
          failUrl: `${window.location.origin}/fail.html?id=${resultId}&type=couple`,
        });
      } catch (err) {
        alert("❌ 결제 실패: " + err.message);
      }
    };
  } catch (e) {
    alert("❌ Toss 위젯 로딩 실패: " + e.message);
  }
}

// 7. 결제 버튼 연결
document.getElementById("viewFullBtn").addEventListener("click", () => {
  startCoupleTossPayment(coupleId);
  mixpanel.track("유료 관상 분석 보고서 버튼 클릭", {
    resultId: resultId,
    timestamp: new Date().toISOString(),
    type: "재회",
  });
});

document.getElementById("viewFullBtn2").addEventListener("click", () => {
  startCoupleTossPayment(coupleId);
  mixpanel.track("유료 관상 분석 보고서 버튼 클릭", {
    resultId: resultId,
    timestamp: new Date().toISOString(),
    type: "재회",
  });
});

window.addEventListener("scroll", () => {
  const btn = document.getElementById("viewFullBtn2");
  const scrollTop = document.documentElement.scrollTop || window.scrollY;

  if (scrollTop > 1400) {
    btn.style.display = "block";
  } else {
    btn.style.display = "none";
  }
});

function closeLovePayment() {
  document.getElementById("lovePaymentOverlay").style.display = "none";
}

let fakeProgress = 0;
const messages = [
  "두 사람의 관상에서 가능성을 파악하고 있어요...",
  "눈빛을 해석하는 중입니다...",
  "이마와 코선으로 읽고 있어요...",
  "입꼬리와 턱선을 분석하고 있습니다...",
  "감정선의 흐름을 따라 재회 실마리를 찾는 중이에요...",
  "상대 마음의 문이 열릴 타이밍을 계산하고 있어요...",
  "관상으로 상대방 마을을 열 전략을 정리 중입니다...",
  "마지막 재회 조언을 완성하고 있어요...",
];

function renderLoading() {
  const msgEl = document.getElementById("loading-message");
  const barEl = document.getElementById("progress-bar");
  let msgIdx = 0;

  fakeProgress = 0;
  barEl.style.width = "0%";

  const progressInterval = setInterval(() => {
    if (fakeProgress < 98) {
      fakeProgress += Math.random() * 1.8;
      barEl.style.width = `${Math.min(fakeProgress, 98)}%`;
    }
  }, 300);

  const messageInterval = setInterval(() => {
    msgIdx = (msgIdx + 1) % messages.length;
    msgEl.textContent = messages[msgIdx];
  }, 4000);

  // 외부에서 loading 완료 시 호출
  window.finishLoading = () => {
    clearInterval(progressInterval);
    clearInterval(messageInterval);
    barEl.style.width = "100%";
  };
}
