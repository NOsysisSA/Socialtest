import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import styles from "./QuestionsPage.module.css";

export default function QuestionsPage() {
  const { userName } = useParams();
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTarget, setCurrentTarget] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    async function fetchInitialData() {
      setIsLoading(true);
      try {
        const statusDoc = doc(db, "test_status", "status");
        const statusSnap = await getDoc(statusDoc);
        if (!statusSnap.exists()) {
          await setDoc(statusDoc, {
            started: false,
            reset_needed: false,
            participantsSubmitted: 0,
            totalParticipants: 0,
          });
        }
        const statusData = statusSnap.data();
        if (!statusData.started) {
          navigate(`/lobby/${userName}`);
          return;
        }

        const q = query(collection(db, "users"));
        onSnapshot(
          q,
          (snapshot) => {
            const playersData = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            setPlayers(playersData);
            setCurrentUser(playersData.find((p) => p.name === userName));

            const firstTarget = playersData.find((p) => p.name !== userName);
            setCurrentTarget(firstTarget);
            setIsExpanded(false);
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

    const answersQuery = query(
      collection(db, "answers"),
      where("evaluator_name", "==", userName)
    );
    const unsubscribeAnswers = onSnapshot(
      answersQuery,
      (snapshot) => {
        const answersData = {};
        snapshot.forEach((doc) => {
          const data = doc.data();
          answersData[data.target_id] = data.responses || {};
        });
        setAnswers(answersData);
      },
      (err) => {
        setError("Помилка завантаження відповідей: " + err.message);
        console.error("Ошибка загрузки ответов:", err);
      }
    );

    const statusDoc = doc(db, "test_status", "status");
    const unsubscribeStatus = onSnapshot(
      statusDoc,
      (snapshot) => {
        const statusData = snapshot.data();
        if (!statusData) {
          console.warn("test_status/status document is missing");
          return;
        }
        const totalParticipants = statusData.totalParticipants || 0;
        const submittedCount = statusData.participantsSubmitted || 0;

        if (
          totalParticipants > 0 &&
          submittedCount >= totalParticipants * (totalParticipants - 1)
        ) {
          navigate("/graph");
        }
      },
      (err) => {
        console.error("Ошибка отслеживания статуса теста:", err);
        setError("Помилка статусу тесту: " + err.message);
      }
    );

    return () => {
      unsubscribeAnswers();
      unsubscribeStatus();
    };
  }, [userName, navigate]);

  const handleAnswerChange = (
    targetId,
    questionIndex,
    value,
    comment,
    willingToCommunicate
  ) => {
    setAnswers((prev) => ({
      ...prev,
      [targetId]: {
        ...prev[targetId],
        [`${questionIndex}`]: { value, comment, willingToCommunicate },
      },
    }));
    if (questionIndex === 0 && willingToCommunicate) {
      setIsExpanded(true);
    } else if (questionIndex === 0 && !willingToCommunicate) {
      setIsExpanded(false);
    }
  };

  const handleSubmit = async (targetId) => {
    setIsLoading(true);
    try {
      const willingToCommunicate =
        answers[targetId]?.["0"]?.willingToCommunicate;
      if (willingToCommunicate === undefined) {
        setError("Оберіть 'Так' або 'Ні' перед відправкою");
        return;
      }

      const statusDoc = doc(db, "test_status", "status");
      const statusSnap = await getDoc(statusDoc);
      const statusData = statusSnap.data() || { participantsSubmitted: 0 };

      const answerDocRef = doc(collection(db, "answers"));
      const responses = {};
      for (let i = 0; i < 4; i++) {
        const answer = answers[targetId]?.[`${i}`] || {
          value: 0,
          comment: "",
          willingToCommunicate: false,
        };
        responses[`${i}`] = {
          value:
            i === 0
              ? answer.willingToCommunicate
                ? 1
                : 0
              : answer.value !== undefined
              ? answer.value
              : 0,
          comment:
            i === 3 ? (answer.comment !== undefined ? answer.comment : "") : "",
        };
        if (i === 0) {
          responses[`${i}`].willingToCommunicate = answer.willingToCommunicate;
        }
      }

      await setDoc(answerDocRef, {
        evaluator_name: userName,
        target_id: targetId,
        responses,
        created_at: serverTimestamp(),
      });

      const userDoc = doc(db, "users", currentUser.id);
      await updateDoc(userDoc, { submitted: true });
      const submittedCount = statusData.participantsSubmitted + 1;
      await updateDoc(statusDoc, { participantsSubmitted: submittedCount });

      const currentTargets = players.filter((p) => p.name !== userName);
      const currentIndex = currentTargets.findIndex((p) => p.id === targetId);
      const nextIndex = currentIndex + 1;
      if (nextIndex < currentTargets.length) {
        setCurrentTarget(currentTargets[nextIndex]);
        setIsExpanded(false);
      } else {
        setCurrentTarget(null);
      }
    } catch (err) {
      setError("Помилка відправки відповідей: " + err.message);
      console.error("Ошибка отправки ответов:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const targetPlayer = currentTarget;
  const questions = targetPlayer
    ? [
        {
          text: `Чи бажаєте ви комунікувати з ${targetPlayer.name}?`,
          type: "boolean",
          options: ["Так", "Ні"],
        },
      ]
    : [];
  const additionalQuestions =
    targetPlayer && answers[targetPlayer.id]?.["0"]?.willingToCommunicate
      ? [
          {
            text: `Як часто ви комунікуєте з ${targetPlayer.name}?`,
            type: "int",
            options: [1, 2, 3, 4, 5],
          },
          {
            text: `Наскільки ефективна для вас комунікація з ${targetPlayer.name}?`,
            type: "int",
            options: [1, 2, 3, 4, 5],
          },
          {
            text: `Залишити коментар`,
            type: "str",
          },
        ]
      : [];

  return (
    <div className={styles.questionsPage}>
      <div className={styles.bubbles} id="bubbles"></div>
      <div className={`${styles.formContainer} ${isExpanded ? styles.expanded : ""}`}>
        <h1 className={styles.formHeading}>
          Оцінка гравців, <span className={styles.username}>{userName}</span>
        </h1>
        {isLoading ? (
          <p>Завантаження...</p>
        ) : error ? (
          <p className={styles.errorMessage}>{error}</p>
        ) : !targetPlayer ? (
          <p>Всі ваші відповіді відправлено. Очікування завершення іншими...</p>
        ) : (
          <div className={styles.playersList}>
            {[...questions, ...additionalQuestions].map((question, index) => (
              <div key={index} className={styles.listItem}>
                <label>{question.text}</label>
                {question.type === "boolean" ? (
                  <div className={styles.buttonGroup}>
                    {question.options.map((option, optIndex) => (
                      <button
                        key={optIndex}
                        onClick={() =>
                          handleAnswerChange(
                            targetPlayer.id,
                            index,
                            0,
                            "",
                            option === "Так"
                          )
                        }
                        className={`${styles.optionBtn} ${styles.boolean} ${
                          answers[targetPlayer.id]?.["0"]?.willingToCommunicate ===
                          (option === "Так")
                            ? styles.selected
                            : ""
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                ) : question.type === "int" ? (
                  <div className={styles.buttonGroup}>
                    {question.options.map((value) => (
                      <button
                        key={value}
                        onClick={() =>
                          handleAnswerChange(
                            targetPlayer.id,
                            index,
                            value,
                            answers[targetPlayer.id]?.[`${index}`]?.comment || ""
                          )
                        }
                        className={`${styles.optionBtn} ${
                          answers[targetPlayer.id]?.[`${index}`]?.value === value
                            ? styles.selected
                            : ""
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={answers[targetPlayer.id]?.[`${index}`]?.comment || ""}
                    onChange={(e) =>
                      handleAnswerChange(
                        targetPlayer.id,
                        index,
                        answers[targetPlayer.id]?.[`${index}`]?.value || 0,
                        e.target.value
                      )
                    }
                    className={styles.inputItem}
                    placeholder="Коментар"
                  />
                )}
              </div>
            ))}
            <button
              onClick={() => handleSubmit(targetPlayer.id)}
              disabled={
                isLoading ||
                answers[targetPlayer.id]?.["0"]?.willingToCommunicate === undefined
              }
            >
              {isLoading ? "Відправка..." : "Відправити"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}