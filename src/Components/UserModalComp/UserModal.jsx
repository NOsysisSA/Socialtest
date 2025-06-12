import { useEffect, useRef } from "react";
import "./stylesUserModal.css";

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

  if (!user) return null;

  const userAnswers = answers.filter((a) => a.target_id === user.id);

  return (
    <div className="modal-overlay">
      <div className="modal-content" ref={modalRef}>
        <button className="close-button" onClick={onClose}>
          ×
        </button>
        <h2 className="modal-heading">Оцінки для {user.name}</h2>
        <table className="evaluations-table">
          <thead>
            <tr>
              <th>Оцінювач</th>
              <th>Частота комунікації</th>
              <th>Ефективність комунікації</th>
            </tr>
          </thead>
          <tbody>
            {userAnswers.length > 0 ? (
              userAnswers.map((answer, index) => {
                const evaluator = users.find(
                  (u) => u.name === answer.evaluator_name
                );
                return (
                  <tr key={index}>
                    <td>{evaluator?.name || "Невідомий"}</td>
                    <td>{answer.responses["1"]?.value || "–"}</td>
                    <td>{answer.responses["2"]?.value || "–"}</td>
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
        <div className="comments-section">
          <h3>Коментарі</h3>
          {userAnswers.some((a) => a.responses["3"]?.comment) ? (
            userAnswers
              .filter((a) => a.responses["3"]?.comment)
              .map((answer, index) => {
                const evaluator = users.find(
                  (u) => u.name === answer.evaluator_name
                );
                return (
                  <div key={index} className="comment">
                    <strong>{evaluator?.name || "Невідомий"}:</strong>{" "}
                    {answer.responses["3"].comment}
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
