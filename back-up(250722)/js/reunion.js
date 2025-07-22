let reunionImages = {
  self: null,
  partner: null,
};

let selectedRelationText = null; // ✅ 사용자에게 보이는 텍스트
let selectedFeelingText = null; // ✅ 사용자에게 보이는 텍스트

// 1) 두 이미지 업로드 완료 시 → 바텀시트 열기
function checkBothUploaded() {
  if (reunionImages.self && reunionImages.partner) {
    document
      .getElementById("reunion-relationshipSheet")
      .classList.add("active");
  }
}

// 2) 재회 관계 선택
document.querySelectorAll(".reunion-relationship-options div").forEach((el) =>
  el.addEventListener("click", () => {
    selectedRelationText = el.textContent.trim(); // ✅ 내부 코드 저장 안함

    // 선택 스타일 처리
    document
      .querySelectorAll(".reunion-relationship-options div")
      .forEach((item) => item.classList.remove("selected"));
    el.classList.add("selected");

    // 고정된 후속 질문 표시
    const followupEl = document.getElementById("reunion-followupOptions");
    followupEl.innerHTML = `
        <div data-value="나">😢 내가 먼저 이야기했어요</div>
        <div data-value="상대방">😔 상대가 먼저 이야기했어요</div>
      `;
    document.getElementById("reunion-followupSheet").classList.remove("hidden");
    document.getElementById("openReunionStart").classList.add("hidden");

    // 선택 이벤트 연결
    document.querySelectorAll("#reunion-followupOptions div").forEach((div) =>
      div.addEventListener("click", () => {
        selectedFeelingText = div.textContent.trim(); // ✅ 내부 코드 없음

        // 선택 스타일 처리
        document
          .querySelectorAll("#reunion-followupOptions div")
          .forEach((el) => el.classList.remove("selected"));
        div.classList.add("selected");

        // 분석 버튼 활성화
        document.getElementById("openReunionStart").classList.remove("hidden");
      })
    );
  })
);

// 3) 분석 시작 버튼 클릭
document
  .getElementById("reunion-startAnalyzeBtn")
  .addEventListener("click", () => {
    document
      .getElementById("reunion-relationshipSheet")
      .classList.remove("active");
    document.getElementById("reunion-analyzeOverlay").classList.add("active");

    analyzeReunionFeatures(
      reunionImages.self,
      reunionImages.partner,
      selectedRelationText,
      selectedFeelingText
    );
  });

// 이미지 미리보기 및 Base64 저장
function readReunionURL(input, type) {
  const previewId =
    type === "reunionSelf" ? "reunion-preview-self" : "reunion-preview-partner";

  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const preview = document.getElementById(previewId);
      preview.innerHTML = `<img src="${e.target.result}" class="reunion-preview-image" alt="사진 미리보기"/>`;

      reunionImages[type === "reunionSelf" ? "self" : "partner"] =
        e.target.result;

      // ✅ 두 장 다 업로드 완료 시 버튼 활성화
      if (reunionImages.self && reunionImages.partner) {
        document.getElementById("reunion-startAnalyzeBtn").disabled = false;
      }
    };
    reader.readAsDataURL(input.files[0]);
  }
}

document.getElementById("openReunionStart").addEventListener("click", () => {
  document.getElementById("reunion-relationshipSheet").classList.add("active");
  document
    .querySelector(".reunion-bottom-analyze-overlay")
    .classList.add("active");
});

// Base64 → File 변환
function dataURLtoFile2(dataUrl, filename) {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

// IndexedDB 저장
function saveReunionFeaturesToDB(data) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("ReunionAnalysisDB", 1);

    request.onupgradeneeded = function (event) {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("results")) {
        db.createObjectStore("results", { keyPath: "id" }); // ❌ autoIncrement 제거!
      }
    };

    request.onsuccess = function (event) {
      const db = event.target.result;
      const tx = db.transaction(["results"], "readwrite");
      const store = tx.objectStore("results");
      const putRequest = store.put(data); // ✅ put 사용

      putRequest.onsuccess = function () {
        resolve(data.id); // ✅ 내가 넣은 UUID 그대로 반환
      };

      putRequest.onerror = function () {
        reject(putRequest.error);
      };
    };

    request.onerror = function () {
      reject(request.error);
    };
  });
}

async function analyzeReunionFeatures(
  image1Base64,
  image2Base64,
  relationshipType,
  relationshipFeeling
) {
  const file1 = dataURLtoFile2(image1Base64, "self.jpg");
  const file2 = dataURLtoFile2(image2Base64, "partner.jpg");

  const formData = new FormData();
  formData.append("file1", file1);
  formData.append("file2", file2);

  try {
    const response = await fetch(
      "https://port-0-momzzi-fastapi-m7ynssht4601229b.sel4.cloudtype.app/analyze/pair/features/",
      { method: "POST", body: formData }
    );

    const result = await response.json();
    if (result.error) return;

    const savedId = await saveReunionFeaturesToDB({
      id: crypto.randomUUID(),
      features1: result.features1,
      features2: result.features2,
      image1Base64,
      image2Base64,
      relationshipType: selectedRelationText, // ✅ 예: "상대방의 잠수이별 및 통보"
      relationshipFeeling: selectedFeelingText, // ✅ 예: "😔 상대가 먼저 이야기했어요"
      createdAt: new Date().toISOString(),
    });
    document
      .getElementById("reunion-analyzeOverlay")
      .classList.remove("active");
    window.location.href = `/reunion-report/?id=${savedId}`;
  } catch (error) {
    document
      .getElementById("reunion-analyzeOverlay")
      .classList.remove("active");
    console.error("분석 실패:", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const overlay = document.querySelector(".reunion-bottom-analyze-overlay");
  if (overlay) {
    overlay.addEventListener("click", () => {
      document
        .getElementById("reunion-relationshipSheet")
        .classList.remove("active");
      overlay.classList.remove("active");
    });
  }
});
