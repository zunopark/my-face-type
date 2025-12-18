// SajuLoveDB IndexedDB 유틸리티

const DB_NAME = "SajuLoveDB";
const DB_VERSION = 2;
const STORE_NAME = "results";

export interface SajuLoveRecord {
  id: string;
  createdAt: string;
  paidAt?: string;
  paid: boolean;
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
  };
  loveAnalysis?: {
    user_name: string;
    chapters: { number: number; title: string; content: string }[];
    ideal_partner_image?: { image_base64: string; prompt?: string };
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
