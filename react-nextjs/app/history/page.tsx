"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Navigation from "@/components/layout/Navigation";

interface HistoryItem {
  id: string;
  category: "face" | "saju" | "couple";
  img?: string;
  img1?: string;
  img2?: string;
  label: string;
  sub: string;
  ts: string;
  link: string;
  userName?: string;
  dayMaster?: string;
}

const FACE_TYPE_LABEL: Record<string, string> = {
  base: "프리미엄 관상 심층 분석",
  wealth: "재물 관상 분석",
  marriage: "결혼 관상 분석",
  love: "연애 관상 분석",
  career: "직업 관상 분석",
};

const FACE_TYPES = ["base", "wealth", "marriage", "love", "career"];

function openDB(name: string, version: number): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(name, version);
      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains("results")) {
          db.createObjectStore("results", { keyPath: "id" });
        }
      };
      req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function getAllFromDB(db: IDBDatabase | null): Promise<unknown[]> {
  if (!db) return Promise.resolve([]);
  return new Promise((resolve) => {
    try {
      const tx = db.transaction("results", "readonly");
      const store = tx.objectStore("results");
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      const collectedItems: HistoryItem[] = [];

      // localStorage에서 관상 결과 가져오기
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("face_result_")) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || "");
            collectedItems.push({
              id: data.id,
              category: "face",
              img: data.imageBase64,
              label: "관상 분석",
              sub: "AI 관상 분석",
              ts: data.timestamp,
              link: `/face/result?id=${data.id}`,
            });
          } catch {
            // ignore
          }
        }
      }

      // IndexedDB에서 결제된 결과 가져오기
      try {
        const [faceDB, sajuDB, coupleDB] = await Promise.all([
          openDB("FaceAnalysisDB", 1),
          openDB("SajuLoveDB", 2),
          openDB("CoupleAnalysisDB", 1),
        ]);

        const faceResults = (await getAllFromDB(faceDB)) as Array<{
          id: string;
          imageBase64: string;
          timestamp: string;
          reports?: Record<string, { paid?: boolean; purchasedAt?: string }>;
        }>;

        faceResults.forEach((rec) => {
          if (!rec.reports) return;
          FACE_TYPES.forEach((t) => {
            const rep = rec.reports?.[t];
            if (rep && rep.paid) {
              collectedItems.push({
                id: rec.id,
                category: "face",
                img: rec.imageBase64,
                label: FACE_TYPE_LABEL[t] || "관상 분석",
                sub: "관상 분석",
                ts: rep.purchasedAt || rec.timestamp,
                link: `/base-report/?id=${rec.id}`,
              });
            }
          });
        });

        const sajuResults = (await getAllFromDB(sajuDB)) as Array<{
          id: string;
          paid?: boolean;
          paidAt?: string;
          createdAt?: string;
          input?: { userName?: string; date?: string };
          sajuData?: { dayMaster?: { char?: string } };
        }>;

        sajuResults.forEach((rec) => {
          if (rec.paid) {
            collectedItems.push({
              id: rec.id,
              category: "saju",
              userName: rec.input?.userName || "사용자",
              dayMaster: rec.sajuData?.dayMaster?.char || "?",
              label: `${rec.input?.userName || "사용자"}님의 연애 사주`,
              sub: rec.input?.date || "",
              ts: rec.paidAt || rec.createdAt || new Date().toISOString(),
              link: `/saju-love/saju-result/?id=${rec.id}`,
            });
          }
        });

        const coupleResults = (await getAllFromDB(coupleDB)) as Array<{
          id: string;
          image1Base64?: string;
          image2Base64?: string;
          timestamp: string;
          reports?: { couple?: { paid?: boolean; purchasedAt?: string } };
        }>;

        coupleResults.forEach((rec) => {
          if (rec.reports?.couple?.paid) {
            collectedItems.push({
              id: rec.id,
              category: "couple",
              img1: rec.image1Base64,
              img2: rec.image2Base64,
              label: "궁합 분석",
              sub: "AI 궁합 리포트",
              ts: rec.reports.couple.purchasedAt || rec.timestamp,
              link: `/couple-report/?id=${rec.id}`,
            });
          }
        });
      } catch (error) {
        console.error("IndexedDB 로드 오류:", error);
      }

      collectedItems.sort(
        (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()
      );

      setItems(collectedItems);
      setIsLoading(false);
    }

    loadHistory();
  }, []);

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("ko-KR", {
      month: "numeric",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-stone-100 pb-16">
      <Header activePage="history" />

      <main className="max-w-md mx-auto px-4 py-6">
        <div className="mb-4">
          <h1 className="text-lg font-bold text-gray-900">
            결제 내역 <span className="text-gray-400">({items.length}개)</span>
          </h1>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--fortune-gold)]" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">
              결제한 분석 결과가 아직 없습니다.
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-[var(--fortune-gold)] text-white rounded-xl font-medium"
            >
              AI 관상 보러 가기
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <Link
                key={`${item.category}-${item.id}-${item.ts}`}
                href={item.link}
                className="flex items-center gap-3 bg-white rounded-xl p-4 shadow-sm"
              >
                {item.category === "face" && item.img && (
                  <Image
                    src={item.img}
                    alt=""
                    width={56}
                    height={56}
                    className="w-14 h-14 rounded-lg object-cover"
                    unoptimized
                  />
                )}

                {item.category === "saju" && (
                  <div className="w-14 h-14 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-xl font-bold text-red-500">
                    {item.dayMaster}
                  </div>
                )}

                {item.category === "couple" && (
                  <div className="flex -space-x-3">
                    {item.img1 && (
                      <Image
                        src={item.img1}
                        alt=""
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover border-2 border-white"
                        unoptimized
                      />
                    )}
                    {item.img2 && (
                      <Image
                        src={item.img2}
                        alt=""
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover border-2 border-white"
                        unoptimized
                      />
                    )}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">
                    {item.label}
                  </div>
                  <div className="text-xs text-gray-500">{item.sub}</div>
                </div>

                <span className="text-xs text-gray-400 flex-shrink-0">
                  {formatDate(item.ts)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>

      <Footer />
      <Navigation />
    </div>
  );
}
