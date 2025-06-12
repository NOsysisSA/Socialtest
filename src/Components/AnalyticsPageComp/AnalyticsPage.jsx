import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function AnalyticsPage() {
  const [users, setUsers] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const { data: usersData } = await supabase.from("users").select("*");
      const { data: answersData } = await supabase.from("answers").select("*");

      if (usersData && answersData) {
        setUsers(usersData);
        setAnswers(answersData);
      }

      setLoading(false);
    }

    loadData();
  }, []);

  if (loading) return <p>Завантаження...</p>;

  // Ініціалізація об'єктів для зведення даних
  const userMap = Object.fromEntries(users.map(u => [u.id, u.name]));
  const grouped = {};

  answers.forEach(({ target_id, question_index, value }) => {
    if (!grouped[target_id]) grouped[target_id] = {};
    if (!grouped[target_id][question_index]) grouped[target_id][question_index] = [];
    if (value !== null) grouped[target_id][question_index].push(value);
  });

  // Середні значення по кожному питанню для кожного користувача
  const summary = users.map(({ id, name }) => {
    const questions = grouped[id] || {};
    const avg = (index) => {
      const vals = questions[index] || [];
      return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : "-";
    };
    return {
      name,
      currentFreq: avg(0),
      desiredFreq: avg(1),
      currentEff: avg(2),
      desiredEff: avg(3),
      overall:
        [0, 1, 2, 3]
          .map(i => questions[i] || [])
          .flat()
          .reduce((a, b, _, arr) => (a + b / arr.length), 0)
          .toFixed(2),
    };
  });

  return (
    <div style={{ padding: "20px", maxWidth: "900px", margin: "0 auto" }}>
      <h2>Аналітика результатів</h2>

      <table border="1" cellPadding="10" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Імʼя</th>
            <th>Частота (чинна)</th>
            <th>Частота (бажана)</th>
            <th>Ефективність (чинна)</th>
            <th>Ефективність (бажана)</th>
            <th>Середня оцінка</th>
          </tr>
        </thead>
        <tbody>
          {summary.map((row, idx) => (
            <tr key={idx}>
              <td>{row.name}</td>
              <td>{row.currentFreq}</td>
              <td>{row.desiredFreq}</td>
              <td>{row.currentEff}</td>
              <td>{row.desiredEff}</td>
              <td>{row.overall}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
