import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";

const QUESTIONS = [
  "Частота комунікації (чинна)",
  "Частота комунікації (Бажана)",
  "Наскільки ефективною ви вважаєте комунікацію ?",
  "Якою б ви хотіли бачити ефективність комунікації ?",
  "Ваші коментарі щодо комунікації з Frank ?",
];

function QuestionsPage() {
  const { userName } = useParams();
  const [players, setPlayers] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchPlayers() {
      const { data } = await supabase.from("users").select("*");
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

    const { error } = await supabase.from("answers").insert(payload);
    if (error) {
      alert("Ошибка при сохранении: " + error.message);
    } else {
      alert("Ответы отправлены!");
    }

    setSubmitting(false);
  };

  return (
    <div>
      <h2>Оценка игроков</h2>
      {players.map((player) => (
        <div key={player.id} style={{ marginBottom: "30px" }}>
          <h3>{player.name}</h3>
          {QUESTIONS.map((q, index) => (
            <div key={index} style={{ margin: "5px 0" }}>
              <label>{q}</label>
              {index < 4 ? (
                <select
                  value={answers[player.id]?.[index] || ""}
                  onChange={(e) =>
                    handleChange(player.id, index, e.target.value)
                  }
                >
                  <option value="">Оберіть оцінку 1 - 5</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={answers[player.id]?.[index] || ""}
                  onChange={(e) =>
                    handleChange(player.id, index, e.target.value)
                  }
                  placeholder="Комментар..."
                />
              )}
            </div>
          ))}
        </div>
      ))}
      <button onClick={handleSubmit} disabled={submitting}>
        {submitting ? "Отправка..." : "Отправить все ответы"}
      </button>
    </div>
  );
}

export default QuestionsPage;
