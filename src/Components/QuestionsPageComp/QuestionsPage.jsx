import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "./stylesQuestionsPage.css";

const QUESTIONS = [
  "Частота комунікації (чинна)",
  "Частота комунікації (бажана)",
  "Насколько эффективною ви вважаєте комунікацію?",
  "Якою б ви хотіли бачити ефективність комунікації?",
  "Ваші коментарі щодо комунікації з користувачем",
];

const RatingButtons = ({ value, onChange, isError }) => {
  const handleClick = (num) => {
    onChange(num.toString());
  };

  return (
    <div className={`rating-buttons ${isError ? "error" : ""}`}>
      {[1, 2, 3, 4, 5].map((num) => (
        <button
          key={num}
          onClick={() => handleClick(num)}
          className={`rating-button ${
            value === num.toString() ? "selected" : ""
          }`}
        >
          {num}
        </button>
      ))}
    </div>
  );
};

export default function QuestionsPage() {
  const { userName } = useParams();
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [answers, setAnswers] = useState({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchPlayers() {
      const { data, error } = await supabase.from("users").select("*");
      if (error) {
        setErrors({
          global: "Помилка завантаження користувачів: " + error.message,
        });
        return;
      }
      setPlayers(data.filter((p) => p.name !== userName));
    }

    fetchPlayers();

    const userSubscription = supabase
      .channel("public:users")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users" },
        (payload) => {
          fetchPlayers();
        }
      )
      .subscribe();

    const statusSubscription = supabase
      .channel("public:test_status")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "test_status",
          filter: "id=eq.1",
        },
        (payload) => {
          if (!payload.new.started) {
            navigate(`/lobby/${userName}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(userSubscription);
      supabase.removeChannel(statusSubscription);
    };
  }, [userName, navigate]);

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

  const handleChange = (targetId, questionIndex, value) => {
    setAnswers((prev) => ({
      ...prev,
      [targetId]: {
        ...prev[targetId],
        [questionIndex]: value,
      },
    }));

    setErrors((prev) => ({
      ...prev,
      [targetId]: {
        ...prev[targetId],
        [questionIndex]: false,
      },
    }));
  };

  const handleSubmit = async () => {
    let hasError = false;
    const newErrors = {};

    for (const player of players) {
      const targetId = player.id;
      const response = answers[targetId] || {};

      newErrors[targetId] = {};

      for (let i = 0; i < QUESTIONS.length; i++) {
        const val = response[i];
        const isValid = i < 4 ? !!val && !isNaN(val) : val && val.trim() !== "";

        if (!isValid) {
          newErrors[targetId][i] = true;
          hasError = true;
        }
      }
    }

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);

    const payload = [];

    for (const player of players) {
      const targetId = player.id;
      const response = answers[targetId];

      for (let i = 0; i < QUESTIONS.length; i++) {
        payload.push({
          evaluator_name: userName,
          target_id: targetId,
          question_index: i,
          value: i < 4 ? Number(response[i]) : null,
          comment: i === 4 ? response[i] : null,
        });
      }
    }

    const { error: insertError } = await supabase
      .from("answers")
      .insert(payload);

    if (insertError) {
      setErrors({
        global: "Помилка при збереженні відповідей: " + insertError.message,
      });
      setSubmitting(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({ submitted: true })
      .eq("name", userName);

    if (updateError) {
      setErrors({
        global: "Помилка оновлення статусу: " + updateError.message,
      });
      setSubmitting(false);
      return;
    }

    navigate("/graph");
  };

  return (
    <div className="lobby-page">
      <div className="bubbles" id="bubbles"></div>
      <div className="lobby-container">
        <h2 className="lobby-heading">Вітаю {userName}, оцініть учасників</h2>
        {errors.global && <p className="error-message">{errors.global}</p>}
        {players.map((player) => (
          <div key={player.id} className="question-section">
            <h3 className="lobby-subheading">{player.name}</h3>
            {QUESTIONS.map((q, index) => {
              const value = answers[player.id]?.[index] || "";
              const isError = errors[player.id]?.[index];

              return (
                <div key={index} className="question-item">
                  <label>{q.replace("користувачем", player.name)}</label>
                  {index < 4 ? (
                    <RatingButtons
                      value={value}
                      onChange={(value) =>
                        handleChange(player.id, index, value)
                      }
                      isError={isError}
                    />
                  ) : (
                    <input
                      type="text"
                      placeholder="Ваш коментар"
                      value={value}
                      onChange={(e) =>
                        handleChange(player.id, index, e.target.value)
                      }
                      className={isError ? "error" : ""}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ))}
        <button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Надсилання..." : "Надіслати відповіді"}
        </button>
      </div>
    </div>
  );
}
