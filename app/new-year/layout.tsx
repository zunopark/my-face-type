import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "양반家 - 천기동자 2026 신년 사주 | AI 신년운세",
  description:
    "2026년 병오년 신년 운세! AI가 분석하는 나의 한 해 총운, 재물운, 연애운, 건강운, 직업운까지 상세하게 분석해드립니다.",
  keywords: [
    "신년 운세",
    "2026 운세",
    "병오년",
    "사주",
    "AI 사주",
    "신년 사주",
    "천기동자",
  ],
  openGraph: {
    title: "양반家 - 천기동자 2026 신년 사주 | AI 신년운세",
    description:
      "2026년 병오년 신년 운세! AI가 분석하는 나의 한 해 총운, 재물운, 연애운, 건강운, 직업운까지 상세하게 분석해드립니다.",
    images: [
      {
        url: "https://i.ibb.co/pVwxWdq/gvv.png",
        width: 1200,
        height: 630,
        alt: "양반家 천기동자 - 2026 신년 사주",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "양반家 - 천기동자 2026 신년 사주 | AI 신년운세",
    description:
      "2026년 병오년 신년 운세! AI가 분석하는 나의 한 해 총운, 재물운, 연애운, 건강운, 직업운까지 상세하게 분석해드립니다.",
  },
};

export default function NewYearLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
