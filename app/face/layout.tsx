import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "관상 테스트 | 관상가 양반 | AI 관상",
  description: "AI가 분석하는 나의 관상! 얼굴 사진 한 장으로 성격, 연애운, 재물운, 직업운까지 상세하게 분석해드립니다.",
  keywords: ["관상 테스트", "AI 관상", "관상가 양반", "얼굴 분석", "성격 분석", "연애운", "재물운"],
  openGraph: {
    title: "관상 테스트 | 관상가 양반 | AI 관상",
    description: "AI가 분석하는 나의 관상! 얼굴 사진 한 장으로 성격, 연애운, 재물운, 직업운까지 상세하게 분석해드립니다.",
    images: [
      {
        url: "https://i.ibb.co/nPD5mmK/face.png",
        width: 1200,
        height: 630,
        alt: "양반家 관상 테스트",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "관상 테스트 | 관상가 양반 | AI 관상",
    description: "AI가 분석하는 나의 관상! 얼굴 사진 한 장으로 성격, 연애운, 재물운, 직업운까지 상세하게 분석해드립니다.",
  },
};

export default function FaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
