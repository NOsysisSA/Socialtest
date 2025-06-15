import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../../firebase";
import {
  collection,
  query,
  getDocs,
  getDoc,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useBubbles } from "../Bubbles/useBubbles";
import styles from "./JoinPage.module.css";

export default function JoinPage() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { testId } = useParams();
  useBubbles();

  async function handleJoin() {
    if (!name.trim()) return alert("Введіть ім'я");

    setLoading(true);
    try {
      const statusDoc = doc(db, "tests", testId, "status", "status");
      const statusSnap = await getDoc(statusDoc);
      if (!statusSnap.exists()) {
        await setDoc(statusDoc, { started: false, reset_needed: false });
      }
      const statusData = statusSnap.data();
      if (statusData?.started) {
        alert("Гра вже почалася. Приєднання заборонене.");
        return;
      }

      const usersQuery = query(collection(db, "tests", testId, "users"));
      const usersSnapshot = await getDocs(usersQuery);
      const userCount = usersSnapshot.size;
      const newNumber = userCount + 1;

      const usersRef = collection(db, "tests", testId, "users");
      const userDocRef = doc(usersRef);
      await setDoc(userDocRef, {
        name,
        submitted: false,
        created_at: serverTimestamp(),
        role: userCount === 0 ? "admin" : "user",
        number: newNumber,
      });

      localStorage.setItem("userName", name);
      navigate(`/lobby/${testId}/${name}`);
    } catch (error) {
      let message = "Помилка приєднання";
      if (error.code === "permission-denied") {
        message = "Недостатньо прав для приєднання";
      } else {
        message += ": " + error.message;
      }
      alert(message);
      console.error("Ошибка при присоединении:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.joinPage}>
      <div className={styles.bubbles} id="bubbles"></div>
      <div className={styles.formContainer}>
        <h1 className={styles.formHeading}>Приєднатися до тесту</h1>
        <input
          className={styles.inputItem}
          type="text"
          placeholder="Ваше ім'я"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
        />
        <button onClick={handleJoin} disabled={loading}>
          {loading ? "Підключення..." : "Приєднатися"}
        </button>
      </div>
    </div>
  );
}