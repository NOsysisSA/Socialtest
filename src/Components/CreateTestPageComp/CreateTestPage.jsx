import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, addDoc, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useBubbles } from "../Bubbles/useBubbles";
import styles from "./CreateTestPage.module.css";

export default function CreateTestPage() {
  const [testName, setTestName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  useBubbles();

  const handleCreate = async () => {
    if (!testName.trim()) return alert("Введіть назву тесту");

    setLoading(true);
    try {
      const testRef = await addDoc(collection(db, "tests"), {
        testName,
        created_at: serverTimestamp(),
      });

      await setDoc(doc(db, "tests", testRef.id, "status", "status"), {
        started: false,
        reset_needed: false,
        participantsSubmitted: 0,
        totalParticipants: 0,
      });

      navigate(`/join/${testRef.id}`);
    } catch (error) {
      alert("Помилка створення тесту: " + error.message);
      console.error("Error creating test:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.createTestPage}>
      <div className={styles.bubbles} id="bubbles"></div>
      <div className={styles.formContainer}>
        <h1 className={styles.formHeading}>Створити новий тест</h1>
        <input
          className={styles.inputItem}
          type="text"
          placeholder="Назва тесту (наприклад, Команда A – червень 2025)"
          value={testName}
          onChange={(e) => setTestName(e.target.value)}
          disabled={loading}
        />
        <button onClick={handleCreate} disabled={loading}>
          {loading ? "Створення..." : "Створити"}
        </button>
      </div>
    </div>
  );
}