/* ---------- IndexedDB 초기화 ---------- */
let db;
const DB_NAME = "FaceAnalysisDB";
const STORE = "coupleReports";

function initDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2); // v2: coupleReports 추가
    req.onupgradeneeded = (e) => {
      db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = (e) => {
      db = e.target.result;
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

/* 👉 초기화가 끝나면 resolve 되는 전역 Promise */
const dbReady = initDB();

/* ---------- IndexedDB 저장 ---------- */
async function saveToDB(obj) {
  await dbReady; // **여기서 초기화 완료 보장**
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add(obj);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* ---------- 전역 상태 ---------- */
let selfFile = null;
let partnerFile = null;

/* ---------- 미리보기 ---------- */
function readURL(input, who) {
  if (!input.files || !input.files[0]) return;

  mixpanel.track("커플 - 사진 선택", {
    역할: who === "coupleSelf" ? "본인" : "상대",
  });

  const reader = new FileReader();
  reader.onload = (e) => {
    document.querySelector(
      `#couple-preview-${who === "coupleSelf" ? "self" : "partner"}`
    ).innerHTML = `<img src="${e.target.result}" alt="${who}" />`;
  };
  reader.readAsDataURL(input.files[0]);

  if (who === "coupleSelf") selfFile = input.files[0];
  else partnerFile = input.files[0];

  const ready = selfFile && partnerFile;
  document.getElementById("analyzeBtn").disabled = !ready;
  if (ready) mixpanel.track("커플 - 두 사진 준비");
}

/* ---------- 결과 IndexedDB 저장 ---------- */
function saveToDB(obj) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).add(obj);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* ---------- 분석 요청 ---------- */
async function startAnalysis() {
  const analyzeBtn = document.getElementById("analyzeBtn");
  analyzeBtn.disabled = true;
  const resultBox = document.getElementById("result");
  resultBox.innerHTML =
    "<span class='loading'>❤️ 잠시만요, 우리 커플 케미 분석 중! ❤️</span>";

  mixpanel.track("커플 - 분석 요청");

  const formData = new FormData();
  formData.append("file1", selfFile);
  formData.append("file2", partnerFile);

  try {
    const res = await fetch(
      "https://port-0-momzzi-fastapi-m7ynssht4601229b.sel4.cloudtype.app/analyze/pair/compatibility/",
      { method: "POST", body: formData }
    );
    if (!res.ok) throw new Error("서버 오류");
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    const clean = data.summary
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");
    const { line_summary, detail } = JSON.parse(clean);

    const id = crypto.randomUUID();
    await saveToDB({
      id,
      createdAt: Date.now(),
      selfImg: await fileToBase64(selfFile),
      partnerImg: await fileToBase64(partnerFile),
      lineSummary: line_summary,
      detail,
    });

    mixpanel.track("커플 - 분석 완료", { id });

    location.href = `/couple-report.html?id=${id}`;
  } catch (e) {
    console.error(e);
    analyzeBtn.disabled = false;
    resultBox.innerHTML = "❌ 분석 중 오류가 발생했습니다. 다시 시도해 주세요.";
    mixpanel.track("커플 - 분석 오류", { msg: e.message || "unknown" });
  }
}

/* ---------- 유틸: File → Base64 ---------- */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

/* ---------- 시작 ---------- */
initDB().catch((err) => console.error("IndexedDB 초기화 실패", err));
