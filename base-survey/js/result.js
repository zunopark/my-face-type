(function () {
  const TZ = "Asia/Seoul";

  // === v1 DB 열기 (필요 시 results 스토어 생성; 버전 올리지 않음) ===
  let db;
  function openDBv1() {
    return new Promise((resolve, reject) => {
      if (db) return resolve(db);
      const req = indexedDB.open("FaceAnalysisDB", 1);
      req.onupgradeneeded = (e) => {
        const _db = e.target.result;
        if (!_db.objectStoreNames.contains("results")) {
          const store = _db.createObjectStore("results", { keyPath: "id" });
          store.createIndex("timestamp", "timestamp");
        }
      };
      req.onsuccess = (e) => {
        db = e.target.result;
        resolve(db);
      };
      req.onerror = (e) => reject(e);
    });
  }

  function getIdFromURL() {
    return new URLSearchParams(location.search).get("id");
  }

  // results[id]에 sajuInput 병합 저장
  async function saveSajuInputToResults(id, sajuInput) {
    await openDBv1();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["results"], "readwrite");
      const store = tx.objectStore("results");
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const nowISO = new Date().toISOString();
        const rec = getReq.result || { id, timestamp: nowISO };
        rec.sajuInput = sajuInput; // ★ 여기만 추가/갱신
        if (!rec.timestamp) rec.timestamp = nowISO;
        const putReq = store.put(rec);
        putReq.onsuccess = resolve;
        putReq.onerror = (e) => reject(e);
      };
      getReq.onerror = (e) => reject(e);
    });
  }

  function readForm() {
    const form = document.getElementById("sajuForm");
    const fd = new FormData(form);
    return {
      name: (fd.get("name") || "").trim() || null,
      gender: fd.get("gender") || "male",
      date: fd.get("date"), // YYYY-MM-DD
      time:
        fd.get("time") && fd.get("time_unknown") !== "true"
          ? fd.get("time")
          : null,
      calendar: fd.get("calendar") || "solar",
      timezone: TZ,
    };
  }

  window.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("startAnalyzeBtn");
    const form = document.getElementById("sajuForm");

    // 엔터로 제출되는 걸 방지 (우린 버튼 클릭으로만 진행)
    form.addEventListener("submit", (e) => e.preventDefault());

    btn?.addEventListener("click", async () => {
      const id = getIdFromURL();
      if (!id) {
        alert("ID가 없습니다.");
        return;
      }

      const payload = readForm();
      if (!payload.date) {
        alert("생년월일을 선택해주세요.");
        return;
      }

      try {
        await saveSajuInputToResults(id, payload);
        try {
          mixpanel.track("사주 입력 저장", {
            id,
            ...payload,
            page: "base-survey",
          });
        } catch (_) {}
      } catch (err) {
        console.error("sajuInput 저장 실패:", err);
        // 저장 실패해도 이동은 유지
      }

      // ★ 기존 이동 로직 그대로
      location.href = `/base-report/?id=${encodeURIComponent(id)}`;
    });
  });
})();
