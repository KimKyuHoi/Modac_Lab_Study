import { ConfigProvider, App as AntApp } from "antd";
import koKR from "antd/locale/ko_KR";
import { Navigate, Route, Routes } from "react-router-dom";
import { antdTheme } from "./theme";
import { StartPage } from "./pages/Start";
import { WorkPage } from "./pages/Work";
import { ReviewPage } from "./pages/Review";
import { ReportPage } from "./pages/Report";
import { SessionsPage } from "./pages/Sessions";
import { SessionProvider } from "./session/store";

export function AppRoutes() {
  return (
    <ConfigProvider theme={antdTheme} locale={koKR}>
      <AntApp>
        <SessionProvider>
        <Routes>
          <Route path="/" element={<StartPage />} />
          <Route path="/work" element={<WorkPage />} />
          <Route path="/task" element={<Navigate to="/work" replace />} />
          <Route path="/build" element={<Navigate to="/work" replace />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/report/:id" element={<ReportPage />} />
          <Route path="/sessions" element={<SessionsPage />} />
        </Routes>
        </SessionProvider>
      </AntApp>
    </ConfigProvider>
  );
}

export function App() {
  return <AppRoutes />;
}
