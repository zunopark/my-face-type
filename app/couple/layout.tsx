import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "양반가 - AI 커플 궁합 관상 | 얼굴로 보는 궁합",
  description:
    "두 사람의 얼굴로 궁합을 봅니다! AI가 분석하는 커플 궁합 관상 — 성격 궁합, 연애 스타일, 속궁합까지 상세하게 알려드립니다.",
  keywords: [
    "궁합",
    "커플 궁합",
    "관상 궁합",
    "AI 궁합",
    "연애 궁합",
    "속궁합",
    "관상가 양반",
  ],
  openGraph: {
    title: "양반가 - AI 커플 궁합 관상 | 얼굴로 보는 궁합",
    description:
      "두 사람의 얼굴로 궁합을 봅니다! AI가 분석하는 커플 궁합 관상 — 성격 궁합, 연애 스타일, 속궁합까지 상세하게 알려드립니다.",
    images: [
      {
        url: "https://i.ibb.co/pVwxWdq/gvv.png",
        width: 1200,
        height: 630,
        alt: "양반가 커플 궁합 관상",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "양반가 - AI 커플 궁합 관상 | 얼굴로 보는 궁합",
    description:
      "두 사람의 얼굴로 궁합을 봅니다! AI가 분석하는 커플 궁합 관상 — 성격 궁합, 연애 스타일, 속궁합까지 상세하게 알려드립니다.",
  },
};

export default function CoupleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
