"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Footer from "@/components/layout/Footer";

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
                link: `/face/result?id=${rec.id}`,
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
              link: `/saju-love/result?id=${rec.id}`,
            });
          }
        });

        const coupleResults = (await getAllFromDB(coupleDB)) as Array<{
          id: string;
          image1Base64?: string;
          image2Base64?: string;
          createdAt?: string;
          paid?: boolean;
          paidAt?: string;
        }>;

        coupleResults.forEach((rec) => {
          if (rec.paid) {
            collectedItems.push({
              id: rec.id,
              category: "couple",
              img1: rec.image1Base64,
              img2: rec.image2Base64,
              label: "궁합 관상 분석",
              sub: "AI 커플 궁합 리포트",
              ts: rec.paidAt || rec.createdAt || new Date().toISOString(),
              link: `/couple/result?id=${rec.id}`,
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
    <div className="landing-container" style={{ paddingTop: "60px" }}>
      {/* 헤더 */}
      <header style={{
        position: "fixed",
        top: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: "500px",
        background: "#f8f7f1",
        zIndex: 999,
        borderBottom: "1px solid #e5e0d5"
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          padding: "16px 20px",
          gap: "6px"
        }}>
          <span style={{ fontFamily: "KimjungchulMyungjo-Bold, serif", fontSize: "20px", color: "#171717" }}>家</span>
          <span style={{ fontFamily: "KimjungchulMyungjo-Bold, serif", fontSize: "18px", fontWeight: 700, color: "#171717" }}>양반家</span>
        </div>
      </header>

      {/* 콘텐츠 */}
      <div style={{ padding: "0 16px", marginTop: "20px", width: "100%", maxWidth: "500px", boxSizing: "border-box" }}>
        <div style={{
          fontSize: "14px",
          color: "#6b6560",
          marginBottom: "16px"
        }}>
          결제 내역 <span style={{ color: "#9a9590" }}>({items.length}개)</span>
        </div>

        {isLoading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{
              width: "32px",
              height: "32px",
              border: "3px solid #e5e0d5",
              borderTopColor: "#c4965a",
              borderRadius: "50%",
              margin: "0 auto",
              animation: "spin 1s linear infinite"
            }} />
          </div>
        ) : items.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "60px 20px",
            background: "#fff",
            borderRadius: "12px",
            border: "1px solid #e5e0d5"
          }}>
            <p style={{ color: "#6b6560", marginBottom: "20px" }}>결제한 분석 결과가 아직 없습니다.</p>
            <Link href="/" style={{
              display: "inline-block",
              padding: "12px 24px",
              background: "linear-gradient(135deg, #d4a017 0%, #b8860b 100%)",
              color: "#fff",
              borderRadius: "8px",
              fontWeight: 600,
              textDecoration: "none"
            }}>
              AI 관상 보러 가기
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {items.map((item) => (
              <Link
                key={`${item.category}-${item.id}-${item.ts}`}
                href={item.link}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  padding: "16px",
                  background: "#fff",
                  borderRadius: "12px",
                  border: "1px solid #e5e0d5",
                  textDecoration: "none",
                  transition: "all 0.2s ease"
                }}
              >
                {/* 이미지 영역 */}
                {item.category === "face" && item.img && (
                  <div style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "10px",
                    overflow: "hidden",
                    flexShrink: 0
                  }}>
                    <Image
                      src={item.img}
                      alt=""
                      width={52}
                      height={52}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      unoptimized
                    />
                  </div>
                )}

                {item.category === "saju" && (
                  <div style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #fff5f5, #ffe8e8)",
                    border: "1px solid #ffd4d4",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "22px",
                    fontWeight: "bold",
                    color: "#c44",
                    flexShrink: 0,
                    fontFamily: "KimjungchulMyungjo-Bold, serif"
                  }}>
                    {item.dayMaster}
                  </div>
                )}

                {item.category === "couple" && (
                  <div style={{ display: "flex", flexShrink: 0 }}>
                    {item.img1 && (
                      <div style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "50%",
                        overflow: "hidden",
                        border: "2px solid #fff",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                        marginRight: "-12px",
                        position: "relative",
                        zIndex: 2
                      }}>
                        <Image
                          src={item.img1}
                          alt=""
                          width={44}
                          height={44}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          unoptimized
                        />
                      </div>
                    )}
                    {item.img2 && (
                      <div style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "50%",
                        overflow: "hidden",
                        border: "2px solid #fff",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                      }}>
                        <Image
                          src={item.img2}
                          alt=""
                          width={44}
                          height={44}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          unoptimized
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* 텍스트 영역 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: "15px",
                    fontWeight: 600,
                    color: "#171717",
                    marginBottom: "4px"
                  }}>{item.label}</div>
                  <div style={{
                    fontSize: "13px",
                    color: "#8b8680",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}>{item.sub}</div>
                </div>

                {/* 날짜 */}
                <div style={{
                  fontSize: "12px",
                  color: "#9a9590",
                  flexShrink: 0
                }}>{formatDate(item.ts)}</div>

                {/* 화살표 */}
                <span className="material-icons" style={{ color: "#ccc", fontSize: "18px" }}>
                  chevron_right
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <Footer />

      {/* 하단 네비게이션 */}
      <nav className="nav_wrap">
        <Link href="/" className="nav_content">
          <span className="material-icons nav_icon">home</span>
          <div className="nav_title">전체 보기</div>
        </Link>
        <Link href="/history/" className="nav_content nav_seleted">
          <span className="material-icons nav_icon">person</span>
          <div className="nav_title">지난 보고서</div>
        </Link>
      </nav>
    </div>
  );
}
