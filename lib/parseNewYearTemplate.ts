/**
 * 신년 사주 AI 응답 템플릿 파서
 *
 * 템플릿 형식:
 * [섹션명]
 * 키: 값
 * 키2: 값2
 *
 * [다른섹션]
 * ...
 */

// 파싱된 섹션 데이터 타입
export interface ParsedSection {
  name: string;
  content: string; // 원본 텍스트 (키: 값 형태가 아닌 경우)
  data: Record<string, string>; // 키-값 쌍
}

// 전체 파싱 결과 타입
export interface ParsedTemplate {
  sections: Record<string, ParsedSection>;
  raw: string;
}

// 챕터별 파싱 결과
export interface ParsedChapter {
  number: number;
  title: string;
  sections: Record<string, ParsedSection>;
  rawContent: string;
}

/**
 * 템플릿 텍스트에서 섹션들을 파싱
 */
export function parseTemplateSections(text: string): Record<string, ParsedSection> {
  const sections: Record<string, ParsedSection> = {};

  // [섹션명] 패턴으로 분리
  const sectionRegex = /\[([^\]]+)\]/g;
  const matches = [...text.matchAll(sectionRegex)];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const sectionName = match[1].trim();
    const startIndex = match.index! + match[0].length;
    const endIndex = matches[i + 1]?.index ?? text.length;
    const sectionContent = text.slice(startIndex, endIndex).trim();

    // 키: 값 패턴 파싱
    const data: Record<string, string> = {};
    const lines = sectionContent.split("\n");
    let contentLines: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // 키: 값 패턴 확인
      const colonIndex = trimmedLine.indexOf(":");
      if (colonIndex > 0 && colonIndex < 30) {
        // 키가 30자 이내인 경우만 키-값으로 처리
        const key = trimmedLine.slice(0, colonIndex).trim();
        const value = trimmedLine.slice(colonIndex + 1).trim();
        // 키에 특수문자가 없고 공백이 2개 이하인 경우만 키-값으로 인식
        if (!/[#*\[\]]/.test(key) && (key.match(/ /g) || []).length <= 2) {
          data[key] = value;
          continue;
        }
      }
      contentLines.push(trimmedLine);
    }

    sections[sectionName] = {
      name: sectionName,
      content: contentLines.join("\n"),
      data,
    };
  }

  return sections;
}

/**
 * 챕터별로 섹션 파싱
 */
export function parseChapterSections(chapterContent: string): Record<string, ParsedSection> {
  return parseTemplateSections(chapterContent);
}

/**
 * 전체 응답에서 특정 섹션 값 가져오기
 */
export function getSectionValue(
  sections: Record<string, ParsedSection>,
  sectionName: string,
  key: string,
  defaultValue = ""
): string {
  return sections[sectionName]?.data[key] ?? defaultValue;
}

/**
 * 전체 응답에서 특정 섹션의 모든 데이터 가져오기
 */
export function getSectionData(
  sections: Record<string, ParsedSection>,
  sectionName: string
): Record<string, string> {
  return sections[sectionName]?.data ?? {};
}

/**
 * 숫자 값 파싱 (점수 등)
 */
export function parseScore(value: string, defaultValue = 0): number {
  const num = parseInt(value, 10);
  return isNaN(num) ? defaultValue : Math.min(5, Math.max(1, num));
}

/**
 * 1장 총운 데이터 타입
 */
export interface Chapter1Data {
  // 미리보기
  preview: string;

  // 길흉 등급
  grade: string;
  gradeKorean: string;

  // 축하 메시지
  congratsTitle: string;
  congratsSubtitle: string;
  congratsDescription: string;

  // 영역별 점수
  scores: {
    wealth: number;
    love: number;
    career: number;
    study: number;
    health: number;
  };

  // 키워드
  keywords: string[];

  // 총운
  mainFeature: string;
  overallFlow: string;

  // 분기별 흐름
  quarterly: {
    first: string;
    mid: string;
    last: string;
  };

  // 위기
  crises: Array<{
    title: string;
    timing: string;
    content: string;
    solution: string;
  }>;

  // 기회
  opportunities: Array<{
    title: string;
    timing: string;
    content: string;
    maximize: string;
  }>;
}

/**
 * 1장 총운 파싱
 */
export function parseChapter1(content: string): Chapter1Data {
  const sections = parseTemplateSections(content);

  // 기본값
  const result: Chapter1Data = {
    preview: getSectionValue(sections, "총운_미리보기", "") || sections["총운_미리보기"]?.content || "",
    grade: getSectionValue(sections, "길흉_등급", "등급", "中吉"),
    gradeKorean: getSectionValue(sections, "길흉_등급", "등급_한글", "중길"),
    congratsTitle: getSectionValue(sections, "축하_메시지", "제목", ""),
    congratsSubtitle: getSectionValue(sections, "축하_메시지", "부제", ""),
    congratsDescription: getSectionValue(sections, "축하_메시지", "설명", ""),
    scores: {
      wealth: parseScore(getSectionValue(sections, "영역별_점수", "재물운"), 3),
      love: parseScore(getSectionValue(sections, "영역별_점수", "연애운"), 3),
      career: parseScore(getSectionValue(sections, "영역별_점수", "직장명예운"), 3),
      study: parseScore(getSectionValue(sections, "영역별_점수", "학업계약운"), 3),
      health: parseScore(getSectionValue(sections, "영역별_점수", "건강운"), 3),
    },
    keywords: [
      getSectionValue(sections, "키워드", "키워드1", ""),
      getSectionValue(sections, "키워드", "키워드2", ""),
      getSectionValue(sections, "키워드", "키워드3", ""),
    ].filter(Boolean),
    mainFeature: getSectionValue(sections, "나의_2026년_총운", "주요_특징", ""),
    overallFlow: getSectionValue(sections, "나의_2026년_총운", "전반적_흐름", ""),
    quarterly: {
      first: getSectionValue(sections, "분기별_흐름", "상반기", ""),
      mid: getSectionValue(sections, "분기별_흐름", "중반기", ""),
      last: getSectionValue(sections, "분기별_흐름", "하반기", ""),
    },
    crises: [],
    opportunities: [],
  };

  // 위기 파싱
  const crisisData = getSectionData(sections, "위기");
  for (let i = 1; i <= 3; i++) {
    const title = crisisData[`위기${i}_제목`];
    if (title) {
      result.crises.push({
        title,
        timing: crisisData[`위기${i}_시기`] || "",
        content: crisisData[`위기${i}_내용`] || "",
        solution: crisisData[`위기${i}_대처법`] || "",
      });
    }
  }

  // 기회 파싱
  const opportunityData = getSectionData(sections, "기회");
  for (let i = 1; i <= 3; i++) {
    const title = opportunityData[`기회${i}_제목`];
    if (title) {
      result.opportunities.push({
        title,
        timing: opportunityData[`기회${i}_시기`] || "",
        content: opportunityData[`기회${i}_내용`] || "",
        maximize: opportunityData[`기회${i}_극대화`] || "",
      });
    }
  }

  return result;
}

/**
 * 2장 재물운 데이터 타입
 */
export interface Chapter2Data {
  summary: string;
  flow: string;
  events: Array<{ keyword: string; content: string }>;
  moneyMethods: {
    recommended: string;
    job: { rating: string; advice: string };
    investment: { rating: string; advice: string };
    sideBusiness: { rating: string; advice: string };
    business: { rating: string; advice: string };
  };
  monthlyFortune: {
    risingMonths: string;
    risingAdvice: string;
    cautionMonths: string;
    cautionAdvice: string;
  };
  benefactor: {
    appearance: string;
    job: string;
    place: string;
  };
  villain: {
    appearance: string;
    trait: string;
    situation: string;
  };
  advice: {
    incomeFlow: string;
    increaseMethod: string;
    expenseReason: string;
    preventMethod: string;
  };
}

/**
 * 2장 재물운 파싱
 */
export function parseChapter2(content: string): Chapter2Data {
  const sections = parseTemplateSections(content);

  const result: Chapter2Data = {
    summary: sections["재물운_한줄요약"]?.content || "",
    flow: sections["재물운_흐름"]?.content || "",
    events: [],
    moneyMethods: {
      recommended: getSectionValue(sections, "돈버는_방식", "추천_방식", ""),
      job: {
        rating: getSectionValue(sections, "돈버는_방식", "직장_적합도", ""),
        advice: getSectionValue(sections, "돈버는_방식", "직장_조언", ""),
      },
      investment: {
        rating: getSectionValue(sections, "돈버는_방식", "투자_적합도", ""),
        advice: getSectionValue(sections, "돈버는_방식", "투자_조언", ""),
      },
      sideBusiness: {
        rating: getSectionValue(sections, "돈버는_방식", "부업_적합도", ""),
        advice: getSectionValue(sections, "돈버는_방식", "부업_조언", ""),
      },
      business: {
        rating: getSectionValue(sections, "돈버는_방식", "사업_적합도", ""),
        advice: getSectionValue(sections, "돈버는_방식", "사업_조언", ""),
      },
    },
    monthlyFortune: {
      risingMonths: getSectionValue(sections, "월별_재물운", "상승기_월", ""),
      risingAdvice: getSectionValue(sections, "월별_재물운", "상승기_조언", ""),
      cautionMonths: getSectionValue(sections, "월별_재물운", "주의기_월", ""),
      cautionAdvice: getSectionValue(sections, "월별_재물운", "주의기_조언", ""),
    },
    benefactor: {
      appearance: getSectionValue(sections, "재물_귀인", "외모_특징", ""),
      job: getSectionValue(sections, "재물_귀인", "직업_특징", ""),
      place: getSectionValue(sections, "재물_귀인", "만나는_장소", ""),
    },
    villain: {
      appearance: getSectionValue(sections, "재물_악인", "외모_특징", ""),
      trait: getSectionValue(sections, "재물_악인", "특징", ""),
      situation: getSectionValue(sections, "재물_악인", "상황", ""),
    },
    advice: {
      incomeFlow: getSectionValue(sections, "재물운_조언", "수입_흐름", ""),
      increaseMethod: getSectionValue(sections, "재물운_조언", "수입_늘리는법", ""),
      expenseReason: getSectionValue(sections, "재물운_조언", "지출_새는이유", ""),
      preventMethod: getSectionValue(sections, "재물운_조언", "지출_막는법", ""),
    },
  };

  // 사건 파싱
  const eventData = getSectionData(sections, "재물_사건");
  for (let i = 1; i <= 5; i++) {
    const keyword = eventData[`사건${i}_키워드`];
    if (keyword) {
      result.events.push({
        keyword,
        content: eventData[`사건${i}_내용`] || "",
      });
    }
  }

  return result;
}

/**
 * 8장 월별 운세 데이터 타입
 */
export interface Chapter8Data {
  bestMonth: { month: string; reason: string };
  cautionMonth: { month: string; reason: string };
  monthly: Array<{
    month: number;
    keyword: string;
    sentence: string;
    opportunity: string;
    crisis: string;
  }>;
  forbiddenDays: string[];
}

/**
 * 8장 월별 운세 파싱
 */
export function parseChapter8(content: string): Chapter8Data {
  const sections = parseTemplateSections(content);

  const result: Chapter8Data = {
    bestMonth: {
      month: getSectionValue(sections, "최고의_달", "월", ""),
      reason: getSectionValue(sections, "최고의_달", "이유", ""),
    },
    cautionMonth: {
      month: getSectionValue(sections, "조심할_달", "월", ""),
      reason: getSectionValue(sections, "조심할_달", "이유", ""),
    },
    monthly: [],
    forbiddenDays: [],
  };

  // 월별 운세 파싱
  const monthlyData = getSectionData(sections, "월별_운세");
  const monthlyChanceData = getSectionData(sections, "월별_기회위기");

  for (let i = 1; i <= 12; i++) {
    result.monthly.push({
      month: i,
      keyword: monthlyData[`${i}월_키워드`] || "",
      sentence: monthlyData[`${i}월_한문장`] || "",
      opportunity: monthlyChanceData[`${i}월_기회`] || "",
      crisis: monthlyChanceData[`${i}월_위기`] || "",
    });
  }

  // 금기일 파싱
  const forbiddenData = getSectionData(sections, "금기일");
  for (let i = 1; i <= 5; i++) {
    const day = forbiddenData[`금기일${i}`];
    if (day) {
      result.forbiddenDays.push(day);
    }
  }

  return result;
}

/**
 * 10장 개운법 데이터 타입
 */
export interface Chapter10Data {
  doList: string[];
  dontList: string[];
  luckyItems: {
    color: string;
    number: string;
    direction: string;
    food: string;
  };
}

/**
 * 10장 개운법 파싱
 */
export function parseChapter10(content: string): Chapter10Data {
  const sections = parseTemplateSections(content);

  const result: Chapter10Data = {
    doList: [],
    dontList: [],
    luckyItems: {
      color: getSectionValue(sections, "행운_아이템", "행운_색상", ""),
      number: getSectionValue(sections, "행운_아이템", "행운_숫자", ""),
      direction: getSectionValue(sections, "행운_아이템", "행운_방위", ""),
      food: getSectionValue(sections, "행운_아이템", "행운_음식", ""),
    },
  };

  // Do 리스트 파싱
  const doData = getSectionData(sections, "Do_리스트");
  for (let i = 1; i <= 10; i++) {
    const item = doData[`do${i}`];
    if (item) {
      result.doList.push(item);
    }
  }

  // Don't 리스트 파싱
  const dontData = getSectionData(sections, "Dont_리스트");
  for (let i = 1; i <= 10; i++) {
    const item = dontData[`dont${i}`];
    if (item) {
      result.dontList.push(item);
    }
  }

  return result;
}

/**
 * 11장 까치도령 귀띔 데이터 타입
 */
export interface Chapter11Data {
  topic: string;
  customAdvice: string;
  specialMessage: string;
}

/**
 * 11장 까치도령 귀띔 파싱
 */
export function parseChapter11(content: string): Chapter11Data {
  const sections = parseTemplateSections(content);

  return {
    topic: getSectionValue(sections, "까치도령_귀띔", "고민_주제", ""),
    customAdvice: getSectionValue(sections, "까치도령_귀띔", "맞춤_조언", ""),
    specialMessage: getSectionValue(sections, "까치도령_귀띔", "특별_메시지", ""),
  };
}

/**
 * 전체 템플릿에서 챕터 번호로 콘텐츠 추출
 */
export function extractChapterContent(fullText: string, chapterNumber: number): string {
  // [N장] 패턴으로 챕터 시작 찾기
  const chapterRegex = new RegExp(`\\[${chapterNumber}장\\]([\\s\\S]*?)(?=\\[\\d+장\\]|$)`, "g");
  const match = chapterRegex.exec(fullText);

  if (match) {
    return match[1].trim();
  }

  // ## [N장] 형식도 시도
  const altRegex = new RegExp(`##\\s*\\[${chapterNumber}장\\]([\\s\\S]*?)(?=##\\s*\\[\\d+장\\]|$)`, "g");
  const altMatch = altRegex.exec(fullText);

  return altMatch ? altMatch[1].trim() : "";
}

/**
 * 전체 템플릿 텍스트 파싱
 */
export function parseFullTemplate(fullText: string): {
  chapter1?: Chapter1Data;
  chapter2?: Chapter2Data;
  chapter8?: Chapter8Data;
  chapter10?: Chapter10Data;
  chapter11?: Chapter11Data;
  allSections: Record<string, ParsedSection>;
} {
  const allSections = parseTemplateSections(fullText);

  // 각 챕터 콘텐츠 추출 및 파싱
  const ch1Content = extractChapterContent(fullText, 1);
  const ch2Content = extractChapterContent(fullText, 2);
  const ch8Content = extractChapterContent(fullText, 8);
  const ch10Content = extractChapterContent(fullText, 10);
  const ch11Content = extractChapterContent(fullText, 11);

  return {
    chapter1: ch1Content ? parseChapter1(ch1Content) : undefined,
    chapter2: ch2Content ? parseChapter2(ch2Content) : undefined,
    chapter8: ch8Content ? parseChapter8(ch8Content) : undefined,
    chapter10: ch10Content ? parseChapter10(ch10Content) : undefined,
    chapter11: ch11Content ? parseChapter11(ch11Content) : undefined,
    allSections,
  };
}
