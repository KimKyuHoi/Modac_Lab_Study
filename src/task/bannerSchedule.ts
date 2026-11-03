import { starterFiles } from "./starterFiles";

export type Task = {
  id: "banner-schedule";
  title: string;
  requirementMessage: string;
  starterNote: string;
  facts: string[];
  personaRules: string[];
  extensionScenario: string;
  checklist: string[];
  starterFiles: Record<string, string>;
  timeBudgetMin: { build: number; review: number };
};

export const bannerScheduleTask: Task = {
  id: "banner-schedule",
  title: "홈 배너를 국가별로 예약 노출하기",
  requirementMessage:
    "안녕하세요! 배너를 나라별로 다르게 보여 주고 싶은데요, 미리 예약해 두면 알아서 바뀌면 좋겠어요. 운영 화면에서 저희가 직접 넣고 고칠 수 있게요. 다음 캠페인 전에 될까요?",
  starterNote:
    "키즈 콘텐츠 서비스의 웹 홈 화면 일부와 운영자용 배너 관리 화면입니다. 홈 상단 한 자리에 배너 하나를 보여 줍니다. 데이터는 src/api/banners.js의 가짜 API에서 옵니다.",
  facts: [
    // 서비스 맥락
    "월간 사용자 약 120만 명. 한국 60%, 일본 25%, 미국 15%.",
    "모바일 웹이 80%. 홈 첫 화면 로딩 속도를 중요하게 본다.",
    "국가는 로그인 사용자의 설정 국가를 쓰고, 비로그인은 브라우저 언어로 추정한다. 현재 코드에 getUserCountry()가 이미 있다.",
    "기존 스택은 React, REST API. 서버 쪽 변경은 백엔드팀에 요청해야 하고 보통 2주 걸린다. 이번 건은 프론트에서 먼저 풀길 바란다.",
    "다음 캠페인은 2주 뒤 시작한다.",
    // 운영 맥락
    "마케팅팀 운영자 3명. 평소 하루 2~3건, 캠페인 시즌엔 하루 10건 정도 배너를 바꾼다.",
    "운영자 둘이 같은 배너를 동시에 고치는 일이 가끔 있다. 어떻게 할지는 정하지 않았다.",
    // 기능 세부
    "국가는 KR, JP, US로 시작하고 나중에 늘어난다.",
    "예약은 시작·종료 일시를 지정한다.",
    "시간대는 국가 현지 시간 기준이다.",
    "한 자리에는 한 배너만 보여야 한다. 겹칠 때 무엇을 우선할지는 정하지 않았다. 개발자에게 제안을 요청한다.",
    "국가가 안 맞거나 기간 밖이면 기본 배너(국가 없음, 기간 없음)를 보여 준다.",
    "예약 목록에서 \"지금 어느 나라에 무엇이 보이는지\"를 운영자가 확인하고 싶어 한다.",
  ],
  personaRules: [
    "마케팅팀과 일하는 PM이다. 기술 결정은 하지 않는다. 기술 결정을 요구받으면 \"그건 개발자가 정해 주시면 좋겠어요, 이유도 같이요\"로 넘긴다.",
    "한 번에 하나만 답한다. 묻지 않은 사실은 덧붙이지 않는다.",
    "포괄적인 질문(\"요구사항 다 알려 주세요\")에는 가장 급한 것 하나만 말하고 \"더 궁금한 건 콕 집어 물어봐 주세요\"로 답한다.",
    "사실표에 없는 것은 \"모르겠어요, 확인해 볼게요\"로 답하고 지어내지 않는다.",
    "답은 3문장 이내. 말투는 요구사항 메시지와 같은 구어체.",
  ],
  extensionScenario:
    "같은 자리에서 국가별로 배너 두 개를 A/B 테스트해야 한다면 지금 구조에서 무엇을 바꾸겠어요?",
  checklist: [
    "국가별 필터링이 동작한다.",
    "기간 안에서만 노출된다.",
    "겹치는 예약을 처리하는 규칙이 코드에 있고 정의서와 일치한다.",
    "관리 화면에서 예약을 등록·수정할 수 있다.",
    "기본 배너 폴백이 있다.",
  ],
  starterFiles,
  timeBudgetMin: { build: 60, review: 15 },
};
