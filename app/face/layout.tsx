import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "관상 테스트 - AI 관상 분석",
  description:
    "관상 테스트로 내 얼굴을 분석해보세요! 사진 한 장이면 AI가 성격, 연애운, 재물운, 직업운까지 풀어드립니다.",
  keywords: [
    "관상 테스트",
    "관상",
    "AI 관상",
    "관상 보기",
    "얼굴 분석",
    "연애운",
    "재물운",
    "직업운",
    "양반가",
  ],
  openGraph: {
    title: "관상 테스트 - AI 관상 분석 | 양반가",
    description:
      "관상 테스트로 내 얼굴을 분석해보세요! 사진 한 장이면 AI가 성격, 연애운, 재물운, 직업운까지 풀어드립니다.",
    images: [
      {
        url: "https://i.ibb.co/pVwxWdq/gvv.png",
        width: 1200,
        height: 630,
        alt: "양반가 - 관상 테스트",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "관상 테스트 - AI 관상 분석 | 양반가",
    description:
      "관상 테스트로 내 얼굴을 분석해보세요! 사진 한 장이면 AI가 성격, 연애운, 재물운, 직업운까지 풀어드립니다.",
  },
};

export default function FaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
