import { ConfigProvider, App as AntApp } from "antd";
import koKR from "antd/locale/ko_KR";
import { Route, Routes } from "react-router-dom";
import { antdTheme } from "./theme";
import { StartPage } from "./pages/Start";
import { TaskPage } from "./pages/Task";
import { BuildPage } from "./pages/Build";
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
          <Route path="/task" element={<TaskPage />} />
          <Route path="/build" element={<BuildPage />} />
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
