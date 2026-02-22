import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "궁합 테스트 - AI 궁합 관상",
  description:
    "두 사람의 얼굴로 보는 궁합 테스트! AI가 성격 궁합, 연애 스타일, 속궁합까지 분석해드립니다.",
  keywords: [
    "궁합",
    "궁합 테스트",
    "커플 궁합",
    "관상 궁합",
    "AI 궁합",
    "속궁합",
    "양반가",
  ],
  openGraph: {
    title: "궁합 테스트 - AI 궁합 관상 | 양반가",
    description:
      "두 사람의 얼굴로 보는 궁합 테스트! AI가 성격 궁합, 연애 스타일, 속궁합까지 분석해드립니다.",
    images: [
      {
        url: "https://i.ibb.co/pVwxWdq/gvv.png",
        width: 1200,
        height: 630,
        alt: "양반가 - 궁합 테스트",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "궁합 테스트 - AI 궁합 관상 | 양반가",
    description:
      "두 사람의 얼굴로 보는 궁합 테스트! AI가 성격 궁합, 연애 스타일, 속궁합까지 분석해드립니다.",
  },
};

export default function CoupleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
