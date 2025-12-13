// CoupleAnalysisDB IndexedDB 유틸리티

const DB_NAME = "CoupleAnalysisDB";
const DB_VERSION = 1;
const STORE_NAME = "results";

export interface CoupleAnalysisRecord {
  id: string;
  features1: string;
  features2: string;
  image1Base64: string;
  image2Base64: string;
  relationshipType: string;
  relationshipFeeling: string;
  createdAt: string;
  paid?: boolean;
  paidAt?: string;
  report?: unknown | null;
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
        console.error("CoupleAnalysisDB open error");
        resolve(null);
      };
    } catch (err) {
      console.error("CoupleAnalysisDB open exception:", err);
      resolve(null);
    }
  });
}

export async function saveCoupleAnalysisRecord(
  record: CoupleAnalysisRecord
): Promise<boolean> {
  const db = await openDB();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(record);

      request.onsuccess = () => resolve(true);
      request.onerror = () => {
        console.error("CoupleAnalysisDB save error");
        resolve(false);
      };
    } catch (err) {
      console.error("CoupleAnalysisDB save exception:", err);
      resolve(false);
    }
  });
}

export async function getCoupleAnalysisRecord(
  id: string
): Promise<CoupleAnalysisRecord | null> {
  const db = await openDB();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => {
        console.error("CoupleAnalysisDB get error");
        resolve(null);
      };
    } catch (err) {
      console.error("CoupleAnalysisDB get exception:", err);
      resolve(null);
    }
  });
}

export async function updateCoupleAnalysisRecord(
  id: string,
  updates: Partial<CoupleAnalysisRecord>
): Promise<boolean> {
  const existing = await getCoupleAnalysisRecord(id);
  if (!existing) return false;

  const updated = { ...existing, ...updates };
  return saveCoupleAnalysisRecord(updated);
}

export async function markCoupleAnalysisPaid(id: string): Promise<boolean> {
  const existing = await getCoupleAnalysisRecord(id);
  if (!existing) return false;

  const updated: CoupleAnalysisRecord = {
    ...existing,
    paid: true,
    paidAt: new Date().toISOString(),
  };

  return saveCoupleAnalysisRecord(updated);
}
