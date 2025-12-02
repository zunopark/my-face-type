// API 엔드포인트
const SAJU_API_COMPUTE =
  "https://port-0-momzzi-fastapi-m7ynssht4601229b.sel4.cloudtype.app/saju/compute";

// IndexedDB 설정
const DB_NAME = "SajuLoveDB";
const DB_VERSION = 2;
const STORE_NAME = "results";

// IndexedDB 초기화 (Promise 반환)
const dbReady = new Promise((resolve, reject) => {
  const req = indexedDB.open(DB_NAME, DB_VERSION);

  req.onupgradeneeded = (e) => {
    const db = e.target.result;
    // 기존 store가 있으면 삭제 후 재생성
    if (db.objectStoreNames.contains(STORE_NAME)) {
      db.deleteObjectStore(STORE_NAME);
    }
    db.createObjectStore(STORE_NAME, { keyPath: "id" }).createIndex(
      "timestamp",
      "timestamp",
      { unique: false }
    );
    console.log("SajuLoveDB store created");
  };

  req.onsuccess = (e) => {
    const db = e.target.result;
    // store 존재 여부 확인
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      console.error("Store not found, deleting DB and retrying...");
      db.close();
      indexedDB.deleteDatabase(DB_NAME);
      location.reload();
      return;
    }
    console.log("SajuLoveDB ready");
    resolve(db);
  };

  req.onerror = (e) => {
    console.error("DB open error", e);
    reject(e);
  };
});

// DB 저장 함수
const saveResultToDB = async (doc) => {
  const db = await dbReady;
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(doc);
      req.onsuccess = () => resolve(doc);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
};

// 상태 관리
const formState = {
  gender: null,
  calendar: "solar",
};

// DOM 요소
const inputOverlay = document.getElementById("inputOverlay");
const additionalInputOverlay = document.getElementById(
  "additionalInputOverlay"
);
const startBtn = document.getElementById("startLoveSaju");
const inputNextBtn = document.getElementById("inputNextBtn");
const submitBtn = document.getElementById("submitSaju");
const inputPrevBtn = document.getElementById("inputPrevBtn");
const additionalPrevBtn = document.getElementById("additionalPrevBtn");
const userNameInput = document.getElementById("userName");
const birthDateInput = document.getElementById("birthDate");
const birthTimeSelect = document.getElementById("birthTime");
const timeUnknownBtn = document.getElementById("timeUnknownBtn");
const genderBtns = document.querySelectorAll(".gender_btn");
const calendarBtns = document.querySelectorAll(".calendar_btn");
const statusBtns = document.querySelectorAll(".status_btn");
const analyzeOverlay = document.getElementById("analyzeOverlay");

// 대화 시스템 DOM
const bgImage = document.getElementById("bgImage");
const landingBottom = document.getElementById("landingBottom");
const landingTitle = document.getElementById("landingTitle");
const dialogueOverlay = document.getElementById("dialogueOverlay");
const dialogueWrap = document.getElementById("dialogueWrap");
const dialogueText = document.getElementById("dialogueText");
const dialogueButtons = document.querySelector(".dialogue_buttons");
const dialoguePrevBtn = document.getElementById("dialoguePrevBtn");
const dialogueNextBtn = document.getElementById("dialogueNextBtn");

// 대화 내용
const dialogues = [
  {
    text: "어서오세요,\n인연을 찾아 이 곳에 오셨군요!",
    nextBtnText: "다음",
  },
  {
    text: "먼저 성함과 생년월일을\n알려주시겠어요?",
    nextBtnText: "좋아, 내 이름은..",
  },
];

// 추가 대화 (기본 정보 입력 후)
const additionalDialogues = [
  {
    text: "이대로 연애비책을\n드릴 수도 있지만,",
    nextBtnText: "다음",
  },
  {
    text: "조금만 더 알려주시면\n훨씬 자세한 풀이가 가능하답니다",
    nextBtnText: "응, 어떤걸 알려줄까?",
  },
];

let currentAdditionalDialogue = 0;
let isInAdditionalDialogue = false;

let currentDialogue = 0;
let isTyping = false;
let typingTimeout = null;

// 타이핑 효과
function typeText(text, callback) {
  isTyping = true;
  dialogueText.innerHTML = "";
  dialogueNextBtn.classList.remove("visible");

  let i = 0;
  const cursor = '<span class="typing-cursor"></span>';

  function type() {
    if (i < text.length) {
      const currentText = text.substring(0, i + 1).replace(/\n/g, "<br>");
      dialogueText.innerHTML = currentText + cursor;
      i++;
      typingTimeout = setTimeout(type, 50);
    } else {
      dialogueText.innerHTML = text.replace(/\n/g, "<br>");
      isTyping = false;
      if (callback) callback();
    }
  }

  type();
}

// 타이핑 스킵
function skipTyping(text) {
  if (typingTimeout) clearTimeout(typingTimeout);
  dialogueText.innerHTML = text.replace(/\n/g, "<br>");
  isTyping = false;
  showButtons();
}

// 버튼 표시 업데이트
function showButtons() {
  dialogueButtons.classList.add("visible");
  if (isInAdditionalDialogue) {
    dialogueNextBtn.textContent =
      additionalDialogues[currentAdditionalDialogue].nextBtnText;
  } else {
    dialogueNextBtn.textContent = dialogues[currentDialogue].nextBtnText;
  }
}

// 다음 대화로 진행
function nextDialogue() {
  // 추가 대화 모드
  if (isInAdditionalDialogue) {
    if (isTyping) {
      skipTyping(additionalDialogues[currentAdditionalDialogue].text);
      return;
    }

    currentAdditionalDialogue++;

    if (currentAdditionalDialogue < additionalDialogues.length) {
      dialogueButtons.classList.remove("visible");
      typeText(additionalDialogues[currentAdditionalDialogue].text, () => {
        showButtons();
      });
    } else {
      // 추가 대화 끝 -> 추가 정보 입력 폼 표시
      dialogueOverlay.classList.remove("active");
      dialogueWrap.classList.remove("active");
      additionalInputOverlay.classList.add("active");
    }
    return;
  }

  // 기본 대화 모드
  if (isTyping) {
    skipTyping(dialogues[currentDialogue].text);
    return;
  }

  currentDialogue++;

  if (currentDialogue < dialogues.length) {
    dialogueButtons.classList.remove("visible");
    typeText(dialogues[currentDialogue].text, () => {
      showButtons();
    });
  } else {
    // 기본 대화 끝 -> 기본 정보 입력 폼 표시
    dialogueOverlay.classList.remove("active");
    dialogueWrap.classList.remove("active");
    inputOverlay.classList.add("active");
  }
}

// 이전 대화로 돌아가기 (또는 시작 화면으로)
function prevDialogue() {
  // 추가 대화 모드
  if (isInAdditionalDialogue) {
    if (currentAdditionalDialogue > 0) {
      currentAdditionalDialogue--;
      dialogueButtons.classList.remove("visible");
      typeText(additionalDialogues[currentAdditionalDialogue].text, () => {
        showButtons();
      });
    } else {
      // 추가 대화 첫 번째에서 이전 -> 기본 입력 폼으로 돌아가기
      isInAdditionalDialogue = false;
      currentAdditionalDialogue = 0;
      dialogueOverlay.classList.remove("active");
      dialogueWrap.classList.remove("active");
      dialogueButtons.classList.remove("visible");

      // 이미지 복원 (3.png -> 2.png) - 같은 캐릭터라 fade 없이
      bgImage.src = "img/2.png";

      inputOverlay.classList.add("active");
    }
    return;
  }

  // 기본 대화 모드
  if (currentDialogue > 0) {
    currentDialogue--;
    dialogueButtons.classList.remove("visible");
    typeText(dialogues[currentDialogue].text, () => {
      showButtons();
    });
  } else {
    // 첫 번째 대화에서 이전 -> 시작 화면으로 돌아가기
    currentDialogue = 0;
    dialogueOverlay.classList.remove("active");
    dialogueWrap.classList.remove("active");
    dialogueButtons.classList.remove("visible");

    // 이미지 1.png로 복원
    bgImage.classList.add("fade");
    setTimeout(() => {
      bgImage.src = "img/1.png";
      bgImage.onload = () => {
        bgImage.classList.remove("fade");
      };
    }, 500);

    // 시작 버튼, 타이틀 다시 표시
    landingBottom.classList.remove("hidden");
    landingTitle.classList.remove("hidden");
  }
}

// 시작하기 버튼 -> 대화 시작
startBtn.addEventListener("click", function () {
  // 시작 버튼, 타이틀 숨기기
  landingBottom.classList.add("hidden");
  landingTitle.classList.add("hidden");

  // 이미지 전환 (1.png -> 2.png)
  bgImage.classList.add("fade");
  setTimeout(() => {
    bgImage.src = "img/2.png";
    bgImage.onload = () => {
      bgImage.classList.remove("fade");
    };
  }, 500);

  // 대화 UI 표시
  setTimeout(() => {
    dialogueOverlay.classList.add("active");
    dialogueWrap.classList.add("active");
    typeText(dialogues[0].text, () => {
      showButtons();
    });
  }, 600);
});

// 다음 버튼 클릭
dialogueNextBtn.addEventListener("click", nextDialogue);

// 이전 버튼 클릭
dialoguePrevBtn.addEventListener("click", prevDialogue);

// 대화 박스 클릭해도 다음으로
dialogueWrap
  .querySelector(".dialogue_box")
  .addEventListener("click", nextDialogue);

// 기본 입력 폼에서 이전 버튼 -> 대화로 돌아가기
inputPrevBtn.addEventListener("click", function () {
  inputOverlay.classList.remove("active");
  currentDialogue = dialogues.length - 1; // 마지막 대화로
  dialogueOverlay.classList.add("active");
  dialogueWrap.classList.add("active");
  typeText(dialogues[currentDialogue].text, () => {
    showButtons();
  });
});

// 기본 입력 폼에서 다음 버튼 -> 추가 대화 시작
inputNextBtn.addEventListener("click", function () {
  if (inputNextBtn.disabled) return;

  inputOverlay.classList.remove("active");
  isInAdditionalDialogue = true;
  currentAdditionalDialogue = 0;

  // 이미지 전환 (2.png -> 3.png) - 같은 캐릭터라 fade 없이
  bgImage.src = "img/3.png";

  // 추가 대화 시작
  dialogueOverlay.classList.add("active");
  dialogueWrap.classList.add("active");
  typeText(additionalDialogues[0].text, () => {
    showButtons();
  });
});

// 추가 입력 폼에서 이전 버튼 -> 추가 대화로 돌아가기
additionalPrevBtn.addEventListener("click", function () {
  additionalInputOverlay.classList.remove("active");
  currentAdditionalDialogue = additionalDialogues.length - 1;
  dialogueOverlay.classList.add("active");
  dialogueWrap.classList.add("active");
  typeText(additionalDialogues[currentAdditionalDialogue].text, () => {
    showButtons();
  });
});

// 시간 모름 버튼 토글
timeUnknownBtn.addEventListener("click", function () {
  this.classList.toggle("active");
  if (this.classList.contains("active")) {
    birthTimeSelect.disabled = true;
    birthTimeSelect.value = "";
  } else {
    birthTimeSelect.disabled = false;
  }
});

// 성별 선택
genderBtns.forEach((btn) => {
  btn.addEventListener("click", function () {
    genderBtns.forEach((b) => b.classList.remove("active"));
    this.classList.add("active");
    formState.gender = this.dataset.gender;
    validateForm();
  });
});

// 양력/음력 선택
calendarBtns.forEach((btn) => {
  btn.addEventListener("click", function () {
    calendarBtns.forEach((b) => b.classList.remove("active"));
    this.classList.add("active");
    formState.calendar = this.dataset.calendar;
  });
});

// 생년월일 자동 포맷팅 (19940110 -> 1994-01-10)
birthDateInput.addEventListener("input", function (e) {
  // 숫자만 추출
  let value = this.value.replace(/\D/g, "");

  // 최대 8자리
  if (value.length > 8) {
    value = value.slice(0, 8);
  }

  // 포맷팅: YYYY-MM-DD
  let formatted = "";
  if (value.length > 0) {
    formatted = value.slice(0, 4);
  }
  if (value.length > 4) {
    formatted += "-" + value.slice(4, 6);
  }
  if (value.length > 6) {
    formatted += "-" + value.slice(6, 8);
  }

  this.value = formatted;
  validateForm();
});

userNameInput.addEventListener("input", validateForm);

// 폼 유효성 검사
function validateForm() {
  // YYYY-MM-DD 형식 체크 (8자리 숫자)
  const dateValue = birthDateInput.value.replace(/\D/g, "");
  const isValidDate = dateValue.length === 8;
  const isValid = userNameInput.value.trim() && formState.gender && isValidDate;
  inputNextBtn.disabled = !isValid;
}

// 연애 상태 선택
statusBtns.forEach((btn) => {
  btn.addEventListener("click", function () {
    statusBtns.forEach((b) => b.classList.remove("active"));
    this.classList.add("active");
    formState.status = this.dataset.status;
    validateAdditionalForm();
  });
});

// 고민 입력 이벤트
const userConcernInput = document.getElementById("userConcern");
userConcernInput.addEventListener("input", validateAdditionalForm);

// 추가 정보 폼 유효성 검사
function validateAdditionalForm() {
  const hasStatus = formState.status;
  const hasConcern = userConcernInput.value.trim().length > 0;
  submitBtn.disabled = !(hasStatus && hasConcern);
}

// 로딩 표시
function showLoading() {
  analyzeOverlay.classList.add("active");
}

function hideLoading() {
  analyzeOverlay.classList.remove("active");
}

// 에러 표시
function showError(message) {
  hideLoading();
  alert(message);
}

// 사주 분석 API 호출
async function analyzeSaju(inputData) {
  const payload = {
    gender: inputData.gender,
    date: inputData.date,
    time: inputData.time,
    timezone: "Asia/Seoul",
    calendar: inputData.calendar,
  };

  const res = await fetch(SAJU_API_COMPUTE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

// 제출
submitBtn.addEventListener("click", async function () {
  if (submitBtn.disabled) return;

  const inputData = {
    userName: userNameInput.value.trim(),
    gender: formState.gender,
    date: birthDateInput.value,
    calendar: formState.calendar,
    time: birthTimeSelect.value || null,
    userConcern: userConcernInput?.value || null,
    status: formState.status || null,
  };

  // 추가 입력 폼 닫고 로딩 표시
  additionalInputOverlay.classList.remove("active");
  showLoading();

  try {
    // 1. 사주 계산 API 호출
    const sajuResult = await analyzeSaju(inputData);
    console.log("사주 계산 결과:", sajuResult);

    // 2. IndexedDB에 저장
    const doc = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      input: inputData,
      sajuData: sajuResult,
      loveAnalysis: null, // 연애 분석 결과는 나중에 저장
    };

    await saveResultToDB(doc);
    console.log("DB 저장 완료:", doc.id);

    // 3. 결과 페이지로 이동
    location.href = `/saju-love/saju-detail/?id=${encodeURIComponent(doc.id)}`;
  } catch (err) {
    console.error("분석 실패:", err);
    showError("분석 중 오류가 발생했습니다. 다시 시도해주세요.");
  }
});
