import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "양반가 - 색동낭자 연애 사주 | 프리미엄 AI 사주",
  description:
    "AI가 분석하는 나의 연애 사주! 사주팔자로 보는 연애 스타일, 이상형, 연애 시기, 결혼운까지 상세하게 분석해드립니다.",
  keywords: [
    "연애 사주",
    "사주",
    "AI 사주",
    "연애운",
    "결혼운",
    "사주팔자",
    "궁합",
    "색동낭자",
  ],
  openGraph: {
    title: "양반가 - 색동낭자 연애 사주 | 프리미엄 AI 사주",
    description:
      "AI가 분석하는 나의 연애 사주! 사주팔자로 보는 연애 스타일, 이상형, 연애 시기, 결혼운까지 상세하게 분석해드립니다.",
    images: [
      {
        url: "https://i.ibb.co/pVwxWdq/gvv.png",
        width: 1200,
        height: 630,
        alt: "양반가 색동낭자 - 연애 사주",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "양반가 - 색동낭자 연애 사주 | 프리미엄 AI 사주",
    description:
      "AI가 분석하는 나의 연애 사주! 사주팔자로 보는 연애 스타일, 이상형, 연애 시기, 결혼운까지 상세하게 분석해드립니다.",
  },
};

export default function SajuLoveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
