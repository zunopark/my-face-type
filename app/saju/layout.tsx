import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "정통 종합 사주 - AI 사주 분석",
  description:
    "운학선인이 풀어드리는 정통 사주팔자! 사주원국, 오행분석, 십성, 대운 흐름까지 AI가 상세하게 풀어드립니다.",
  keywords: [
    "정통 사주",
    "사주팔자",
    "AI 사주",
    "종합 사주",
    "운학선인",
    "사주 분석",
    "대운",
    "오행",
    "양반가",
  ],
  openGraph: {
    title: "정통 종합 사주 - AI 사주 분석 | 양반가",
    description:
      "운학선인이 풀어드리는 정통 사주팔자! 사주원국, 오행분석, 십성, 대운 흐름까지 AI가 상세하게 풀어드립니다.",
    images: [
      {
        url: "https://i.ibb.co/pVwxWdq/gvv.png",
        width: 1200,
        height: 630,
        alt: "양반가 - 정통 종합 사주",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "정통 종합 사주 - AI 사주 분석 | 양반가",
    description:
      "운학선인이 풀어드리는 정통 사주팔자! 사주원국, 오행분석, 십성, 대운 흐름까지 AI가 상세하게 풀어드립니다.",
  },
};

export default function SajuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
