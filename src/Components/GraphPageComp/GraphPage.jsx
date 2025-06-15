import { useState, useEffect } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { db } from "../../firebase";
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  runTransaction,
} from "firebase/firestore";
import chroma from "chroma-js";
import UserModal from "../UserModalComp/UserModal";
import styles from "./GraphPage.module.css";

function GraphPage() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [userIdToColor, setUserIdToColor] = useState({});
  const [readyToShow, setReadyToShow] = useState(false);
  const [users, setUsers] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    let unsubscribeUsers, unsubscribeAnswers;

    async function checkAndLoad() {
      try {
        const usersQuery = query(collection(db, "users"));
        unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
          const usersData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          console.log("Users data:", usersData);
          setUsers(usersData);

          const answersQuery = query(collection(db, "answers"));
          unsubscribeAnswers = onSnapshot(answersQuery, (snapshot) => {
            const answersData = snapshot.docs.map((doc) => doc.data());
            console.log("Answers data:", answersData);
            setAnswers(answersData);

            const expectedSubmissionsPerUser = usersData.length - 1;
            const submittedMap = {};
            answersData.forEach((a) => {
              const evaluatorName = a.evaluator_name?.trim().toLowerCase();
              submittedMap[evaluatorName] = (submittedMap[evaluatorName] || 0) + 1;
            });
            console.log("Submitted map:", submittedMap);

            const allSubmitted = usersData.every(
              (user) => {
                const userName = user.name?.trim().toLowerCase();
                const submissions = submittedMap[userName] || 0;
                console.log(`User: ${userName}, Submissions: ${submissions}, Expected: ${expectedSubmissionsPerUser}`);
                return submissions === expectedSubmissionsPerUser;
              }
            );
            console.log("All submitted:", allSubmitted);

            const allUsersSubmitted = usersData.every((user) => user.submitted === true);
            console.log("All users submitted (fallback):", allUsersSubmitted);

            if (allSubmitted || (allUsersSubmitted && usersData.length > 0)) {
              setReadyToShow(true);

              const avgScores = {};
              const counts = {};
              answersData.forEach((a) => {
                const targetId = a.target_id;
                if (!avgScores[targetId]) {
                  avgScores[targetId] = 0;
                  counts[targetId] = 0;
                }
                const score = (a.responses["1"]?.value || 0) + (a.responses["2"]?.value || 0);
                avgScores[targetId] += score;
                counts[targetId] += a.responses["0"]?.willingToCommunicate ? 1 : 0;
              });

              const averages = usersData.map((user) =>
                counts[user.id] ? Math.max(0, avgScores[user.id] / (counts[user.id] * 2)) : 0
              );
              const maxAvg = Math.max(...(averages.filter((v) => v > 0) || [1]));
              const minAvg = Math.min(...(averages.filter((v) => v > 0) || [0]));

              const colorScale = chroma.scale(["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEEAD"]).mode("lab");
              const colorMap = {};
              usersData.forEach((user, i) => {
                colorMap[user.id] = colorScale(i / usersData.length).hex();
              });
              setUserIdToColor(colorMap);

              const angleStep = (2 * Math.PI) / usersData.length;
              const radius = 400;
              const minDistance = 150;
              const nodes = usersData.map((user, i) => {
                const avg = counts[user.id] ? Math.max(0, avgScores[user.id] / (counts[user.id] * 2)) : 0;
                const normalized = maxAvg > minAvg ? (avg - minAvg) / (maxAvg - minAvg) : 0;
                const baseSize = 20;
                const maxSize = 50;
                const nodeSize = Math.max(baseSize, baseSize + normalized * maxSize);
                return {
                  id: user.id,
                  name: user.name,
                  val: nodeSize,
                  x: radius * Math.cos(i * angleStep),
                  y: radius * Math.sin(i * angleStep),
                };
              });

              const linkMap = {};
              answersData.forEach((a) => {
                const sourceId = usersData.find((user) => user.name?.trim().toLowerCase() === a.evaluator_name?.trim().toLowerCase())?.id;
                const targetId = a.target_id;
                if (!sourceId || sourceId === targetId || !a.responses["0"]?.willingToCommunicate) return;
                const key = `${sourceId}-${targetId}`;
                if (!linkMap[key]) {
                  linkMap[key] = {
                    count: 0,
                    sum: 0,
                    source: sourceId,
                    target: targetId,
                  };
                }
                const score = (a.responses["1"]?.value || 0) + (a.responses["2"]?.value || 0);
                linkMap[key].sum += score;
                linkMap[key].count += 1;
              });

              const links = Object.values(linkMap).map((l) => {
                const avgValue = l.count > 0 ? l.sum / (l.count * 2) : 1;
                const valueNorm = Math.min(1, avgValue / 5);
                const sourceColor = colorMap[l.source];
                const linkColor = chroma(sourceColor).darken(0.3).hex();
                return {
                  source: l.source,
                  target: l.target,
                  value: avgValue,
                  width: 1 + valueNorm * 5,
                  color: linkColor,
                  distance: minDistance + (1 - valueNorm) * 100,
                  curvature: 0.2 * (Math.random() - 0.5),
                };
              });

              setGraphData({ nodes, links });
            } else {
              setReadyToShow(false);
            }
          }, (err) => {
            console.error("Ошибка загрузки ответов:", err);
          });
        }, (err) => {
          console.error("Ошибка загрузки пользователей:", err);
        });
      } catch (err) {
        console.error("Общая ошибка загрузки данных:", err);
      }
    }

    checkAndLoad();

    return () => {
      if (unsubscribeUsers) unsubscribeUsers();
      if (unsubscribeAnswers) unsubscribeAnswers();
    };
  }, []);

  async function handleFullReset() {
    try {
      const statusDoc = doc(db, "test_status", "status");

      await runTransaction(db, async (transaction) => {
        // Get and delete all answers
        const answersQuery = query(collection(db, "answers"));
        const answersSnapshot = await transaction.get(answersQuery);
        if (!answersSnapshot.empty) {
          const deleteAnswersPromises = answersSnapshot.docs.map((doc) => {
            console.log("Deleting answer doc:", doc.id);
            return transaction.delete(doc.ref);
          });
          await Promise.all(deleteAnswersPromises);
        } else {
          console.log("No answers to delete");
        }

        // Reset all users
        const usersQuery = query(collection(db, "users"));
        const usersSnapshot = await transaction.get(usersQuery);
        if (!usersSnapshot.empty) {
          const updateUsersPromises = usersSnapshot.docs.map((doc) => {
            console.log("Updating user doc:", doc.id);
            return transaction.update(doc.ref, { submitted: false });
          });
          await Promise.all(updateUsersPromises);
        } else {
          console.log("No users to update");
        }

        // Reset status
        const statusSnapshot = await transaction.get(statusDoc);
        if (statusSnapshot.exists()) {
          console.log("Updating status doc");
          transaction.update(statusDoc, {
            started: false,
            participantsSubmitted: 0,
            totalParticipants: 0,
            allSubmitted: false,
            reset_needed: false,
          });
        } else {
          console.log("Status doc does not exist, creating new");
          transaction.set(statusDoc, {
            started: false,
            participantsSubmitted: 0,
            totalParticipants: 0,
            allSubmitted: false,
            reset_needed: false,
          });
        }

        console.log("Transaction completed successfully");
      });

      // Clear local storage
      localStorage.clear();
      console.log("Local storage cleared");

      console.log("Сброс выполнен");
      window.location.href = "/";
    } catch (err) {
      console.error("Общая ошибка сброса:", err);
      alert("Ошибка при сбросе: " + err.message);
    }
  }

  return (
    <div className={styles.graphPage}>
      <div className={styles.bubbles} id="bubbles"></div>
      {!readyToShow ? (
        <div className={styles.formContainer}>
          <h1 className={styles.formHeading}>Очікуємо відповіді від усіх учасників...</h1>
        </div>
      ) : (
        <>
          <ForceGraph2D
            graphData={graphData}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const label = node.name;
              const fontSize = Math.max(12, 18 / globalScale);
              ctx.font = `${fontSize}px Sans-Serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";

              ctx.fillStyle = userIdToColor[node.id] || "#45B7D1";
              ctx.beginPath();
              ctx.arc(node.x, node.y, node.val / 2, 0, 2 * Math.PI, false);
              ctx.fill();

              ctx.fillStyle = "white";
              ctx.fillText(label, node.x, node.y);
            }}
            nodeVal={(node) => node.val / 2}
            nodeColor={(node) => userIdToColor[node.id]}
            onNodeClick={(node) => {
              const user = users.find((u) => u.id === node.id);
              setSelectedUser(user);
            }}
            linkColor={(link) => link.color}
            linkWidth={(link) => link.width}
            linkDirectionalArrowLength={8}
            linkDirectionalArrowRelPos={0.9}
            linkCurvature={(link) => link.curvature}
            linkDirectionalParticles={2}
            linkDirectionalParticleSpeed={0.005}
            linkDirectionalParticleWidth={1}
            linkDirectionalParticleColor={() => "rgba(255, 255, 255, 0.6)"}
            linkDistance={(link) => link.distance}
            enablePhysics={false}
            cooldownTicks={0}
            ref={(fg) => (window.forceGraph = fg)}
          />
          <div className={`${styles.formContainer} ${styles.reset}`}>
            <button className={styles.resetButton} onClick={handleFullReset}>
              ⬅ Повернутися на головну
            </button>
          </div>
          {selectedUser && (
            <UserModal
              user={selectedUser}
              answers={answers}
              users={users}
              onClose={() => setSelectedUser(null)}
            />
          )}
        </>
      )}
    </div>
  );
}

export default GraphPage;