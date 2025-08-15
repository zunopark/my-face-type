/** Cloudtype API Base (끝에 슬래시 X) */
const API_BASE =
  "https://port-0-momzzi-fastapi-m7ynssht4601229b.sel4.cloudtype.app";
const API_COMPUTE = API_BASE + "/saju/compute";
const HEALTH = API_BASE + "/health";

const $ = (s, p = document) => p.querySelector(s);
function setLoading(on) {
  $("#submitBtn").disabled = on;
  $("#loading").classList.toggle("hidden", !on);
}
function showError(msg) {
  const box = $("#errorBox");
  box.textContent = msg || "요청 처리 중 오류가 발생했습니다.";
  box.classList.remove("hidden");
}
function clearError() {
  $("#errorBox").classList.add("hidden");
}

function formatKoreanDate(iso) {
  const [y, m, d] = (iso || "").split("-");
  if (!y || !m || !d) return iso || "";
  return `${y}년 ${m}월 ${d}일`;
}

function makeTag(item) {
  if (!item) return "—";
  const color = item.color || "#444";
  // 흰 글씨/검정 글씨 가독성: 단순 임계치
  const whiteText = ["#ff6a6a", "#6aa7ff", "#2aa86c", "#caa46a"].includes(color)
    ? "white"
    : "white";
  return `<div class="tag" style="background:${color};color:${whiteText}">
            <div class="han" style="font-size:22px">${item.char}</div>
            <span class="ko">${item.korean}</span>
          </div>`;
}

function feBars(fe) {
  const wrap = $("#feBars");
  wrap.innerHTML = "";
  ["wood", "fire", "earth", "metal", "water"].forEach((k) => {
    const v = fe?.percent?.[k] ?? 0;
    const bar = document.createElement("div");
    bar.className = "bar";
    bar.dataset.el = k;
    bar.innerHTML = `<div style="height:${v}%"></div><div class="label">${k.toUpperCase()} ${v}%</div>`;
    wrap.appendChild(bar);
  });
  $("#feLabel").textContent = fe
    ? `신강도: ${fe.strength} (score=${fe.strengthScore})`
    : "";
}

function cell(id, html) {
  $(id).innerHTML = html || "—";
}
function textOrDash(v) {
  return v || "—";
}

function renderTable(p) {
  // 십성(천간 기준)
  cell("#tgStem_hour", textOrDash(p.hour?.tenGodStem));
  cell("#tgStem_day", textOrDash(p.day?.tenGodStem));
  cell("#tgStem_month", textOrDash(p.month?.tenGodStem));
  cell("#tgStem_year", textOrDash(p.year?.tenGodStem));

  // 천간: 오행 색 + 한자/한글
  cell("#stem_hour", makeTag(p.hour?.stem));
  cell("#stem_day", makeTag(p.day?.stem));
  cell("#stem_month", makeTag(p.month?.stem));
  cell("#stem_year", makeTag(p.year?.stem));

  // 지지: 오행 색 + 한자/한글
  cell("#branch_hour", makeTag(p.hour?.branch));
  cell("#branch_day", makeTag(p.day?.branch));
  cell("#branch_month", makeTag(p.month?.branch));
  cell("#branch_year", makeTag(p.year?.branch));

  // 십성(지장간 주간 기준)
  cell("#tgBranch_hour", textOrDash(p.hour?.tenGodBranchMain));
  cell("#tgBranch_day", textOrDash(p.day?.tenGodBranchMain));
  cell("#tgBranch_month", textOrDash(p.month?.tenGodBranchMain));
  cell("#tgBranch_year", textOrDash(p.year?.tenGodBranchMain));
}

$("#sajuForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();
  setLoading(true);
  const fd = new FormData(e.target);
  const payload = {
    name: fd.get("name") || null,
    gender: fd.get("gender") || "male",
    date: fd.get("date"),
    time: fd.get("time") || null,
    calendar: fd.get("calendar"),
    timezone: "Asia/Seoul",
  };

  try {
    const res = await fetch(API_COMPUTE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`(${res.status}) ${t || "Server error"}`);
    }
    const data = await res.json();

    // 헤더
    const hourLabel = data.pillars.hour?.branch?.char
      ? `${data.pillars.hour.branch.char}시`
      : data.input.time
      ? "시주"
      : "";
    $("#cardTitle").textContent = `${data.input.name || "사용자"} 님의 사주`;
    $("#cardSubtitle").textContent = `${formatKoreanDate(
      data.input.date
    )} ${hourLabel}`.trim();

    // 표
    renderTable(data.pillars);

    // 오행/대운/공지
    feBars(data.fiveElements);
    $("#luckLine").textContent = `대운 방향: ${data.luck?.direction || "-"}`;
    $("#notice").textContent = data.notice || "";

    $("#result").classList.remove("hidden");
  } catch (err) {
    console.error(err);
    showError(`요청 실패: ${err.message}`);
  } finally {
    setLoading(false);
  }
});

// 헬스 체크(선택)
(async function () {
  try {
    await fetch(HEALTH);
  } catch (_) {}
})();
