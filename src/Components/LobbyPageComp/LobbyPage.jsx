import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import {
  collection,
  query,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
} from "firebase/firestore";
import { useBubbles } from "../Bubbles/useBubbles";
import styles from "./LobbyPage.module.css";

export default function LobbyPage() {
  const { testId, userName } = useParams();
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  useBubbles();

  useEffect(() => {
    async function fetchInitialData() {
      setIsLoading(true);
      try {
        const statusDoc = doc(db, "tests", testId, "status", "status");
        const statusSnap = await getDoc(statusDoc);
        if (!statusSnap.exists()) {
          await setDoc(statusDoc, {
            started: false,
            reset_needed: false,
            participantsSubmitted: 0,
            totalParticipants: 0,
          });
        }

        const q = query(collection(db, "tests", testId, "users"));
        onSnapshot(
          q,
          (snapshot) => {
            const playersData = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            playersData.sort((a, b) => a.number - b.number);
            setPlayers(playersData);
          },
          (err) => {
            setError("Помилка завантаження гравців: " + err.message);
            console.error("Ошибка загрузки игроков:", err);
          }
        );
      } catch (err) {
        setError("Помилка завантаження: " + err.message);
        console.error("Ошибка при загрузке данных:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchInitialData();

    const statusDoc = doc(db, "tests", testId, "status", "status");
    const unsubscribe = onSnapshot(
      statusDoc,
      (snapshot) => {
        if (snapshot.data()?.started) {
          navigate(`/questions/${testId}/${userName}`);
        }
      },
      (err) => {
        setError("Помилка статусу тесту: " + err.message);
        console.error("Ошибка отслеживания статуса теста:", err);
      }
    );

    return () => unsubscribe();
  }, [testId, userName, navigate]);

  const handleStartTest = async () => {
    setIsLoading(true);
    try {
      const usersQuery = query(collection(db, "tests", testId, "users"));
      const usersSnapshot = await getDocs(usersQuery);
      const totalPlayers = usersSnapshot.size;

      const statusDoc = doc(db, "tests", testId, "status", "status");
      await updateDoc(statusDoc, {
        started: true,
        totalParticipants: totalPlayers,
        participantsSubmitted: 0,
      });
    } catch (err) {
      setError("Помилка запуску тесту: " + err.message);
      console.error("Ошибка запуска теста:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.lobbyPage}>
      <div className={styles.bubbles} id="bubbles"></div>
      <div className={styles.formContainer}>
        <h1 className={styles.formHeading}>Лобі, {userName}</h1>
        {isLoading ? (
          <p>Завантаження...</p>
        ) : error ? (
          <p className={styles.errorMessage}>{error}</p>
        ) : (
          <>
            <div className={styles.playersList}>
              {players.map((player) => (
                <div key={player.id} className={styles.listItem}>
                  {player.number}. {player.name}
                </div>
              ))}
            </div>
            {players.find((p) => p.name === userName && p.role === "admin") && (
              <button
                onClick={handleStartTest}
                disabled={isLoading || players.length < 2}
              >
                {isLoading ? "Запуск..." : "Запустити тест"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}