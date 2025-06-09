import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useParams, useNavigate } from "react-router-dom";

function LobbyPage() {
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState(null);
  const { userName } = useParams();
  const navigate = useNavigate();

  const fetchPlayers = async () => {
    const { data, error } = await supabase.from("users").select("*");
    if (error) setError(error.message);
    else setPlayers(data);
  };

  useEffect(() => {
    fetchPlayers();

    const usersChannel = supabase
      .channel("users-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users" },
        fetchPlayers
      )
      .subscribe();

    return () => {
      supabase.removeChannel(usersChannel);
    };
  }, [userName]);

  const currentPlayer = players.find((p) => p.name === userName);
  const isAdmin = currentPlayer?.id === 1;

  useEffect(() => {
    const testChannel = supabase
      .channel("test-status")
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

    async function checkStarted() {
      const { data } = await supabase
        .from("test_status")
        .select("started")
        .eq("id", 1)
        .maybeSingle();

      if (data?.started) {
        navigate(`/questions/${userName}`);
      }
    }

    checkStarted();

    return () => {
      supabase.removeChannel(testChannel);
    };
  }, [navigate, userName]);

  const handleStartTest = async () => {
    const { error } = await supabase
      .from("test_status")
      .update({ started: true })
      .eq("id", 1);

    if (error) {
      console.error("Ошибка при запуске теста:", error.message);
    }
  };

  if (!currentPlayer) return <p>⏳ Подключение...</p>;

  return (
    <div>
      <h2>Привет, {userName}</h2>

      {isAdmin && <button onClick={handleStartTest}>🚀 Запустить тест</button>}

      <h4>Список игроков:</h4>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <ul>
        {players.map((player) => (
          <li key={player.id}>
            {player.name === userName ? (
              <strong>{player.name} (вы)</strong>
            ) : (
              player.name
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default LobbyPage;
