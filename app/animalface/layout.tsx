import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "동물상 테스트 - AI 동물상 분석",
  description:
    "나와 닮은 동물은? AI가 얼굴을 분석해 강아지상, 고양이상, 토끼상, 여우상 등 나의 동물상을 알려드립니다. 무료!",
  keywords: [
    "동물상 테스트",
    "동물상",
    "AI 동물상",
    "강아지상",
    "고양이상",
    "토끼상",
    "여우상",
    "양반가",
  ],
  openGraph: {
    title: "동물상 테스트 - AI 동물상 분석 | 양반가",
    description:
      "나와 닮은 동물은? AI가 얼굴을 분석해 강아지상, 고양이상, 토끼상, 여우상 등 나의 동물상을 알려드립니다. 무료!",
    images: [
      {
        url: "https://i.ibb.co/pVwxWdq/gvv.png",
        width: 1200,
        height: 630,
        alt: "양반가 - 동물상 테스트",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "동물상 테스트 - AI 동물상 분석 | 양반가",
    description:
      "나와 닮은 동물은? AI가 얼굴을 분석해 강아지상, 고양이상, 토끼상, 여우상 등 나의 동물상을 알려드립니다. 무료!",
  },
};

export default function AnimalfaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
