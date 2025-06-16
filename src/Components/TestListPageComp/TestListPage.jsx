import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, query, orderBy, onSnapshot, doc } from "firebase/firestore";
import { useBubbles } from "../Bubbles/useBubbles";
import styles from "./TestListPage.module.css";

export default function TestListPage() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  useBubbles();

  useEffect(() => {
    const q = query(collection(db, "tests"), orderBy("created_at", "desc"));
    const unsubscribeTests = onSnapshot(
      q,
      (snapshot) => {
        const testsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          status: "Online", // Initial status
        }));
        setTests(testsData);

        // Set up real-time listeners for each test's status
        const statusUnsubscribes = testsData.map((test) => {
          const statusDocRef = doc(db, "tests", test.id, "status", "status");
          return onSnapshot(
            statusDocRef,
            (statusSnap) => {
              let status = "Online";
              if (statusSnap.exists()) {
                const statusData = statusSnap.data();
                if (statusData.started) {
                  const totalParticipants = statusData.totalParticipants || 0;
                  const participantsSubmitted = statusData.participantsSubmitted || 0;
                  if (
                    totalParticipants > 0 &&
                    participantsSubmitted >= totalParticipants * (totalParticipants - 1)
                  ) {
                    status = "Completed";
                  } else {
                    status = "Active";
                  }
                }
              }
              setTests((prevTests) =>
                prevTests.map((t) =>
                  t.id === test.id ? { ...t, status } : t
                )
              );
            },
            (error) => {
              console.error(`Error fetching status for test ${test.id}:`, error);
            }
          );
        });

        // Set loading to false after initial tests load
        setLoading(false);

        // Cleanup status listeners when tests change or component unmounts
        return () => {
          statusUnsubscribes.forEach((unsubscribe) => unsubscribe());
        };
      },
      (error) => {
        console.error("Error fetching tests:", error);
        alert("Помилка завантаження тестів: " + error.message);
        setLoading(false);
      }
    );

    // Cleanup tests listener on unmount
    return () => unsubscribeTests();
  }, []);

  const handleSelectTest = (testId, status) => {
    if (status === "Completed") {
      navigate(`/graph/${testId}`);
    } else {
      navigate(`/join/${testId}`);
    }
  };

  return (
    <div className={styles.testListPage}>
      <div className={styles.bubbles} id="bubbles"></div>
      <div className={styles.formContainer}>
        <h1 className={styles.formHeading}>Список тестів</h1>
        {loading ? (
          <p>Завантаження...</p>
        ) : tests.length === 0 ? (
          <p>Тестів немає. Створіть новий!</p>
        ) : (
          <div className={styles.testsList}>
            {tests.map((test) => (
              <div
                key={test.id}
                className={styles.testItem}
                onClick={() => handleSelectTest(test.id, test.status)}
              >
                <div className={styles.testInfo}>
                  <span className={styles.testName}>{test.testName}</span>
                  <span className={`${styles.statusBadge} ${styles[test.status.toLowerCase()]}`}>
                    {test.status === "Online"
                      ? "Онлайн"
                      : test.status === "Active"
                      ? "В процесі"
                      : "Завершено"}
                  </span>
                </div>
                <span className={styles.testDate}>
                  {test.created_at?.toDate().toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
        <button onClick={() => navigate("/create-test")}>
          Створити новий тест
        </button>
      </div>
    </div>
  );
}