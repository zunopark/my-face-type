import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "양반가 - 동물상 테스트 | AI 관상",
  description: "나와 닮은 동물은? AI가 분석하는 동물상 테스트! 강아지상, 고양이상, 토끼상, 여우상 등 나의 동물상을 무료로 확인해보세요.",
  keywords: ["동물상 테스트", "동물상", "AI 동물상", "강아지상", "고양이상", "토끼상", "여우상", "관상"],
  openGraph: {
    title: "양반가 - 동물상 테스트 | AI 관상",
    description: "나와 닮은 동물은? AI가 분석하는 동물상 테스트! 강아지상, 고양이상, 토끼상, 여우상 등 나의 동물상을 무료로 확인해보세요.",
    images: [
      {
        url: "https://i.ibb.co/nPD5mmK/face.png",
        width: 1200,
        height: 630,
        alt: "양반가 동물상 테스트",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "양반가 - 동물상 테스트 | AI 관상",
    description: "나와 닮은 동물은? AI가 분석하는 동물상 테스트! 강아지상, 고양이상, 토끼상, 여우상 등 나의 동물상을 무료로 확인해보세요.",
  },
};

export default function AnimalfaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
