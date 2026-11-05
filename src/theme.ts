import type { ThemeConfig } from "antd";

export const tokens = {
  ink: "#16202B",
  paper: "#FFFFFF",
  frost: "#F2F4F7",
  line: "#D9DEE5",
  accent: "#2B6FD6",
  moss: "#2F7D5B",
  muted: "#5B6673",
} as const;

export const fontFamily =
  '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';

export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: tokens.ink,
    colorInfo: tokens.ink,
    colorSuccess: tokens.moss,
    colorLink: tokens.ink,
    colorText: tokens.ink,
    colorTextSecondary: tokens.muted,
    colorBorder: tokens.line,
    colorBorderSecondary: tokens.line,
    colorBgLayout: tokens.paper,
    colorBgContainer: tokens.paper,
    colorFillAlter: tokens.frost,
    borderRadius: 4,
    fontFamily,
    fontSize: 15,
    lineHeight: 1.65,
    boxShadow: "none",
    boxShadowSecondary: "none",
    controlHeight: 36,
  },
  components: {
    Button: { fontWeight: 600, defaultShadow: "none", primaryShadow: "none" },
    Card: { boxShadowTertiary: "none" },
    Drawer: { footerPaddingBlock: 12 },
    Table: { headerBg: tokens.frost },
    Tabs: { inkBarColor: tokens.ink, itemSelectedColor: tokens.ink },
  },
};
