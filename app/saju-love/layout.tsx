import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "연애 사주 - AI 사주 분석",
  description:
    "사주팔자로 보는 나의 연애 운명! 연애 스타일, 이상형, 연애 시기, 결혼운까지 AI가 상세하게 풀어드립니다.",
  keywords: [
    "연애 사주",
    "사주",
    "AI 사주",
    "사주팔자",
    "연애운",
    "결혼운",
    "이상형",
    "양반가",
  ],
  openGraph: {
    title: "연애 사주 - AI 사주 분석 | 양반가",
    description:
      "사주팔자로 보는 나의 연애 운명! 연애 스타일, 이상형, 연애 시기, 결혼운까지 AI가 상세하게 풀어드립니다.",
    images: [
      {
        url: "https://i.ibb.co/pVwxWdq/gvv.png",
        width: 1200,
        height: 630,
        alt: "양반가 - 연애 사주",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "연애 사주 - AI 사주 분석 | 양반가",
    description:
      "사주팔자로 보는 나의 연애 운명! 연애 스타일, 이상형, 연애 시기, 결혼운까지 AI가 상세하게 풀어드립니다.",
  },
};

export default function SajuLoveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
