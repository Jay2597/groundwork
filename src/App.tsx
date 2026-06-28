import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { WelcomeScreen } from "@/components/screens/WelcomeScreen";
import { HomeScreen } from "@/components/screens/HomeScreen";
import { EditorScreen } from "@/components/editor/EditorScreen";
import { trackPageview } from "@/lib/analytics";

export function App() {
  return (
    <>
      <RouteAnalytics />
      <Routes>
        <Route path="/welcome" element={<WelcomeScreen />} />
        <Route path="/" element={<HomeScreen />} />
        <Route path="/editor/:fileId" element={<EditorScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

/** Counts an anonymous, coarse page view on each route change (no-op unless configured). */
function RouteAnalytics() {
  const location = useLocation();
  useEffect(() => {
    trackPageview(`#${location.pathname}`);
  }, [location.pathname]);
  return null;
}
