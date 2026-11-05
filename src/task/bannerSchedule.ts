import { starterFiles } from "./starterFiles";

export type Task = {
  id: "banner-schedule";
  title: string;
  requirementMessage: string;
  starterNote: string;
  /** 지원자에게 처음부터 공개되는 서비스 기본 스펙 */
  serviceProfile: { label: string; value: string }[];
  /** 실무진에게 물어야 알 수 있는 사실표 */
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
  serviceProfile: [
    { label: "서비스", value: "글로벌 키즈 콘텐츠 웹 서비스. 홈 상단 배너 한 자리에서 캠페인을 안내한다." },
    { label: "운영 기간", value: "2019년 출시, 7년째 운영 중" },
    { label: "월간 사용자", value: "약 120만 명 (한국 60%, 일본 25%, 미국 15%)" },
    { label: "트래픽", value: "홈 조회 일 평균 약 35만 회. 캠페인 시즌 피크는 평시의 3배" },
    { label: "기기", value: "모바일 웹 80%, 데스크톱 20%. 홈 첫 화면 로딩 속도를 중요하게 본다" },
    { label: "사용자 국가", value: "로그인 사용자는 설정 국가, 비로그인(약 40%)은 브라우저 언어로 추정. 코드의 getUserCountry()가 이 값을 준다" },
    { label: "운영 팀", value: "마케팅 운영자 3명. 평소 하루 2~3건, 캠페인 시즌엔 하루 10건 정도 배너를 바꾼다" },
    { label: "기술 스택", value: "프론트 React 18 + Vite, 상태는 서버 데이터 기준. API는 Node(Express) REST, /api/banners. 서버 변경은 백엔드팀 요청이 필요하고 보통 2주 걸린다" },
    { label: "인프라", value: "AWS. 프론트는 S3 정적 호스팅 + CloudFront CDN(캐시 TTL 10분). API는 ECS Fargate 2태스크, DB는 RDS MySQL 8, 캐시는 ElastiCache Redis(배너 목록 60초 캐시)" },
    { label: "배포", value: "GitHub Actions. PR 머지 시 stage 자동 배포, prod는 매일 오후 3시 수동 승인 배포. 환경은 dev / stage / prod 3개, 설정은 환경변수(.env.*)로 분리" },
    { label: "CI/CD", value: "PR마다 lint, 타입 체크, Vitest 단위 테스트, Playwright 스모크 3개 실행. 실패 시 머지 불가" },
    { label: "모니터링", value: "Datadog APM + 브라우저 RUM, Sentry 에러 수집. 홈 LCP 2.5초 초과 시 알림" },
    { label: "현재 배너", value: "국가 구분 없이 슬롯 1개, 등록된 첫 배너를 보여 준다" },
    { label: "일정", value: "다음 캠페인은 2주 뒤 시작" },
  ],
  facts: [
    // 서비스 기본 스펙은 serviceProfile로 공개돼 있다. 여기는 물어봐야 나오는 것만.
    "이번 건은 프론트에서 먼저 풀길 바란다. 서버 변경은 다음 단계에서 검토한다.",
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
    "겹치는 예약을 처리하는 규칙이 코드에 있고, 실무진 답변이나 본인 설명과 일치한다.",
    "관리 화면에서 예약을 등록·수정할 수 있다.",
    "기본 배너 폴백이 있다.",
  ],
  starterFiles,
  timeBudgetMin: { build: 75, review: 15 },
};
