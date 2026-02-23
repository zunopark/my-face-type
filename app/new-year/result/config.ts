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
    intro: `자, 그럼 ${userName}님의 2026년!\n어떤 한 해가 될지 같이 살펴볼까요?`,
    outro: `어때요, 올해 느낌이 좀 오시나요?\n저는 ${userName}님의 2026년이 정말 기대돼요!\n\n그럼 이제 돈 얘기 좀 해볼까요?`,
    introBg: "/new-year/img/doryung4.jpg",
    reportBg: "/new-year/img/doryung.jpg",
    outroBg: "/new-year/img/doryung4.jpg",
  },
  chapter2: {
    intro: `다들 제일 궁금해하는 재물운이에요!\n${userName}님 올해 돈복은 어떨까요~?`,
    outro: `돈은 들어올 때 잘 잡고,\n나갈 때는 꼭 필요한 곳에만!\n\n자, 이번엔 건강 얘기 해볼게요.\n건강해야 돈도 쓰죠, 그쵸?`,
    introBg: "/new-year/img/doryung5.jpg",
    reportBg: "/new-year/img/doryung5.jpg",
    outroBg: "/new-year/img/doryung4.jpg",
  },
  chapter3: {
    intro: `이번엔 건강운이에요.\n뭐니뭐니해도 건강이 최고잖아요!`,
    outro: `몸이 보내는 신호, 무시하지 마세요~\n아프면 다 소용없어요!\n\n그럼 이제 두근두근 연애운 볼까요?`,
    introBg: "/new-year/img/doryung9.jpg",
    reportBg: "/new-year/img/doryung9.jpg",
    outroBg: "/new-year/img/doryung8.jpg",
  },
  chapter4: {
    intro: `연애운 시간이에요~\n${userName}님 올해 사랑운은 어떨까요?`,
    outro: `사랑도 타이밍이더라고요.\n좋은 사람 만나면 망설이지 마세요!\n\n다음은 직장운이에요. 일도 중요하니까요!`,
    introBg: "/new-year/img/doryung8.jpg",
    reportBg: "/new-year/img/doryung8.jpg",
    outroBg: "/new-year/img/doryung4.jpg",
  },
  chapter5: {
    intro: `직장운과 명예운이에요.\n올해 ${userName}님 커리어는 어떨까요?`,
    outro: `열심히 하면 분명 알아봐주는 사람 있어요.\n${userName}님, 항상 응원할게요!\n\n다음은 학업이랑 계약운이에요.`,
    introBg: "/new-year/img/doryung3.jpg",
    reportBg: "/new-year/img/doryung3.jpg",
    outroBg: "/new-year/img/doryung5.jpg",
  },
  chapter6: {
    intro: `학업운, 계약운 차례예요.\n시험이나 중요한 계약 앞두고 계신가요?`,
    outro: `큰 결정은 좋은 시기에 하는 게 좋아요.\n참고해두시면 도움 될 거예요!\n\n자, 이번엔 사람 복 얘기 해볼까요?`,
    introBg: "/new-year/img/doryung5.jpg",
    reportBg: "/new-year/img/doryung3.jpg",
    outroBg: "/new-year/img/doryung4.jpg",
  },
  chapter7: {
    intro: `대인관계운이에요.\n올해 ${userName}님 주변엔 어떤 사람들이 있을까요?`,
    outro: `좋은 사람 곁에 있으면 운도 따라와요.\n소중한 인연 꼭 챙기세요!\n\n그럼 이제 월별로 자세히 볼까요?`,
    introBg: "/new-year/img/doryung4.jpg",
    reportBg: "/new-year/img/doryung8.jpg",
    outroBg: "/new-year/img/doryung7.jpg",
  },
  chapter8: {
    intro: `12개월 월별 운세예요.\n매달 어떤 일이 있을지 궁금하시죠?`,
    outro: `새 달이 시작될 때마다 한번씩 읽어보세요.\n분명 도움이 될 거예요!\n\n다음은 좀 특별한 거 준비했어요~`,
    introBg: "/new-year/img/doryung7.jpg",
    reportBg: "/new-year/img/doryung7.jpg",
    outroBg: "/new-year/img/doryung4.jpg",
  },
  chapter9: {
    intro: `짜잔~ 미래일기예요!\n2026년의 ${userName}님이 직접 쓴 일기라고 상상해보세요.`,
    outro: `어때요, 좀 설레지 않아요?\n이렇게 좋은 일들이 가득하길 바라요!\n\n자, 이제 올해 개운법 알려드릴게요.`,
    introBg: "/new-year/img/doryung3.jpg",
    reportBg: "/new-year/img/doryung3.jpg",
    outroBg: "/new-year/img/doryung6.jpg",
  },
  chapter10: {
    intro: `개운법이에요!\n올해 운 더 좋아지는 꿀팁들 알려드릴게요.`,
    outro: `하나씩 실천해보세요.\n작은 것부터 하면 운이 확 바뀌어요!\n\n마지막으로 제가 따로 해드릴 말씀이 있어요.`,
    introBg: "/new-year/img/doryung6.jpg",
    reportBg: "/new-year/img/doryung6.jpg",
    outroBg: "/new-year/img/doryung4.jpg",
  },
  chapter11: {
    intro: `드디어 마지막이에요.\n${userName}님께만 드리는 까치도령의 특별한 귀띔!`,
    outro: "",
    introBg: "/new-year/img/doryung4.jpg",
    reportBg: "/new-year/img/doryung.jpg",
    outroBg: "/new-year/img/doryung2.jpg",
  },
});

export const CHAPTER_TITLES = [
  "2026년 총운",
  "재물운",
  "건강운",
  "애정운",
  "직장·명예운",
  "관계운",
  "감정관리",
  "월별운세",
  "미래일기",
  "개운법",
  "까치도령 귀띔",
];

export const newYearPlayerConfig = {
  characterName: "까치도령",
  homeRoute: "/new-year",
  defaultBgImage: "/new-year/img/doryung.jpg",
} as const;
