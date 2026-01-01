// SajuLoveDB IndexedDB 유틸리티

const DB_NAME = "SajuLoveDB";
const DB_VERSION = 2;
const STORE_NAME = "results";

// 사주 API 전체 응답 타입 (rawSajuData로 저장)
export interface RawSajuData {
  input?: {
    name?: string;
    gender?: string;
    genderKor?: string;
    solar?: string;
    solarTime?: string | null;
    lunar?: string;
    isLunar?: boolean;
    hasTime?: boolean;
    place?: string | null;
  };
  dayMaster?: {
    char?: string;
    korean?: string;
    element?: string;
    elementHanja?: string;
    yinYang?: string;
    yinYangKor?: string;
    title?: string;
  };
  pillars?: Record<string, {
    ganZhi?: string;
    ganZhiKor?: string;
    stem?: { char?: string; korean?: string; element?: string; yinYang?: string } | null;
    branch?: { char?: string; korean?: string; element?: string; yinYang?: string; mainHiddenStem?: string } | null;
    tenGodStem?: string;
    tenGodBranch?: string;
    tenGodBranchMain?: string;
    twelveStage?: string;
    twelveSinsal?: string;
    jijanggan?: unknown;
    naYin?: string;
    naYinKor?: string;
  }>;
  pillarsRaw?: Record<string, { stem?: string; branch?: string }>;
  zodiac?: {
    char?: string;
    korean?: string;
    animal?: string;
    animalKor?: string;
  };
  fiveElements?: {
    strength?: string;
    strengthLevel?: string;
    level?: string;
    score?: number;
    score560?: number;
    maxScore560?: number;
    percent?: Record<string, number>;
    percentHanja?: Record<string, number>;
    deukryung?: boolean;
    deukji?: boolean;
    deukse?: boolean;
    details560?: unknown;
    [key: string]: unknown;
  };
  sinsal?: {
    [key: string]: unknown;
    _active?: string[];
    _activeCount?: number;
    _byPillar?: Record<string, { stem: string[]; branch: string[] }>;
  };
  daeun?: {
    direction?: string;
    startYear?: number;
    startMonth?: number;
    startDay?: number;
    list?: Array<{
      ganZhi?: string;
      ganZhiKor?: string;
      startAge?: number;
      endAge?: number;
      tenGodStem?: string;
      tenGodBranch?: string;
      twelveStage?: string;
    }>;
  };
  luckCycles?: {
    daeun?: unknown[];
    saeun?: unknown[];
    woleun?: unknown[];
  };
  currentSaeun?: Array<{
    year?: number;
    age?: number;
    ganZhi?: string;
    ganZhiKor?: string;
    tenGodStem?: string;
    tenGodBranch?: string;
    twelveStage?: string;
  }>;
  currentSoun?: unknown[];
  jieQi?: {
    current?: string;
    prev?: string;
    next?: string;
  };
  tianShen?: {
    day?: {
      name?: string;
      nameKor?: string;
      type?: string;
      typeKor?: string;
    };
    time?: {
      name?: string;
      nameKor?: string;
      type?: string;
      typeKor?: string;
    };
  };
  jiShen?: {
    dayJiShen?: Array<{ name?: string; nameKor?: string }>;
    dayYi?: string[];
    dayJi?: string[];
    timeJiShen?: Array<{ name?: string; nameKor?: string }>;
    timeYi?: string[];
    timeJi?: string[];
  };
  xiongSha?: {
    dayXiongSha?: Array<{ name?: string; nameKor?: string }>;
    timeXiongSha?: Array<{ name?: string; nameKor?: string }>;
  };
  nobleDirection?: Record<string, {
    name?: string;
    direction?: string;
    directionDesc?: string;
  }>;
  jiuXing?: Record<string, {
    name?: string;
    nameKor?: string;
  }>;
  xiu28?: {
    xiu?: string;
    xiuKor?: string;
    gong?: string;
    gongKor?: string;
    luck?: string;
    luckKor?: string;
    animal?: string;
    animalKor?: string;
  };
  jianZhi?: {
    name?: string;
    nameKor?: string;
    type?: string;
  };
  chong?: {
    dayChong?: {
      branch?: string;
      branchKor?: string;
      zodiac?: string;
      zodiacKor?: string;
    };
    timeChong?: {
      branch?: string;
      branchKor?: string;
      zodiac?: string;
      zodiacKor?: string;
    };
  };
  gong?: {
    taiYuan?: { name?: string; ganZhi?: string };
    mingGong?: { name?: string; ganZhi?: string };
    shenGong?: { name?: string; ganZhi?: string };
  };
  pengZu?: {
    stem?: string;
    branch?: string;
  };
  loveFacts?: {
    hourKnown?: boolean;
    peachBlossom?: { hasPeach?: boolean; positions?: string[] };
    spouseStars?: { hitCount?: number; positions?: string[]; targetStars?: string[] };
    spouseTargetType?: string;
    dayMasterStrength?: string;
    fiveElementsHanjaPercent?: Record<string, number>;
    [key: string]: unknown;
  };
  // 납음 (추가 데이터)
  nayin?: Record<string, string>;
  // 태원/명궁/신궁 (result에서 직접 접근용)
  taiYuan?: { name?: string; ganZhi?: string };
  mingGong?: { name?: string; ganZhi?: string };
  shenGong?: { name?: string; ganZhi?: string };
}

export interface SajuLoveRecord {
  id: string;
  createdAt: string;
  paidAt?: string;
  paid: boolean;
  // 인트로 로딩 본 여부
  seenIntro?: boolean;
  // 분석 중 상태 (중복 API 호출 방지)
  isAnalyzing?: boolean;
  analysisStartedAt?: string;
  // 결제 정보
  paymentInfo?: {
    method: "toss" | "coupon";
    price: number;
    couponCode?: string;
    isDiscount?: boolean;
  };
  input: {
    userName: string;
    gender: string;
    date: string;
    calendar: string;
    time: string | null;
    userConcern: string;
    status: string;
  };
  // 전체 사주 API 응답 데이터 (원본 그대로 저장)
  rawSajuData?: RawSajuData;
  // 기존 sajuData 필드 (하위 호환성 유지)
  sajuData: {
    dayMaster: {
      char: string;
      title: string;
      element?: string;
      yinYang?: string;
    };
    pillars: Record<string, {
      stem: { char: string; korean?: string; element?: string; yinYang?: string } | null;
      branch: { char: string; korean?: string; element?: string; yinYang?: string; mainHiddenStem?: string } | null;
      tenGodStem?: string;
      tenGodBranchMain?: string;
      jijanggan?: string | { chars?: string[]; display?: string; displayKorean?: string; detail?: unknown[] } | null;  // 지장간
      twelveStage?: string;  // 12운성 (API 필드명)
      twelveUnsung?: string;  // 12운성 (별칭)
      twelveSinsal?: string;  // 12신살
      gilsung?: string[];  // 길성 목록
    }>;
    fiveElements?: {
      strength?: string;
      strengthLevel?: string;
      percent?: Record<string, number>;
    } | null;
    loveFacts?: {
      peachBlossom?: { hasPeach?: boolean; positions?: string[] };
      spouseStars?: { hitCount?: number; positions?: string[] };
      spouseTargetType?: string;
      dayMasterStrength?: string;
      fiveElementsHanjaPercent?: Record<string, number>;
    } | null;
    sinsal?: {
      [key: string]: unknown;
      _active?: string[];
      _activeCount?: number;
      _byPillar?: Record<string, { stem: string[]; branch: string[] }>;
      도화살?: { has?: boolean; found?: unknown[] };
      홍염살?: { has?: boolean; found?: string[] };
      화개살?: { has?: boolean; found?: unknown[] };
      천을귀인?: { has?: boolean; found?: string[] };
      역마살?: { has?: boolean; found?: unknown[]; hasSimple?: boolean };
      양인살?: { has?: boolean; target?: string };
      괴강살?: { has?: boolean };
      공망?: { has?: boolean; found?: string[] };
      원진살?: { has?: boolean; found?: string[] };
      귀문관살?: { has?: boolean; found?: string[] };
      백호살?: { has?: boolean };
      천덕귀인?: { has?: boolean; target?: string };
      월덕귀인?: { has?: boolean; target?: string };
      태극귀인?: { has?: boolean; found?: string[] };
      문창귀인?: { has?: boolean; target?: string };
      천의성?: { has?: boolean; target?: string };
      현침살?: { has?: boolean; found?: string[] };
      고란살?: { has?: boolean };
      과숙살?: { has?: boolean; target?: string; forGender?: string };
      고신살?: { has?: boolean; target?: string; forGender?: string };
    } | null;
    // 추가 데이터 (rawSajuData에서 가져온 것들을 직접 접근 가능하도록)
    daeun?: RawSajuData["daeun"];
    zodiac?: RawSajuData["zodiac"];
    taiYuan?: { name?: string; ganZhi?: string };
    mingGong?: { name?: string; ganZhi?: string };
    shenGong?: { name?: string; ganZhi?: string };
    nayin?: Record<string, string>;
    luckCycles?: RawSajuData["luckCycles"];
    currentSaeun?: RawSajuData["currentSaeun"];
    jieQi?: RawSajuData["jieQi"];
    tianShen?: RawSajuData["tianShen"];
    jiShen?: RawSajuData["jiShen"];
    xiongSha?: RawSajuData["xiongSha"];
    nobleDirection?: RawSajuData["nobleDirection"];
    jiuXing?: RawSajuData["jiuXing"];
    xiu28?: RawSajuData["xiu28"];
    jianZhi?: RawSajuData["jianZhi"];
    chong?: RawSajuData["chong"];
    pengZu?: RawSajuData["pengZu"];
  };
  loveAnalysis?: {
    user_name: string;
    chapters: { number: number; title: string; content: string }[];
    ideal_partner_image?: { image_base64: string; image_url?: string; prompt?: string };
    avoid_type_image?: { image_base64: string; image_url?: string; prompt?: string };
  } | null;
}

function openDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      resolve(null);
      return;
    }

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = () => {
        console.error("SajuLoveDB open error");
        resolve(null);
      };
    } catch (err) {
      console.error("SajuLoveDB open exception:", err);
      resolve(null);
    }
  });
}

export async function saveSajuLoveRecord(record: SajuLoveRecord): Promise<boolean> {
  const db = await openDB();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(record);

      request.onsuccess = () => resolve(true);
      request.onerror = () => {
        console.error("SajuLoveDB save error");
        resolve(false);
      };
    } catch (err) {
      console.error("SajuLoveDB save exception:", err);
      resolve(false);
    }
  });
}

export async function getSajuLoveRecord(id: string): Promise<SajuLoveRecord | null> {
  const db = await openDB();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => {
        console.error("SajuLoveDB get error");
        resolve(null);
      };
    } catch (err) {
      console.error("SajuLoveDB get exception:", err);
      resolve(null);
    }
  });
}

export async function updateSajuLoveRecord(
  id: string,
  updates: Partial<SajuLoveRecord>
): Promise<boolean> {
  const existing = await getSajuLoveRecord(id);
  if (!existing) return false;

  const updated = { ...existing, ...updates };
  return saveSajuLoveRecord(updated);
}

export async function markSajuLovePaid(
  id: string,
  paymentInfo?: {
    method: "toss" | "coupon";
    price: number;
    couponCode?: string;
    isDiscount?: boolean;
  }
): Promise<boolean> {
  return updateSajuLoveRecord(id, {
    paid: true,
    paidAt: new Date().toISOString(),
    paymentInfo,
  });
}
