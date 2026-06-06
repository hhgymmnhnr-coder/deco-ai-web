import { useState } from "react";
import HomeScreen from "./screens/HomeScreen";
import UploadScreen from "./screens/UploadScreen";
import ResultScreen from "./screens/ResultScreen";

export default function App() {
  const [screen, setScreen] = useState("home");
  const [result, setResult] = useState(null);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {screen === "home" && (
        <HomeScreen onStart={() => setScreen("upload")} />
      )}
      {screen === "upload" && (
        <UploadScreen
          onBack={() => setScreen("home")}
          onResult={(data) => { setResult(data); setScreen("result"); }}
        />
      )}
      {screen === "result" && (
        <ResultScreen
          data={result}
          onBack={() => setScreen("upload")}
          onHome={() => setScreen("home")}
        />
      )}
    </div>
  );
}
