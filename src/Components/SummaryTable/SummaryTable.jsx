// Components/SummaryTableComp/SummaryTable.js
import { useState, useEffect, useRef } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import styles from "./SummaryTable.module.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function SummaryTable({ users, answers, onClose }) {
  const modalRef = useRef(null);

  // Handle click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Calculate average scores for each user
  const userScores = users.map((user) => {
    const userAnswers = answers.filter((a) => a.target_id === user.id);
    let frequencySum = 0;
    let efficiencySum = 0;
    let count = 0;

    userAnswers.forEach((answer) => {
      if (answer.responses["1"]?.value && answer.responses["2"]?.value) {
        frequencySum += answer.responses["1"].value;
        efficiencySum += answer.responses["2"].value;
        count += 1;
      }
    });

    const avgFrequency = count > 0 ? (frequencySum / count).toFixed(2) : 0;
    const avgEfficiency = count > 0 ? (efficiencySum / count).toFixed(2) : 0;
    const totalAvg = count > 0 ? ((frequencySum + efficiencySum) / (count * 2)).toFixed(2) : 0;

    return {
      id: user.id,
      name: user.name,
      avgFrequency,
      avgEfficiency,
      totalAvg,
    };
  });

  // Data for bar chart
  const chartData = {
    labels: userScores.map((user) => user.name),
    datasets: [
      {
        label: "Середня оцінка",
        data: userScores.map((user) => user.totalAvg),
        backgroundColor: userScores.map((_, i) =>
          ["#4a6fa5", "#6b2d3c", "#1a3c34", "#3b5a87"][i % 4]
        ),
        borderColor: userScores.map((_, i) =>
          ["#4a6fa5", "#6b2d3c", "#1a3c34", "#3b5a87"][i % 4]
        ),
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        labels: {
          color: "#e0e0e0",
        },
      },
      title: {
        display: true,
        text: "Середні оцінки учасників",
        color: "#e0e0e0",
        font: {
          size: 16,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 5,
        ticks: {
          color: "#e0e0e0",
        },
        grid: {
          color: "#4a4a4a",
        },
      },
      x: {
        ticks: {
          color: "#e0e0e0",
        },
        grid: {
          color: "#4a4a4a",
        },
      },
    },
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} ref={modalRef}>
        <button className={styles.closeButton} onClick={onClose}>
          ×
        </button>
        <h2 className={styles.modalHeading}>Загальний результат</h2>
        <table className={styles.evaluationsTable}>
          <thead>
            <tr>
              <th>Учасник</th>
              <th>Частота комунікації</th>
              <th>Ефективність комунікації</th>
              <th>Середня оцінка</th>
            </tr>
          </thead>
          <tbody>
            {userScores.length > 0 ? (
              userScores.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.avgFrequency}</td>
                  <td>{user.avgEfficiency}</td>
                  <td>{user.totalAvg}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4">Немає даних</td>
              </tr>
            )}
          </tbody>
        </table>
        <div className={styles.chartContainer}>
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
}

export default SummaryTable;