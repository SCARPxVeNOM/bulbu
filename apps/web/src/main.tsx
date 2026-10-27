import { StrictMode, useEffect, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { StoreProvider, useStore } from "./store";
import { Toast } from "./components/ui";
import { Welcome, SignUp, Setup } from "./screens/Onboarding";
import { Home } from "./screens/Home";
import { Goals, GoalDetail } from "./screens/Goals";
import { Log } from "./screens/Log";
import { ImpactScreen } from "./screens/Impact";
import { InsightsScreen } from "./screens/Insights";
import { Chat } from "./screens/Chat";
import { Focus } from "./screens/Focus";
import { Profile } from "./screens/Profile";
import { Achievements } from "./screens/Achievements";
import { Memory } from "./screens/Memory";
import { Nudges } from "./screens/Nudges";
import "./styles.css";

function Private({ children }: { children: ReactNode }) {
  const { userId, state, error } = useStore();
  if (!userId) return <Navigate to="/welcome" replace />;
  if (!state) return <main className="screen" style={{ placeContent: "center", textAlign: "center" }}>{error ? <p className="muted">Can't reach Bulbu's server: {error}</p> : <img src="/bulbu.svg" alt="Loading" width={80} style={{ margin: "auto", animation: "bob 2.4s infinite" }} />}</main>;
  return <>{children}</>;
}

function Theme() {
  const { state } = useStore();
  useEffect(() => { document.documentElement.dataset.theme = state?.user.theme ?? "sky"; }, [state?.user.theme]);
  return null;
}

const P = (el: ReactNode) => <Private>{el}</Private>;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StoreProvider>
      <BrowserRouter>
        <Theme />
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/home" element={P(<Home />)} />
          <Route path="/goals" element={P(<Goals />)} />
          <Route path="/goals/:id" element={P(<GoalDetail />)} />
          <Route path="/log" element={P(<Log />)} />
          <Route path="/impact" element={P(<ImpactScreen />)} />
          <Route path="/insights" element={P(<InsightsScreen />)} />
          <Route path="/chat" element={P(<Chat />)} />
          <Route path="/focus" element={P(<Focus />)} />
          <Route path="/profile" element={P(<Profile />)} />
          <Route path="/achievements" element={P(<Achievements />)} />
          <Route path="/memory" element={P(<Memory />)} />
          <Route path="/nudges" element={P(<Nudges />)} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
        <Toast />
      </BrowserRouter>
    </StoreProvider>
  </StrictMode>,
);
