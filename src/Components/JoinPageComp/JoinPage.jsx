import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
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

    const { data: status, error: statusError } = await supabase
      .from("test_status")
      .select("started")
      .eq("id", 1)
      .single();

    if (status?.started) {
      alert("Гра вже почалася. Приєднання заборонене.");
      setLoading(false);
      console.log(statusError);
      return;
    }

    const { data, error } = await supabase
      .from("users")
      .upsert([{ name }])
      .select()
      .single();

    setLoading(false);

    if (error) {
      alert("Помилка при підключенні: " + error.message);
    } else {
      localStorage.setItem("userName", data.name);
      navigate(`/lobby/${data.name}`);
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
