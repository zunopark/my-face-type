let reunionImages = {
  self: null,
  partner: null,
};

let selectedRelation2 = null;
let selectedFeeling2 = null;

// 1) 두 이미지 업로드 완료 시 → 바텀시트 열기
function checkBothUploaded() {
  if (reunionImages.self && reunionImages.partner) {
    document.getElementById("relationshipSheet").classList.add("active");
  }
}

// 2) 관계 선택
document.querySelectorAll(".relationship-options div").forEach((el) =>
  el.addEventListener("click", () => {
    selectedRelation2 = el.dataset.type;

    // 선택 효과
    document
      .querySelectorAll(".relationship-options div")
      .forEach((item) => item.classList.remove("selected"));
    el.classList.add("selected");

    // 후속 감정 목록
    const followups = {
      연애: [
        "💓 손만 잡아도 세상이 환해져요",
        "💎 더 깊은 관계로 나아가고 싶어요",
        "😮‍💨 지쳐요... 이별을 고민 중이에요",
      ],
      짝사랑: [
        "👻 상대는 내 존재를 알까요...? (투명인간 탈출 희망!)",
        "⏳ 고백 타이밍을 조심스레 살피고 있어요",
        "💔 포기해야 할까요... 너무 힘들어요",
      ],
      썸: [
        "🧠 상대의 속마음이 너무 궁금해요!",
        "🔥 썸이 너무 느려요... 이젠 확신이 필요해요!",
        "🎯 언제 고백하면 좋을까요? 타이밍을 잡고 있어요",
      ],
      결혼: [
        "💍 꿀 떨어지는 결혼 생활 중이에요!",
        "💬 변화가 필요한 시점인 것 같아요",
        "😔 이혼까지 고민할 정도로 마음이 무거워요...",
      ],
      관심: [
        "🤔 상대도 날 생각하고 있을까요?",
        "🤗 살짝 더 다가가 보고 싶어요",
        "💘 눈만 마주쳐도 심장이 두근두근해요!",
      ],
    };

    const options = followups[selectedRelation2] || ["❤️ 마음이 복잡해요"];
    const followupEl = document.getElementById("followupOptions");
    followupEl.innerHTML = options.map((f) => `<div>${f}</div>`).join("");
    document.getElementById("followupSheet").classList.remove("hidden");
    document.getElementById("startAnalyzeBtn").classList.add("hidden");

    document.querySelectorAll("#followupOptions div").forEach((div) =>
      div.addEventListener("click", () => {
        selectedFeeling2 = div.textContent;
        document
          .querySelectorAll("#followupOptions div")
          .forEach((el) => el.classList.remove("selected"));
        div.classList.add("selected");
        document.getElementById("startAnalyzeBtn").classList.remove("hidden");
      })
    );
  })
);

// 3) 분석 시작 버튼 클릭
document.getElementById("startAnalyzeBtn").addEventListener("click", () => {
  document.getElementById("relationshipSheet").classList.remove("active");
  document.getElementById("analyzeOverlay").classList.add("active");

  analyzeReunionFeatures(
    reunionImages.self,
    reunionImages.partner,
    selectedRelation,
    selectedFeeling
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
        document.getElementById("openReunionStart").disabled = false;
      }
    };
    reader.readAsDataURL(input.files[0]);
  }
}

document.getElementById("openReunionStart").addEventListener("click", () => {
  document.getElementById("relationshipSheet").classList.add("active");
  document.querySelector(".bottom-analyze-overlay").classList.add("active");
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
    const request = indexedDB.open("reunionAnalysisDB", 1);

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
      relationshipType, // ✅ 저장
      relationshipFeeling, // ✅ 저장
      createdAt: new Date().toISOString(),
    });
    document.getElementById("analyzeOverlay").classList.remove("active");
    window.location.href = `/reunion-report/?id=${savedId}`;
  } catch (error) {
    document.getElementById("analyzeOverlay").classList.remove("active");
    console.error("분석 실패:", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const overlay = document.querySelector(".bottom-analyze-overlay");
  if (overlay) {
    overlay.addEventListener("click", () => {
      document.getElementById("relationshipSheet").classList.remove("active");
      overlay.classList.remove("active");
    });
  }
});
