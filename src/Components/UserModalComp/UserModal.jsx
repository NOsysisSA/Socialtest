import { useEffect, useRef } from "react";
import styles from "./UserModal.module.css";

function UserModal({ user, answers, users, onClose }) {
  const modalRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  console.log("UserModal props:", { user, answers, users });
  console.log("User answers:", answers.filter((a) => a.target_id === user?.id));

  if (!user) return null;

  const userAnswers = answers.filter((a) => a.target_id === user.id);

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} ref={modalRef}>
        <button className={styles.closeButton} onClick={onClose}>
          ×
        </button>
        <h2 className={styles.modalHeading}>Оцінки для {user.name}</h2>
        <table className={styles.evaluationsTable}>
          <thead>
            <tr>
              <th>Оцінювач</th>
              <th>Частота комунікації</th>
              <th>Ефективність комунікації</th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? (
              users
                .filter((u) => u.id !== user.id)
                .map((evaluator, index) => {
                  const answer = userAnswers.find(
                    (a) => a.evaluator_name.trim().toLowerCase() === evaluator.name.trim().toLowerCase()
                  );
                  console.log(`Evaluator: ${evaluator.name}, Answer:`, answer);
                  return (
                    <tr key={evaluator.id || index}>
                      <td>{evaluator.name || "Невідомий"}</td>
                      <td>{answer ? answer.responses["1"]?.value || "–" : "–"}</td>
                      <td>{answer ? answer.responses["2"]?.value || "–" : "–"}</td>
                    </tr>
                  );
                })
            ) : (
              <tr>
                <td colSpan="3">Немає оцінок</td>
              </tr>
            )}
          </tbody>
        </table>
        <div className={styles.commentsSection}>
          <h3>Коментарі</h3>
          {userAnswers.some((a) => a.responses["3"]?.comment) ? (
            userAnswers
              .filter((a) => a.responses["3"]?.comment)
              .map((answer, index) => {
                const evaluator = users.find(
                  (u) => u.name.trim().toLowerCase() === answer.evaluator_name.trim().toLowerCase()
                );
                return (
                  <div key={index} className={styles.comment}>
                    <strong>{evaluator?.name || "Невідомий"}:</strong> {answer.responses["3"].comment}
                  </div>
                );
              })
          ) : (
            <p>Немає коментарів</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserModal;