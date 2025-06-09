import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function JoinPage() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleJoin() {
    if (!name.trim()) return alert("Введіть ім'я");

    setLoading(true);

    // 🔸 Проверка: началась ли игра
    const { data: status, error: statusError } = await supabase
      .from("test_status")
      .select("started")
      .eq("id", 1)
      .single();

    if (status?.started) {
      alert("Гра вже почалася. Приєднання заборонене.");
      setLoading(false);
      return;
    }

    // 🔸 Добавление пользователя
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
    <div>
      <h1>Приєднатися до гри</h1>
      <input
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
  );
}
