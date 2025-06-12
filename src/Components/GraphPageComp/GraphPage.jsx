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
} from "firebase/firestore";
import chroma from "chroma-js";
import UserModal from "../UserModalComp/UserModal";
import "./stylesGraphPage.css";

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
        unsubscribeUsers = onSnapshot(
          usersQuery,
          (snapshot) => {
            const usersData = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            setUsers(usersData);

            const answersQuery = query(collection(db, "answers"));
            unsubscribeAnswers = onSnapshot(
              answersQuery,
              (snapshot) => {
                const answersData = snapshot.docs.map((doc) => doc.data());
                setAnswers(answersData);

                const expectedSubmissionsPerUser = usersData.length - 1;
                const submittedMap = {};
                answersData.forEach((a) => {
                  submittedMap[a.evaluator_name] =
                    (submittedMap[a.evaluator_name] || 0) + 1;
                });

                const allSubmitted = usersData.every(
                  (u) => submittedMap[u.name] === expectedSubmissionsPerUser
                );
                console.log(
                  "Все ответы отправлены:",
                  allSubmitted,
                  submittedMap
                );

                if (!allSubmitted) {
                  setReadyToShow(false);
                  return;
                }

                setReadyToShow(true);

                const avgScores = {};
                const counts = {};
                answersData.forEach((a) => {
                  const targetId = a.target_id;
                  if (!avgScores[targetId]) {
                    avgScores[targetId] = 0;
                    counts[targetId] = 0;
                  }
                  const score =
                    (a.responses["1"]?.value || 0) +
                    (a.responses["2"]?.value || 0);
                  avgScores[targetId] += score;
                  counts[targetId] += a.responses["0"]?.willingToCommunicate
                    ? 1
                    : 0;
                });

                const averages = usersData.map((u) =>
                  counts[u.id] ? avgScores[u.id] / (counts[u.id] * 2) : 0
                );
                const maxAvg = Math.max(
                  ...(averages.filter((v) => v > 0) || [1])
                );
                const minAvg = Math.min(
                  ...(averages.filter((v) => v > 0) || [0])
                );

                const colorScale = chroma.scale("Set1").mode("lab");
                const colorMap = {};
                usersData.forEach((u, i) => {
                  colorMap[u.id] = colorScale(i / usersData.length).hex();
                });
                setUserIdToColor(colorMap);

                const nodes = usersData.map((user) => {
                  const avg = counts[user.id]
                    ? avgScores[user.id] / (counts[user.id] * 2)
                    : 0;
                  const normalized =
                    maxAvg > minAvg ? (avg - minAvg) / (maxAvg - minAvg) : 0;
                  const baseSize = 20;
                  const maxSize = 80;
                  const nodeSize = baseSize + normalized * maxSize;
                  return {
                    id: user.id,
                    name: user.name,
                    val: nodeSize,
                    x: Math.random() * 1600 - 800,
                    y: Math.random() * 1600 - 800,
                  };
                });

                const linkMap = {};
                answersData.forEach((a) => {
                  const sourceId = usersData.find(
                    (u) => u.name === a.evaluator_name
                  )?.id;
                  const targetId = a.target_id;
                  if (
                    !sourceId ||
                    sourceId === targetId ||
                    !a.responses["0"]?.willingToCommunicate
                  )
                    return;
                  const key = `${sourceId}-${targetId}`;
                  if (!linkMap[key]) {
                    linkMap[key] = {
                      count: 0,
                      sum: 0,
                      source: sourceId,
                      target: targetId,
                    };
                  }
                  const score =
                    (a.responses["1"]?.value || 0) +
                    (a.responses["2"]?.value || 0);
                  linkMap[key].sum += score;
                  linkMap[key].count += 1;
                });

                const links = Object.values(linkMap).map((l) => {
                  const avgValue = l.count > 0 ? l.sum / (l.count * 2) : 1;
                  const valueNorm = Math.min(1, avgValue / 5);
                  const sourceColor = colorMap[l.source];
                  const linkColor = chroma(sourceColor).darken(0.5).hex();
                  return {
                    source: l.source,
                    target: l.target,
                    value: avgValue,
                    width: 2 + valueNorm * 15,
                    color: linkColor,
                    distance: 100 + (1 - valueNorm) * 90,
                    curvature: 0.6 * (Math.random() - 0.5),
                  };
                });

                setGraphData({ nodes, links });
              },
              (err) => {
                console.error("Ошибка загрузки ответов:", err);
              }
            );
          },
          (err) => {
            console.error("Ошибка загрузки пользователей:", err);
          }
        );
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
      const answersQuery = query(collection(db, "answers"));
      onSnapshot(
        answersQuery,
        (snapshot) => {
          snapshot.forEach((doc) => deleteDoc(doc.ref));
        },
        (err) => {
          console.error("Ошибка очистки ответов:", err);
        }
      );

      const usersQuery = query(collection(db, "users"));
      onSnapshot(
        usersQuery,
        (snapshot) => {
          snapshot.forEach((doc) => updateDoc(doc.ref, { submitted: false }));
        },
        (err) => {
          console.error("Ошибка сброса submitted:", err);
        }
      );

      const statusDoc = doc(db, "test_status", "status");
      await updateDoc(statusDoc, {
        started: false,
        participantsSubmitted: 0,
        allSubmitted: false,
        reset_needed: true,
      });

      console.log("Сброс выполнен");
      window.location.href = "/";
    } catch (err) {
      console.error("Общая ошибка сброса:", err);
      alert("Ошибка при сбросе: " + err.message);
    }
  }

  return (
    <div className="graph-page">
      <div className="bubbles" id="bubbles"></div>
      {!readyToShow ? (
        <div className="form-container">
          <h1 className="form-heading">
            Очікуємо відповіді від усіх учасників...
          </h1>
        </div>
      ) : (
        <>
          <ForceGraph2D
            graphData={graphData}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const label = node.name;
              const fontSize = Math.max(10, 15 / globalScale);
              ctx.font = `${fontSize}px Sans-Serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "top";

              ctx.fillStyle = userIdToColor[node.id] || "gray";
              ctx.beginPath();
              ctx.arc(node.x, node.y, node.val / 2, 0, 2 * Math.PI, false);
              ctx.fill();

              ctx.fillStyle = "white";
              const textWidth = ctx.measureText(label).width;
              const padding = 5;
              const rectHeight = fontSize + padding * 2;
              ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
              ctx.fillRect(
                node.x - textWidth / 2 - padding,
                node.y - node.val / 2 - rectHeight,
                textWidth + padding * 2,
                rectHeight
              );
              ctx.fillStyle = "white";
              ctx.fillText(
                label,
                node.x,
                node.y - node.val / 2 - rectHeight / 2 + padding
              );
            }}
            nodeVal={(node) => node.val / 2}
            nodeColor={(node) => userIdToColor[node.id]}
            onNodeClick={(node) => {
              const user = users.find((u) => u.id === node.id);
              setSelectedUser(user);
            }}
            linkColor={(link) => link.color}
            linkWidth={(link) => link.width}
            linkDirectionalArrowLength={12}
            linkDirectionalArrowRelPos={1}
            linkCurvature={(link) => link.curvature || 0.2}
            linkDirectionalParticles={6}
            linkDirectionalParticleSpeed={0.015}
            linkDirectionalParticleWidth={3}
            linkDirectionalParticleColor={() => "rgba(255, 255, 255, 0.8)"}
            linkDistance={(link) => link.distance}
            cooldownTicks={200}
            onEngineStop={() => {
              window.forceGraph && window.forceGraph.zoomToFit(400);
            }}
            ref={(fg) => (window.forceGraph = fg)}
          />
          <div className="form-container">
            <button className="reset-button" onClick={handleFullReset}>
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
