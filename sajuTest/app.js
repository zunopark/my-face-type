// ===== API 엔드포인트 =====
// 실제 FastAPI 배포 주소로 바꿔주세요.
const SAJU_API_COMPUTE =
  "https://port-0-momzzi-fastapi-m7ynssht4601229b.sel4.cloudtype.app/saju/compute";

const form = document.getElementById("sajuForm");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");
const resultEmptyEl = document.getElementById("resultEmpty");
const submitBtn = document.getElementById("submitBtn");
const demoBtn = document.getElementById("demoBtn");

// 결과 바인딩 엘리먼트
const dom = {
  name: document.getElementById("r-name"),
  gender: document.getElementById("r-gender"),
  calendar: document.getElementById("r-calendar"),
  date: document.getElementById("r-date"),
  time: document.getElementById("r-time"),
  timezone: document.getElementById("r-timezone"),
  place: document.getElementById("r-place"),

  dmChar: document.getElementById("dm-char"),
  dmTitle: document.getElementById("dm-title"),
  dmElem: document.getElementById("dm-element"),
  dmYY: document.getElementById("dm-yinyang"),

  pillars: document.getElementById("pillars"),
  fiveBars: document.getElementById("five-bars"),
  strength: document.getElementById("r-strength"),
  luckdir: document.getElementById("r-luckdir"),

  fHourKnown: document.getElementById("f-hourKnown"),
  fPeachTarget: document.getElementById("f-peach-target"),
  fPeachPos: document.getElementById("f-peach-positions"),
  fSpouseType: document.getElementById("f-spouse-type"),
  fSpousePos: document.getElementById("f-spouse-positions"),
  fSpouseHit: document.getElementById("f-spouse-hitcount"),
  fSpouseDetail: document.getElementById("f-spouse-detail"),
  raw: document.getElementById("raw-json"),
};

demoBtn.addEventListener("click", () => {
  const today = new Date();
  const yyyy = 1994;
  const mm = "03";
  const dd = "15";
  form.name.value = "데모 사용자";
  form.gender.value = "female";
  form.calendar.value = "solar";
  form.date.value = `${yyyy}-${mm}-${dd}`;
  form.time.value = "06:30";
  form.timezone.value = "Asia/Seoul";
  form.place.value = "서울특별시";
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  statusEl.textContent = "계산 중…";
  submitBtn.disabled = true;

  const payload = {
    name: form.name.value || null,
    gender: form.gender.value,
    date: form.date.value, // YYYY-MM-DD (required)
    time: form.time.value || null, // HH:MM or null
    timezone: form.timezone.value,
    calendar: form.calendar.value, // 'solar' | 'lunar'
    place: form.place.value || null,
  };

  try {
    const res = await fetch(SAJU_API_COMPUTE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderAll(data);
    statusEl.textContent = "완료!";
  } catch (err) {
    console.error(err);
    statusEl.textContent = "에러가 발생했습니다. 콘솔을 확인하세요.";
  } finally {
    submitBtn.disabled = false;
  }
});

function renderAll(data) {
  // 화면 토글
  resultEmptyEl.classList.add("hidden");
  resultEl.classList.remove("hidden");

  // 입력
  dom.name.textContent = data.input?.name ?? "—";
  dom.gender.textContent = data.input?.gender ?? "—";
  dom.calendar.textContent = data.input?.calendar ?? "—";
  dom.date.textContent = data.input?.date ?? "—";
  dom.time.textContent = data.input?.time ?? "(시간 미상)";
  dom.timezone.textContent = data.input?.timezone ?? "—";
  dom.place.textContent = data.input?.place ?? "—";

  // 일간
  dom.dmChar.textContent = data.dayMaster?.char ?? "—";
  dom.dmTitle.textContent = data.dayMaster?.title ?? "—";
  dom.dmElem.textContent = data.dayMaster?.element ?? "—";
  dom.dmYY.textContent = data.dayMaster?.yinYang ?? "—";

  // Pillars
  dom.pillars.innerHTML = "";
  ["year", "month", "day", "hour"].forEach((k) => {
    const p = data.pillars?.[k] || {};
    const stem = p.stem?.char ?? "—";
    const branch = p.branch?.char ?? "—";
    const tgStem = p.tenGodStem ?? "—";
    const tgBranch = p.tenGodBranchMain ?? "—";

    const color = p.stem?.color || "#232a33";
    const el = document.createElement("div");
    el.className = "pillar";
    el.innerHTML = `
      <h4>${labelKo(k)}</h4>
      <div class="badge"><span>간지</span> <strong>${stem}${branch}</strong></div>
      <div class="kv">
        <div><b>천간 십성</b><span>${tgStem}</span></div>
        <div><b>지지 십성(주간)</b><span>${tgBranch}</span></div>
      </div>
    `;
    dom.pillars.appendChild(el);
  });

  // 오행 바(한자 %)
  renderFiveBars(data.fiveElements, data.loveFacts?.fiveElementsHanjaPercent);

  // 신강/신약 + 대운 방향
  dom.strength.textContent = data.fiveElements?.strength ?? "—";
  dom.luckdir.textContent = data.luck?.direction ?? "—";

  // loveFacts
  const lf = data.loveFacts || {};
  const peach = lf.peachBlossom || {};
  const spouse = lf.spouseStars || {};
  dom.fHourKnown.textContent = lf.hourKnown ? "있음" : "없음";
  dom.fPeachTarget.textContent = peach.targetBranch ?? "해당 없음";
  dom.fPeachPos.textContent = arrLabel(peach.positions);
  dom.fSpouseType.textContent = lf.spouseTargetType ?? "—";
  dom.fSpousePos.textContent = arrLabel(spouse.positions);
  dom.fSpouseHit.textContent = spouse.hitCount ?? 0;
  dom.fSpouseDetail.textContent = pretty(spouse.detail || {});

  // Raw JSON
  dom.raw.textContent = pretty(data);
}

function renderFiveBars(five, hanjaPercent) {
  dom.fiveBars.innerHTML = "";
  const order = ["木", "火", "土", "金", "水"];
  const colorMap = {
    木: "#2aa86c",
    火: "#ff6a6a",
    土: "#caa46a",
    金: "#b8bec6",
    水: "#6aa7ff",
  };
  order.forEach((k) => {
    const v = hanjaPercent?.[k] ?? 0;
    const wrap = document.createElement("div");
    wrap.className = "bar";
    const stick = document.createElement("div");
    stick.className = "stick";
    stick.style.height = Math.max(4, Math.round(v)) * 1.1 + "px";
    stick.style.background = colorMap[k] || "#444";
    const label = document.createElement("div");
    label.className = "label";
    label.textContent = `${k} ${v}%`;
    wrap.appendChild(stick);
    wrap.appendChild(label);
    dom.fiveBars.appendChild(wrap);
  });
}

function labelKo(k) {
  return { year: "년주", month: "월주", day: "일주", hour: "시주" }[k] || k;
}
function arrLabel(a) {
  return a && a.length ? a.map(labelKo).join(", ") : "없음";
}
function pretty(o) {
  return JSON.stringify(o, null, 2);
}
