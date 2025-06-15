import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { useBubbles } from "../Bubbles/useBubbles";
import styles from "./TestListPage.module.css";

export default function TestListPage() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  useBubbles();

  useEffect(() => {
    const q = query(collection(db, "tests"), orderBy("created_at", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const testsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTests(testsData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching tests:", error);
        alert("Помилка завантаження тестів: " + error.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleSelectTest = (testId) => {
    navigate(`/join/${testId}`);
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
                onClick={() => handleSelectTest(test.id)}
              >
                <span>{test.testName}</span>
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