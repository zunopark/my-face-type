export interface ChapterConfig {
  intro: string;
  outro: string;
  introBg: string;
  reportBg: string;
  outroBg: string;
}

export const getChapterConfig = (
  userName: string
): Record<string, ChapterConfig> => ({
  chapter1: {
    intro: `1장에서는 ${userName}님이 가진 매력과\n연애 스타일을 알려드릴게요!`,
    outro: `어떠세요, ${userName}님의 매력이 보이시나요?\n이제 미래의 연애 운을 살펴볼게요!`,
    introBg: "/saju-love/img/nangja-5.jpg",
    reportBg: "/saju-love/img/nangja-7.jpg",
    outroBg: "/saju-love/img/nangja-8.jpg",
  },
  chapter2: {
    intro: `2장에서는 앞으로 펼쳐질\n${userName}님의 연애 운세를 알려드릴게요.`,
    outro: "운세의 흐름을 파악했으니,\n이제 운명의 상대에 대해 얘기해볼까요?",
    introBg: "/saju-love/img/nangja-9.jpg",
    reportBg: "/saju-love/img/nangja-10.jpg",
    outroBg: "/saju-love/img/nangja-11.jpg",
  },
  chapter3: {
    intro: `3장에서는 ${userName}님이 만나게 될\n운명의 상대에 대해 알려드릴게요.`,
    outro: "이제 조심해야 할 가짜 인연에\n대해 이야기해드릴게요.",
    introBg: "/saju-love/img/nangja-11.jpg",
    reportBg: "/saju-love/img/nangja-11.jpg",
    outroBg: "/saju-love/img/nangja-11.jpg",
  },
  chapter4: {
    intro: "4장에서는 운명이라 착각할 수 있는\n가짜 인연에 대해 알려드릴게요.",
    outro: "근데 피해야 할 사람,\n어떻게 생겼는지 궁금하지 않으세요?",
    introBg: "/saju-love/img/nangja-18.jpg",
    reportBg: "/saju-love/img/nangja-18.jpg",
    outroBg: "/saju-love/img/nangja-19.jpg",
  },
  chapter5: {
    intro: "5장에서는 누구에게도 말 못할,\n속궁합에 대해 알려드릴게요.",
    outro: `마지막으로 제가 ${userName}님께\n전해드릴 귀띔이 있어요.`,
    introBg: "/saju-love/img/nangja-21.jpg",
    reportBg: "/saju-love/img/nangja-22.jpg",
    outroBg: "/saju-love/img/nangja-23.jpg",
  },
  chapter6: {
    intro: `${userName}님의 고민에 제가 답변드릴게요.`,
    outro: "",
    introBg: "/saju-love/img/nangja-24.jpg",
    reportBg: "/saju-love/img/nangja-25.jpg",
    outroBg: "/saju-love/img/nangja-25.jpg",
  },
});

export const CHAPTER_TITLES = [
  "나의 매력과 연애 성향",
  "앞으로의 사랑의 흐름",
  "운명의 상대",
  "가짜 인연",
  "19금 사주 풀이",
  "색동낭자의 귀띔",
];

export const sajuLovePlayerConfig = {
  characterName: "색동낭자",
  homeRoute: "/saju-love",
  defaultBgImage: "/saju-love/img/nangja-1.jpg",
} as const;
