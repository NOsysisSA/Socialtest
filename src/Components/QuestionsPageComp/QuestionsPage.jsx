import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

const QUESTIONS = [
  "Частота комунікації (чинна)",
  "Частота комунікації (бажана)",
  "Наскільки ефективною ви вважаєте комунікацію?",
  "Якою б ви хотіли бачити ефективність комунікації?",
  "Ваші коментарі щодо комунікації з користувачем",
];

export default function QuestionsPage() {
  const { userName } = useParams();
  const [players, setPlayers] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchPlayers() {
      const { data, error } = await supabase.from("users").select("*");
      if (error) {
        alert("Помилка завантаження користувачів: " + error.message);
        return;
      }

      setPlayers(data.filter((p) => p.name !== userName));
    }

    fetchPlayers();
  }, [userName]);

  const handleChange = (targetId, questionIndex, value) => {
    setAnswers((prev) => ({
      ...prev,
      [targetId]: {
        ...prev[targetId],
        [questionIndex]: value,
      },
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);

    const payload = [];

    for (const player of players) {
      const targetId = player.id;
      const response = answers[targetId];

      if (!response || Object.keys(response).length < 5) continue;

      for (let i = 0; i < 5; i++) {
        payload.push({
          evaluator_name: userName,
          target_id: targetId,
          question_index: i,
          value: i < 4 ? Number(response[i]) : null,
          comment: i === 4 ? response[i] : null,
        });
      }
    }

    // Надіслати відповіді
    const { error: insertError } = await supabase.from("answers").insert(payload);

    if (insertError) {
      alert("Помилка при збереженні відповідей: " + insertError.message);
      setSubmitting(false);
      return;
    }

    // Встановити submitted = true
    const { error: updateError } = await supabase
      .from("users")
      .update({ submitted: true })
      .eq("name", userName);

    if (updateError) {
      alert("Помилка оновлення статусу: " + updateError.message);
      setSubmitting(false);
      return;
    }

    navigate("/graph");
  };

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <h2>Оцінка учасників</h2>
      {players.map((player) => (
        <div key={player.id} style={{ marginBottom: "40px" }}>
          <h3>{player.name}</h3>
          {QUESTIONS.map((q, index) => (
            <div key={index} style={{ margin: "10px 0" }}>
              <label>{q.replace("користувачем", player.name)}</label>
              {index < 4 ? (
                <select
                  value={answers[player.id]?.[index] || ""}
                  onChange={(e) => handleChange(player.id, index, e.target.value)}
                  style={{ marginLeft: "10px" }}
                >
                  <option value="">Оберіть оцінку (1–5)</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Ваш коментар"
                  value={answers[player.id]?.[index] || ""}
                  onChange={(e) => handleChange(player.id, index, e.target.value)}
                  style={{ width: "100%", marginTop: "5px" }}
                />
              )}
            </div>
          ))}
        </div>
      ))}

      <button onClick={handleSubmit} disabled={submitting}>
        {submitting ? "Надсилання..." : "Надіслати відповіді"}
      </button>
    </div>
  );
}
