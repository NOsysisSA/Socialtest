import { Routes, Route } from "react-router-dom";
import CreateTestPage from "./Components/CreateTestPageComp/CreateTestPage";
import TestListPage from "./Components/TestListPageComp/TestListPage";
import JoinPage from "./Components/JoinPageComp/JoinPage";
import LobbyPage from "./Components/LobbyPageComp/LobbyPage";
import QuestionsPage from "./Components/QuestionsPageComp/QuestionsPage";
import GraphPage from "./Components/GraphPageComp/GraphPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<TestListPage />} />
      <Route path="/create-test" element={<CreateTestPage />} />
      <Route path="/join/:testId" element={<JoinPage />} />
      <Route path="/lobby/:testId/:userName" element={<LobbyPage />} />
      <Route path="/questions/:testId/:userName" element={<QuestionsPage />} />
      <Route path="/graph/:testId" element={<GraphPage />} />
    </Routes>
  );
}

export default App;