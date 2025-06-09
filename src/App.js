import { Routes, Route } from "react-router-dom";
import JoinPage from "./Components/JoinPageComp/JoinPage";
import LobbyPage from "./Components/LobbyPageComp/LobbyPage";
import QuestionsPage from "./Components/QuestionsPageComp/QuestionsPage";
import GraphPage from "./Components/GraphPageComp/GraphPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<JoinPage />} />
      <Route path="/lobby/:userName" element={<LobbyPage />} />
      <Route path="/questions/:userName" element={<QuestionsPage />} />
      <Route path="/graph" element={<GraphPage />} />
    </Routes>
  );
}

export default App;
