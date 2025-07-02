let analysisDb = null;

// 1. IndexedDB 초기화
async function initAnalysisDB() {
  const request = indexedDB.open("FaceAnalysisDB", 1);

  request.onupgradeneeded = function (event) {
    analysisDb = event.target.result;
    if (!analysisDb.objectStoreNames.contains("results")) {
      const store = analysisDb.createObjectStore("results", { keyPath: "id" });
      store.createIndex("timestamp", "timestamp", { unique: false });
    }
  };

  request.onsuccess = function (event) {
    analysisDb = event.target.result;
    console.log("✅ FaceAnalysisDB 초기화 완료");
    setTimeout(() => {
      validateAndMaybeResetDB();
    }, 100);
  };

  request.onerror = function (event) {
    console.error("❌ FaceAnalysisDB 오류", event);
  };
}

// 1-2. 자동 구조 점검 및 초기화
async function validateAndMaybeResetDB() {
  try {
    const results = await getAllResults();

    const corrupted = results.some((r) => {
      return (
        !r ||
        typeof r.id !== "string" ||
        typeof r.timestamp !== "string" ||
        typeof r.features !== "string" ||
        typeof r.imageBase64 !== "string"
      );
    });

    if (corrupted) {
      console.warn("⚠️ DB 데이터 중 필수값 누락 발견 → 자동 초기화");
      await resetAnalysisDB(true);
    } else {
      console.log("✅ DB 구조 및 값 점검 통과");
    }
  } catch (e) {
    console.error("❌ DB 점검 중 오류", e);
    await resetAnalysisDB(true);
  }
}

// 1-3. DB 초기화
function resetAnalysisDB(silent = false) {
  const req = indexedDB.deleteDatabase("FaceAnalysisDB");
  req.onsuccess = () => {
    console.log("✅ DB 초기화 완료");
    if (!silent) alert("DB가 초기화되었습니다. 새로고침 해주세요.");
  };
  req.onerror = (event) => {
    console.error("❌ DB 초기화 실패", event);
    if (!silent) alert("DB 초기화 실패");
  };
}

initAnalysisDB();

// 2. 저장 함수
async function saveResultToDB(data) {
  return new Promise((resolve, reject) => {
    const transaction = analysisDb.transaction(["results"], "readwrite");
    const store = transaction.objectStore("results");
    const request = store.put(data);

    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e);
  });
}

// 3. 전체 불러오기
async function getAllResults() {
  return new Promise((resolve, reject) => {
    const transaction = analysisDb.transaction(["results"], "readonly");
    const store = transaction.objectStore("results");
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e);
  });
}

// 4. 얼굴 특징 분석 및 저장 (📌 reports 없이 features만)
async function analyzeFaceFeatureOnly(file, imageBase64) {
  const formData = new FormData();
  formData.append("file", file);
  const resultContainer = document.getElementById("label-container");

  try {
    const response = await fetch(
      "https://port-0-momzzi-fastapi-m7ynssht4601229b.sel4.cloudtype.app/analyze/features/",
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) throw new Error("서버 응답 오류");

    const data = await response.json();
    const { features } = data;
    if (!features) throw new Error("features 없음");

    const imageTitleWrap = document.querySelector(".ai");
    imageTitleWrap.classList.add("disblock");

    const noStore = document.querySelector(".nostore");
    noStore.classList.add("none");

    // ⛔️ 얼굴 인식 실패 시 화면 하단에 메시지 출력하고 중단
    if (features.trim().toLowerCase() === "again") {
      resultContainer.innerHTML = `
        <div style="padding: 24px; text-align: center; font-size: 16px; color: red; font-weight: bold;">
          얼굴을 인식할 수 없습니다.<br/>다른 사진을 업로드해 주세요.
        </div>
        <div style="text-align: center; margin-top: 16px;">
          <button onclick="retryUpload()" style="padding: 10px 20px; font-size: 15px; background-color: #007bff; color: white; border: none; border-radius: 8px; cursor: pointer;">
            다른 사진 올리기
          </button>
        </div>
      `;
      mixpanel.track("얼굴 인식 실패", {
        reason: "features = again",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const result = {
      id: crypto.randomUUID(),
      imageBase64,
      features, // 얼굴 특징
      summary: "", // 요약 리포트
      detail: "", // 전체 리포트
      type: "", // 리포트 타입 (예: base, wealth 등)
      paid: false,
      purchasedAt: null,
      timestamp: new Date().toISOString(),
      analyzed: false,
    };

    mixpanel.track("얼굴 특징 분석 저장", {
      timestamp: result.timestamp,
    });

    await saveResultToDB(result);

    // const url = `/face-result/?id=${encodeURIComponent(result.id)}&type=base`;
    const url = `/base-report/?id=${encodeURIComponent(result.id)}`;
    window.location.href = url;
  } catch (error) {
    console.error("❌ 얼굴 특징 분석 실패:", error);
    resultContainer.innerHTML = `<p style='color: red;'>분석 중 오류가 발생했습니다. 다시 시도해주세요.</p>`;
  }
}

function retryUpload() {
  location.reload();
}

// 6. 사진 업로드 → 얼굴 특징 분석 → 저장
function readURL(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = async function (e) {
      const imageBase64 = e.target.result;
      document.getElementById("face-image").src = imageBase64;
      document.querySelector(".file-upload-content").style.display = "block";
      document.querySelector(".image-upload-wrap").style.display = "none";

      mixpanel.track("얼굴 이미지 등록", {
        filename: input.files[0].name,
        timestamp: new Date().toISOString(),
      });

      await analyzeFaceFeatureOnly(input.files[0], imageBase64);
    };
    reader.readAsDataURL(input.files[0]);
  }
}

// 7. Base64 변환
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
