// 오행 색상
export const elementColors: Record<string, string> = {
  木: "#2aa86c",
  wood: "#2aa86c",
  Wood: "#2aa86c",
  火: "#ff6a6a",
  fire: "#ff6a6a",
  Fire: "#ff6a6a",
  土: "#caa46a",
  earth: "#caa46a",
  Earth: "#caa46a",
  金: "#9a9a9a",
  metal: "#9a9a9a",
  Metal: "#9a9a9a",
  水: "#6aa7ff",
  water: "#6aa7ff",
  Water: "#6aa7ff",
};

export const getColor = (element?: string): string => {
  if (!element) return "#333";
  return elementColors[element] || elementColors[element.toLowerCase()] || "#333";
};

// 천간 -> 오행 매핑
export const STEM_ELEMENT: Record<string, string> = {
  甲: "wood", 乙: "wood", 丙: "fire", 丁: "fire", 戊: "earth",
  己: "earth", 庚: "metal", 辛: "metal", 壬: "water", 癸: "water",
};

// 지지 -> 오행 매핑
export const BRANCH_ELEMENT: Record<string, string> = {
  子: "water", 丑: "earth", 寅: "wood", 卯: "wood", 辰: "earth", 巳: "fire",
  午: "fire", 未: "earth", 申: "metal", 酉: "metal", 戌: "earth", 亥: "water",
};

// 지지 -> 한글 매핑
export const BRANCH_KOREAN: Record<string, string> = {
  子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사",
  午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해",
};

// 천간 -> 한글 매핑
export const STEM_KOREAN: Record<string, string> = {
  甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무",
  己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계",
};

export const getStemElement = (stem: string): string => STEM_ELEMENT[stem] || "";
export const getBranchElement = (branch: string): string => BRANCH_ELEMENT[branch] || "";
export const getBranchKorean = (branch: string): string => BRANCH_KOREAN[branch] || branch;
export const getStemKorean = (stem: string): string => STEM_KOREAN[stem] || stem;

// 오행 한글 변환 함수 (음양 포함)
export const getElementKorean = (element: string | undefined, yinYang?: string): string => {
  if (!element) return "";
  const el = element.toLowerCase();
  const sign = yinYang?.toLowerCase() === "yang" ? "+" : "-";
  if (el === "fire" || element === "火") return `${sign}화`;
  if (el === "wood" || element === "木") return `${sign}목`;
  if (el === "water" || element === "水") return `${sign}수`;
  if (el === "metal" || element === "金") return `${sign}금`;
  if (el === "earth" || element === "土") return `${sign}토`;
  return "";
};

// HTML 이스케이프
export function escapeHTML(str: string): string {
  const escapeMap: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return str.replace(/[&<>"']/g, (m) => escapeMap[m]);
}

// 커스텀 인용구 설정
export interface BlockquoteConfig {
  name: string;        // e.g. "까치도령" or "색동낭자"
  pinchImg?: string;   // profile image for 콕 찍기
  sokdakImg?: string;  // profile image for 속닥속닥
  todakImg?: string;   // profile image for 토닥토닥
}

// 마크다운 파서
export function simpleMD(src: string = "", blockquoteConfig?: BlockquoteConfig): string {
  src = src.replace(
    /```([\s\S]*?)```/g,
    (_, c) => `<pre><code>${escapeHTML(c)}</code></pre>`
  );
  src = src.replace(/`([^`]+?)`/g, (_, c) => `<code>${escapeHTML(c)}</code>`);
  src = src
    .replace(/^###### (.*$)/gim, "<h6>$1</h6>")
    .replace(/^##### (.*$)/gim, "<h5>$1</h5>")
    .replace(/^#### (.*$)/gim, "<h4>$1</h4>")
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>");
  src = src
    .replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/___([^_]+)___/g, "<strong><em>$1</em></strong>")
    .replace(
      /^(\s*)\*\*([^*]+)\*\*$/gm,
      '$1<strong class="section-heading">$2</strong>'
    )
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>");
  src = src
    .replace(/!\[([^\]]*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">')
    .replace(
      /\[([^\]]+?)\]\((.*?)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>'
    )
    .replace(
      /^(\s*)\[([^\]]+)\]$/gm,
      '$1<strong class="section-heading">$2</strong>'
    );
  src = src.replace(/(?:^|\n)((?:\|[^\n]+\|\n)+)/g, (match, tableBlock) => {
    const rows = tableBlock.trim().split("\n");
    if (rows.length < 2) return match;
    let html = '<table class="md-table">';
    rows.forEach((row: string, idx: number) => {
      if (/^\|[\s\-:|]+\|$/.test(row.trim()) && row.includes("-")) return;
      const cells = row
        .split("|")
        .filter(
          (_: string, i: number, arr: string[]) => i > 0 && i < arr.length - 1
        );
      const tag = idx === 0 ? "th" : "td";
      html += "<tr>";
      cells.forEach((cell: string) => {
        html += `<${tag}>${cell.trim()}</${tag}>`;
      });
      html += "</tr>";
    });
    html += "</table>";
    return html;
  });
  src = src.replace(/^\s*(\*\s*\*\s*\*|-{3,}|_{3,})\s*$/gm, "<hr>");
  src = src.replace(/(^>\s?.*$\n?)+/gm, (match) => {
    const content = match
      .split("\n")
      .map((line) => line.replace(/^>\s?/, "").trim())
      .filter((line) => line)
      .join("<br>");
    return `<blockquote>${content}</blockquote>`;
  });
  // 캐릭터별 커스텀 인용구
  if (blockquoteConfig) {
    const { name, pinchImg, sokdakImg, todakImg } = blockquoteConfig;
    const imgTag = (img?: string) =>
      img ? `<img src="${img}" class="quote-profile" alt="${name}">` : "";
    src = src.replace(
      new RegExp(`<blockquote><strong>${name} 콕 찍기<\\/strong>`, "g"),
      `<blockquote class="quote-pinch"><div class="quote-header">${imgTag(pinchImg)}<strong>${name} 콕 찍기</strong></div>`
    );
    src = src.replace(
      new RegExp(`<blockquote><strong>${name} 속닥속닥<\\/strong>`, "g"),
      `<blockquote class="quote-sokdak"><div class="quote-header">${imgTag(sokdakImg)}<strong>${name} 속닥속닥</strong></div>`
    );
    src = src.replace(
      new RegExp(`<blockquote><strong>${name} 토닥토닥<\\/strong>`, "g"),
      `<blockquote class="quote-todak"><div class="quote-header">${imgTag(todakImg)}<strong>${name} 토닥토닥</strong></div>`
    );
  }
  src = src
    .replace(/^\s*[*+-]\s+(.+)$/gm, "<ul><li>$1</li></ul>")
    .replace(/(<\/ul>\s*)<ul>/g, "")
    .replace(/^\s*\d+\.\s+(.+)$/gm, "<ul><li>$1</li></ul>")
    .replace(/(<\/ul>\s*)<ul>/g, "");
  src = src
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>")
    .replace(/(?<!_)_([^_\n]+)_(?!_)/g, "<em>$1</em>");
  src = src.replace(/~~(.+?)~~/g, "<del>$1</del>");
  src = src.replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br>");
  // 블록 요소 앞뒤의 불필요한 <br> 제거
  src = src
    .replace(/<br>\s*(<h[1-6]|<ul|<ol|<table|<blockquote|<hr|<pre)/g, "$1")
    .replace(/(<\/h[1-6]>|<\/ul>|<\/ol>|<\/table>|<\/blockquote>|<hr>|<\/pre>)\s*<br>/g, "$1")
    .replace(/<p>\s*<\/p>/g, "")
    .replace(/<p>\s*(<h[1-6]|<ul|<ol|<table|<blockquote|<hr|<pre)/g, "$1")
    .replace(/(<\/h[1-6]>|<\/ul>|<\/ol>|<\/table>|<\/blockquote>|<hr>|<\/pre>)\s*<\/p>/g, "$1");
  return `<p>${src}</p>`;
}
