// NewYearDB IndexedDB 유틸리티

const DB_NAME = "NewYearDB";
const DB_VERSION = 1;
const STORE_NAME = "results";

// 신년 사주 입력 데이터 타입
export interface NewYearInput {
  userName: string;
  gender: string;
  date: string;
  calendar: "solar" | "lunar";
  time: string | null;
  jobStatus: string; // employee/job_seeker/student/freelancer/business_owner/unemployed
  relationshipStatus: string; // single/some/couple/married
  wish2026: string; // 2026년 고민/소원
}

// 사주 데이터 타입 (간략화)
export interface NewYearSajuData {
  dayMaster: {
    char: string;
    title: string;
    element?: string;
    yinYang?: string;
  };
  pillars: Record<string, unknown>;
  fiveElements?: Record<string, unknown>;
  sinsal?: Record<string, unknown>;
  daeun?: Record<string, unknown>;
  zodiac?: {
    char?: string;
    korean?: string;
    animal?: string;
  };
  yongsin?: {
    yongsin?: { element?: string; korean?: string; hanja?: string };
    heesin?: { element?: string; korean?: string; hanja?: string };
    gisin?: { element?: string; korean?: string; hanja?: string };
    gusin?: { element?: string; korean?: string; hanja?: string };
    hansin?: { element?: string; korean?: string; hanja?: string };
    method?: string;
    reason?: string;
  };
}

// 분석 결과 타입
export interface NewYearAnalysis {
  user_name?: string; // meta에서 가져옴
  full_text?: string; // AI 전체 응답
  chapters: Array<{
    number: number;
    title: string;
    content: string;
  }>;
  chapter_count?: number;
}

// 부적 이미지 타입
export interface TalismanImage {
  success: boolean;
  image_base64?: string;
  error?: string;
}

// 신년 사주 레코드 타입
export interface NewYearRecord {
  id: string;
  createdAt: string;
  input: NewYearInput;
  rawSajuData?: Record<string, unknown>;
  sajuData: NewYearSajuData;
  analysis: NewYearAnalysis | null;
  talismanImage?: TalismanImage | null;
  isAnalyzing?: boolean;
  analysisStartedAt?: string;
  // 결제 관련 필드
  paid?: boolean;
  paidAt?: string;
  seenIntro?: boolean;
  paymentInfo?: {
    method: "toss" | "coupon";
    price: number;
    couponCode?: string;
    isDiscount?: boolean;
  };
}

// DB 열기
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

// 레코드 저장
export async function saveNewYearRecord(record: NewYearRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(record);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// 레코드 조회
export async function getNewYearRecord(
  id: string
): Promise<NewYearRecord | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

// 레코드 업데이트
export async function updateNewYearRecord(
  id: string,
  updates: Partial<NewYearRecord>
): Promise<void> {
  const existing = await getNewYearRecord(id);
  if (!existing) {
    throw new Error("Record not found");
  }
  const updated = { ...existing, ...updates };
  await saveNewYearRecord(updated);
}

// 모든 레코드 조회
export async function getAllNewYearRecords(): Promise<NewYearRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

// 레코드 삭제
export async function deleteNewYearRecord(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// 결제 완료 처리
export async function markNewYearPaid(
  id: string,
  paymentInfo?: {
    method: "toss" | "coupon";
    price: number;
    couponCode?: string;
    isDiscount?: boolean;
  }
): Promise<void> {
  await updateNewYearRecord(id, {
    paid: true,
    paidAt: new Date().toISOString(),
    paymentInfo,
  });
}
