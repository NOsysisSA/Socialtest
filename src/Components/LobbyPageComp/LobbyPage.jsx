import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "./stylesLobbyPage.css";

export default function LobbyPage() {
  const { userName } = useParams();
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    async function fetchPlayers() {
      const { data, error } = await supabase.from("users").select("*");
      if (error) {
        setError("Помилка завантаження учасників: " + error.message);
      } else {
        setPlayers(data);
        const user = data.find((player) => player.name === userName);
        setCurrentUser(user);
      }
    }

    fetchPlayers();

    const userSubscription = supabase
      .channel("public:users")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users" },
        (payload) => {
          fetchPlayers();
        }
      )
      .subscribe();

    const statusSubscription = supabase
      .channel("public:test_status")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "test_status",
          filter: "id=eq.1",
        },
        (payload) => {
          if (payload.new.started) {
            navigate(`/questions/${userName}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(userSubscription);
      supabase.removeChannel(statusSubscription);
    };
  }, [userName, navigate]);

  useEffect(() => {
    const bubblesContainer = document.getElementById("bubbles");
    if (!bubblesContainer) return;

    bubblesContainer.innerHTML = "";

    for (let i = 0; i < 30; i++) {
      const bubble = document.createElement("div");
      bubble.classList.add("bubble");
      const size = Math.random() * 40 + 20;
      bubble.style.width = `${size}px`;
      bubble.style.height = `${size}px`;
      bubble.style.left = `${Math.random() * 100}vw`;
      bubble.style.top = `${Math.random() * 100}vh`;
      bubble.style.animationDelay = `${Math.random() * 5}s`;
      bubble.style.animationDuration = `${Math.random() * 4 + 4}s`;
      bubblesContainer.appendChild(bubble);
    }

    return () => {
      bubblesContainer.innerHTML = "";
    };
  }, []);

  async function handleStartTest() {
    const { error } = await supabase
      .from("test_status")
      .update({ started: true })
      .eq("id", 1);
    if (error) {
      setError("Помилка запуску тесту: " + error.message);
    } else {
      navigate(`/questions/${userName}`);
    }
  }

  return (
    <div className="lobby-page">
      <div className="bubbles" id="bubbles"></div>
      <div className="lobby-container">
        <h2 className="lobby-heading">Привіт, {userName}</h2>
        {currentUser?.id === 1 && (
          <button onClick={handleStartTest}>🚀 Запустити тест</button>
        )}
        <h4 className="lobby-subheading">Список учасників:</h4>
        {error && <p className="error-message">{error}</p>}
        <ul className="player-list">
          {players.map((player) => (
            <li key={player.id}>
              {player.name === userName ? (
                <strong>
                  {player.id}. {player.name} (ви)
                </strong>
              ) : (
                `${player.id}. ${player.name}`
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
