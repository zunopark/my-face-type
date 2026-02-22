import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "2026 신년 운세 - AI 사주 분석",
  description:
    "2026년 나의 한 해는? AI가 총운, 재물운, 연애운, 건강운, 직업운까지 11가지 운세를 상세하게 풀어드립니다.",
  keywords: [
    "신년 운세",
    "2026 운세",
    "신년 사주",
    "AI 운세",
    "사주",
    "총운",
    "운세 보기",
    "양반가",
  ],
  openGraph: {
    title: "2026 신년 운세 - AI 사주 분석 | 양반가",
    description:
      "2026년 나의 한 해는? AI가 총운, 재물운, 연애운, 건강운, 직업운까지 11가지 운세를 상세하게 풀어드립니다.",
    images: [
      {
        url: "https://i.ibb.co/pVwxWdq/gvv.png",
        width: 1200,
        height: 630,
        alt: "양반가 - 2026 신년 운세",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "2026 신년 운세 - AI 사주 분석 | 양반가",
    description:
      "2026년 나의 한 해는? AI가 총운, 재물운, 연애운, 건강운, 직업운까지 11가지 운세를 상세하게 풀어드립니다.",
  },
};

export default function NewYearLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
