import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import "./stylesJoinPage.css";

export default function JoinPage() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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

  async function handleJoin() {
    if (!name.trim()) return alert("Введіть ім'я");

    setLoading(true);
    try {
      const statusDoc = doc(db, "test_status", "status");
      const statusSnap = await getDoc(statusDoc);
      if (!statusSnap.exists()) {
        await setDoc(statusDoc, { started: false, reset_needed: false });
      }
      const statusData = statusSnap.data();
      if (statusData?.started) {
        alert("Гра вже почалася. Приєднання заборонене.");
        return;
      }

      const usersQuery = query(collection(db, "users"));
      const usersSnapshot = await getDocs(usersQuery);
      const userCount = usersSnapshot.size;
      const newNumber = userCount + 1;

      const usersRef = collection(db, "users");
      const userDocRef = doc(usersRef);
      await setDoc(userDocRef, {
        name,
        submitted: false,
        created_at: serverTimestamp(),
        role: userCount === 0 ? "admin" : "user",
        number: newNumber,
      });

      localStorage.setItem("userName", name);
      navigate(`/lobby/${name}`);
    } catch (error) {
      alert("Ошибка: " + error.message);
      console.error("Ошибка при присоединении:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="join-page">
      <div className="bubbles" id="bubbles"></div>
      <div className="form-container">
        <h1 className="form-heading">Приєднатися до гри</h1>
        <input
          className="input-item"
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
