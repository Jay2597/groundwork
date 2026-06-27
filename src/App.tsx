import { Navigate, Route, Routes } from "react-router-dom";
import { WelcomeScreen } from "@/components/screens/WelcomeScreen";
import { HomeScreen } from "@/components/screens/HomeScreen";
import { EditorScreen } from "@/components/editor/EditorScreen";

export function App() {
  return (
    <Routes>
      <Route path="/welcome" element={<WelcomeScreen />} />
      <Route path="/" element={<HomeScreen />} />
      <Route path="/editor/:fileId" element={<EditorScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
