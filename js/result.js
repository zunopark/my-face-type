/* ───────────────────────────────────────────────
   home.js  |  얼굴 특징 분석 → IndexedDB 저장
   (base · wealth · love · marriage · career 스켈레톤)
   ─────────────────────────────────────────────── */

let analysisDb = null;

/* 0. 공통 상수 & 스켈레톤 ───────────────────── */
const REPORT_TYPES = ["base", "wealth", "love", "marriage", "career"];
const makeReportsSkeleton = () => {
  const obj = {};
  for (const t of REPORT_TYPES) obj[t] = { paid: false, data: null };
  return obj;
};

/* 1. IndexedDB 준비 ─────────────────────────── */
(function initAnalysisDB() {
  const req = indexedDB.open("FaceAnalysisDB", 1);

  req.onupgradeneeded = (e) => {
    const db = (analysisDb = e.target.result);
    if (!db.objectStoreNames.contains("results")) {
      db.createObjectStore("results", { keyPath: "id" }).createIndex(
        "timestamp",
        "timestamp",
        { unique: false }
      );
    }
  };

  req.onsuccess = (e) => {
    analysisDb = e.target.result;
    console.log("✅ FaceAnalysisDB ready");
  };

  req.onerror = (e) => console.error("❌ DB open error", e);
})();

/* 2. DB helpers ─────────────────────────────── */
const saveResultToDB = (doc) =>
  new Promise((res, rej) => {
    analysisDb
      .transaction("results", "readwrite")
      .objectStore("results")
      .put(doc).onsuccess = res;
  });

/* 3. 특징 추출 → 저장 ───────────────────────── */
async function analyzeFaceFeatureOnly(file, imageBase64) {
  const fd = new FormData();
  fd.append("file", file);

  try {
    const r = await fetch(
      "https://port-0-momzzi-fastapi-m7ynssht4601229b.sel4.cloudtype.app/analyze/features/",
      { method: "POST", body: fd }
    );
    if (!r.ok) throw new Error("server error");
    const { features } = await r.json();
    if (!features) throw new Error("features missing");

    if (features.trim().toLowerCase() === "again") {
      showRetry("얼굴을 인식할 수 없습니다.<br>다른 사진을 올려주세요.");
      return;
    }

    const doc = {
      id: crypto.randomUUID(),
      imageBase64,
      features,
      timestamp: new Date().toISOString(),
      reports: makeReportsSkeleton(), // base · wealth · love · marriage · career
    };

    await saveResultToDB(doc);
    location.href = `/base-report/?id=${encodeURIComponent(doc.id)}`;
  } catch (err) {
    console.error("❌ 분석 실패", err);
    showRetry("분석 중 오류가 발생했습니다.<br>다시 시도해 주세요.");
  }
}

/* 4. 이미지 업로드 핸들러 ────────────────────── */
function readURL(input) {
  if (!(input.files && input.files[0])) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const b64 = e.target.result;
    document.getElementById("face-image").src = b64;
    document.querySelector(".file-upload-content").style.display = "block";
    document.querySelector(".image-upload-wrap").style.display = "none";
    analyzeFaceFeatureOnly(input.files[0], b64);
    // document.querySelector(".bottom-sheet-face").classList.add("active");
    // document.querySelector(".bottom-analyze-overlay").classList.add("active");
  };
  reader.readAsDataURL(input.files[0]);
}

/* 5. 오류/재시도 UI ─────────────────────────── */
function showRetry(msg) {
  document.getElementById("label-container").innerHTML = `
         <div style="padding:24px;text-align:center;font-size:16px;color:red;font-weight:bold;">${msg}</div>
         <div style="text-align:center;margin-top:16px;">
           <button onclick="location.reload()" style="padding:10px 20px;font-size:15px;background:#007bff;color:#fff;border:none;border-radius:8px;cursor:pointer;">
             다시 업로드
           </button>
         </div>`;
}
