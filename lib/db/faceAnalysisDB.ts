// FaceAnalysisDB IndexedDB 유틸리티

const DB_NAME = "FaceAnalysisDB";
const DB_VERSION = 1;
const STORE_NAME = "results";

const REPORT_TYPES = ["base", "wealth", "love", "marriage", "career", "health"] as const;
type ReportType = (typeof REPORT_TYPES)[number];

export interface FaceReport {
  paid: boolean;
  data: unknown | null;
  purchasedAt?: string;
}

export interface FaceAnalysisRecord {
  id: string;
  imageBase64: string;
  features: string;
  timestamp: string;
  reports: Record<ReportType, FaceReport>;
  paid?: boolean;
}

function makeReportsSkeleton(): Record<ReportType, FaceReport> {
  const obj: Record<string, FaceReport> = {};
  for (const t of REPORT_TYPES) {
    obj[t] = { paid: false, data: null };
  }
  return obj as Record<ReportType, FaceReport>;
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
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("timestamp", "timestamp", { unique: false });
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = () => {
        console.error("FaceAnalysisDB open error");
        resolve(null);
      };
    } catch (err) {
      console.error("FaceAnalysisDB open exception:", err);
      resolve(null);
    }
  });
}

export async function saveFaceAnalysisRecord(
  record: Omit<FaceAnalysisRecord, "reports"> & { reports?: Record<ReportType, FaceReport> }
): Promise<boolean> {
  const db = await openDB();
  if (!db) return false;

  const fullRecord: FaceAnalysisRecord = {
    ...record,
    reports: record.reports || makeReportsSkeleton(),
  };

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(fullRecord);

      request.onsuccess = () => resolve(true);
      request.onerror = () => {
        console.error("FaceAnalysisDB save error");
        resolve(false);
      };
    } catch (err) {
      console.error("FaceAnalysisDB save exception:", err);
      resolve(false);
    }
  });
}

export async function getFaceAnalysisRecord(id: string): Promise<FaceAnalysisRecord | null> {
  const db = await openDB();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => {
        console.error("FaceAnalysisDB get error");
        resolve(null);
      };
    } catch (err) {
      console.error("FaceAnalysisDB get exception:", err);
      resolve(null);
    }
  });
}

export async function updateFaceAnalysisRecord(
  id: string,
  updates: Partial<FaceAnalysisRecord>
): Promise<boolean> {
  const existing = await getFaceAnalysisRecord(id);
  if (!existing) return false;

  const updated = { ...existing, ...updates };
  return saveFaceAnalysisRecord(updated);
}

export async function markFaceReportPaid(
  id: string,
  reportType: ReportType
): Promise<boolean> {
  const existing = await getFaceAnalysisRecord(id);
  if (!existing) return false;

  const updated: FaceAnalysisRecord = {
    ...existing,
    paid: true,
    reports: {
      ...existing.reports,
      [reportType]: {
        ...existing.reports[reportType],
        paid: true,
        purchasedAt: new Date().toISOString(),
      },
    },
  };

  return saveFaceAnalysisRecord(updated);
}
