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
    intro: `1장에서는 ${userName}님의 사주원국을 펼쳐\n타고난 기운과 팔자의 뜻을 풀어드리겠네.`,
    outro: `어떠신가, ${userName}님의 팔자가 보이시는가?\n이제 그대의 본색을 살펴보겠네.`,
    introBg: "/saju/img/unhak-6.jpg",
    reportBg: "/saju/img/unhak-7.jpg",
    outroBg: "/saju/img/unhak-8.jpg",
  },
  chapter2: {
    intro: `2장에서는 ${userName}님의 일간 기질과\n오행의 과다·결핍을 살펴보겠네.`,
    outro: "그대의 본색이 드러났으니,\n이제 숨겨진 기운을 찾아보겠네.",
    introBg: "/saju/img/unhak-9.jpg",
    reportBg: "/saju/img/unhak-10.jpg",
    outroBg: "/saju/img/unhak-11.jpg",
  },
  chapter3: {
    intro: `3장에서는 ${userName}님 사주 속에 숨은\n십성, 십이운성, 신살을 풀어드리겠네.`,
    outro: "숨은 기운을 살펴보았으니,\n이제 여덟 글자의 역학관계를 보겠네.",
    introBg: "/saju/img/unhak-12.jpg",
    reportBg: "/saju/img/unhak-13.jpg",
    outroBg: "/saju/img/unhak-14.jpg",
  },
  chapter4: {
    intro: "4장에서는 천간과 지지 사이의\n합·충·극·형·파·해를 살펴보겠네.",
    outro: "역학관계를 살폈으니,\n이제 대운의 큰 물결을 보여드리겠네.",
    introBg: "/saju/img/unhak-15.jpg",
    reportBg: "/saju/img/unhak-16.jpg",
    outroBg: "/saju/img/unhak-17.jpg",
  },
  chapter5: {
    intro: `5장에서는 ${userName}님의 대운 전체 흐름과\n현재 위치를 짚어드리겠네.`,
    outro: `마지막으로 이 늙은이가 ${userName}님께\n당부의 말씀을 전하겠네.`,
    introBg: "/saju/img/unhak-18.jpg",
    reportBg: "/saju/img/unhak-19.jpg",
    outroBg: "/saju/img/unhak-20.jpg",
  },
  chapter6: {
    intro: `${userName}님, 마지막으로 용신에 기반한\n조언과 인생 키워드를 전하겠네.`,
    outro: "",
    introBg: "/saju/img/unhak-21.jpg",
    reportBg: "/saju/img/unhak-22.jpg",
    outroBg: "/saju/img/unhak-23.jpg",
  },
});

export const CHAPTER_TITLES = [
  "사주팔자를 펼치다",
  "그대의 본색",
  "사주 속 숨은 기운",
  "여덟 글자의 역학관계",
  "대운의 물결",
  "운학선인의 당부",
];

export const sajuPlayerConfig = {
  characterName: "운학선인",
  homeRoute: "/saju",
  defaultBgImage: "/saju/img/unhak-1.jpg",
} as const;
