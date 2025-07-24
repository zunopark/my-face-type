let db;

/* 0. 공통: 보고서 페이지로 이동 */
function goToReport(type, id) {
  // e.g. /wealth-report/?id=xxxx
  window.location.href = `/${type}-report/?id=${encodeURIComponent(id)}`;
}

/* ───────── 1. IndexedDB 초기화 ───────── */
async function initDB() {
  const req = indexedDB.open("FaceAnalysisDB", 1);

  req.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("results")) {
      const store = db.createObjectStore("results", { keyPath: "id" });
      store.createIndex("timestamp", "timestamp");
    }
  };
  req.onsuccess = (e) => {
    db = e.target.result;
    console.log("✅ DB ready");
  };
  req.onerror = (e) => console.error("❌ DB error", e);
}
initDB();

/* ───────── 2. 공통 유틸 ───────── */
const ALL_TYPES = ["base", "wealth", "love", "marriage", "career"];

/* 스켈레톤 생성 */
function makeSkeleton(normalized, paid = false) {
  const reports = {};
  for (const t of ALL_TYPES) {
    reports[t] = { paid: false, data: null };
  }
  reports.base = { paid, data: normalized }; // base 보고서만 즉시 채운다
  return reports;
}

/* DB put/get 래퍼 */
const saveToIndexedDB = (data) =>
  new Promise((res, rej) => {
    const tx = db.transaction(["results"], "readwrite");
    tx.objectStore("results").put(data).onsuccess = res;
    tx.onerror = (e) => rej(e);
  });

const getAllResults = () =>
  new Promise((res, rej) => {
    const tx = db.transaction(["results"], "readonly");
    const req = tx.objectStore("results").getAll();
    req.onsuccess = () => res(req.result);
    req.onerror = (e) => rej(e);
  });

/* ───────── 3. URL 파라미터 ───────── */
const qs = new URLSearchParams(location.search);
const pageId = (qs.get("id") || "").trim();
const pageType = (qs.get("type") || "base").trim(); // 기본은 base

/* ───────── 5. Base64 변환 유틸 ───────── */
const toBase64 = (file) =>
  new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });

// 9. 이미지 업로드 처리
function readURL(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = async function (e) {
      const imageBase64 = e.target.result;
      document.getElementById("face-image").src = imageBase64;
      document.querySelector(".file-upload-content").style.display = "block";
      document.querySelector(".image-upload-wrap").style.display = "none";

      mixpanel.track("관상 사진 업로드", {
        filename: input.files[0].name,
        timestamp: new Date().toISOString(),
      });
    };
    reader.readAsDataURL(input.files[0]);
  }
}

/* 4. 버튼/리포트 선택 UI */
function renderResultNormalized(obj) {
  const wrap = document.getElementById("label-container");
  const resultId = obj.id ?? "";

  wrap.innerHTML = `
    <div class="mask-text-wrap base-bg">
      <div class="mask-text base-color">
        <div class="mask-text-top">정통 심층 관상 보고서</div>
        <div class="mask-text-top-sub">
          내 미래가 보이는 부위별 정통 관상<br /><br />+ 천기누설 +<br/>
          팔자 고치는 성형 및 시술 부위 추천
        </div>
        <div class="mask-text-btn-wrap base-bgcolor">
          <div class="mask-text-btn"
               onclick="goToReport('base', '${resultId}')">
            전체 분석 결과 확인하기
          </div>
        </div>
        <div class="mask-text-btn-sub">총 5,000자 이상</div>
      </div>
    </div>

    <div class="mask-text-wrap love-bg">
      <div class="mask-text">
        <div class="mask-text-top love-color">연애 심층 관상 보고서</div>
        <div class="mask-text-top-sub">
          내 얼굴은 총 몇 번 연애를 할 수 있을까?<br /><br />
          + 천기누설 +<br />지금 내 인연을 만날 수 있는 시·구 위치 예측
        </div>
        <div class="mask-text-btn-wrap love-bgcolor">
          <div class="mask-text-btn"
               onclick="goToReport('love', '${resultId}')">
            나의 연애 관상 확인하기
          </div>
        </div>
        <div class="mask-text-btn-sub">총 13,000자 이상</div>
      </div>
    </div>

    <div class="mask-text-wrap wealth-bg">
      <div class="mask-text">
        <div class="mask-text-top wealth-color">재물 심층 관상 보고서</div>
        <div class="mask-text-top-sub">
          내 얼굴은 평생 몇 억을 벌 수 있을까?<br /><br />
          + 천기누설 +<br />현금 폭탄 떨어질 인생 타이밍 & 방법
        </div>
        <div class="mask-text-btn-wrap wealth-bgcolor">
          <div class="mask-text-btn"
               onclick="goToReport('wealth', '${resultId}')">
            나의 재물 관상 확인하기
          </div>
        </div>
        <div class="mask-text-btn-sub">총 15,000자 이상</div>
      </div>
    </div>

    <div class="mask-text-wrap marriage-bg">
      <div class="mask-text">
        <div class="mask-text-top marriage-color">결혼 심층 관상 보고서</div>
        <div class="mask-text-top-sub">
          셀카 한 장으로 알아보는 내 결혼 나이<br /><br />
          + 천기누설 +<br />웨딩운이 보이는 장소 & 놓치면 안 될 골든타임
        </div>
        <div class="mask-text-btn-wrap marriage-bgcolor">
          <div class="mask-text-btn"
               onclick="goToReport('marriage', '${resultId}')">
            나의 결혼 관상 확인하기
          </div>
        </div>
        <div class="mask-text-btn-sub">총 12,000자 이상</div>
      </div>
    </div>

    <div class="mask-text-wrap career-bg">
      <div class="mask-text">
        <div class="mask-text-top career-color">직업 심층 관상 보고서</div>
        <div class="mask-text-top-sub">
          내 얼굴에서 보이는 직업 성향과 고점 시기<br /><br />
          + 천기누설 +<br />연봉 그래프 상한가 찍을 부서·업종 좌표
        </div>
        <div class="mask-text-btn-wrap career-bgcolor">
          <div class="mask-text-btn"
               onclick="goToReport('career', '${resultId}')">
            나의 직업 관상 확인하기
          </div>
        </div>
        <div class="mask-text-btn-sub">총 12,000자 이상</div>
      </div>
    </div>
  `;
}

function renderImage(base64) {
  document.getElementById("face-image").src = base64;
  document.querySelector(".file-upload-content").style.display = "block";
  document.querySelector(".image-upload-wrap").style.display = "none";
}

const waitForDB = () =>
  new Promise((resolve) => {
    if (db) return resolve();
    const t = setInterval(() => {
      if (db) {
        clearInterval(t);
        resolve();
      }
    }, 100);
  });

/* ───────── 11. URL로 자동 렌더 ───────── */
async function autoRender() {
  await waitForDB(); // DB 연결 완료 보장
  if (!pageId) return; // id 파라미터 없으면 스킵

  // (옵션) IndexedDB 에서 결과를 가져와 필요한 정보가 있으면 obj 에 추가
  const tx = db.transaction(["results"], "readonly");
  const store = tx.objectStore("results");
  const req = store.get(pageId);
  req.onsuccess = (e) => {
    const rec = e.target.result;
    if (!rec) return;

    /* 5-1 사진 먼저 */
    if (rec.imageBase64) renderImage(rec.imageBase64);

    // 최소 요구 조건: id 하나만 있으면 됨
    const obj = { id: pageId };

    // 필요하다면 paid 정보 등도 넘길 수 있음
    if (rec && rec.reports) {
      obj.paid = rec.reports.base?.paid ?? false;
    }

    renderResultNormalized(obj);
  };
}

// 페이지 진입 시 자동 호출
document.addEventListener("DOMContentLoaded", () => {
  mixpanel.track("기본 관상 결과 페이지 진입", { ts: Date.now() });
  autoRender();
});
