import { useState, useEffect } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { db } from "../../firebase";
import {
  collection,
  query,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import chroma from "chroma-js";

function GraphPage() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [userIdToColor, setUserIdToColor] = useState({});
  const [readyToShow, setReadyToShow] = useState(false);

  useEffect(() => {
    let unsubscribeUsers, unsubscribeAnswers;

    async function checkAndLoad() {
      try {
        // Загрузка пользователей
        const usersQuery = query(collection(db, "users"));
        unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
          const users = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          // Загрузка ответов
          const answersQuery = query(collection(db, "answers"));
          unsubscribeAnswers = onSnapshot(answersQuery, (snapshot) => {
            const answers = snapshot.docs.map((doc) => doc.data());

            // Проверка, все ли ответы отправлены
            const expectedAnswersPerUser = (users.length - 1) * 5; // 5 вопросов на каждого
            const submittedMap = {};
            answers.forEach((a) => {
              if (!submittedMap[a.evaluator_name]) submittedMap[a.evaluator_name] = 0;
              submittedMap[a.evaluator_name] += 1;
            });

            const allSubmitted = users.every(
              (u) => !submittedMap[u.name] || submittedMap[u.name] === expectedAnswersPerUser
            );
            console.log("Все ответы отправлены:", allSubmitted, submittedMap);

            if (!allSubmitted) {
              setReadyToShow(false);
              return;
            }

            setReadyToShow(true);

            // Логика построения графа
            const avgScores = {};
            const counts = {};
            answers.forEach((a) => {
              if (!avgScores[a.target_id]) {
                avgScores[a.target_id] = 0;
                counts[a.target_id] = 0;
              }
              avgScores[a.target_id] += a.value || 0;
              counts[a.target_id] += 1;
            });

            const averages = users.map((u) =>
              counts[u.id] ? avgScores[u.id] / counts[u.id] : 0
            );
            const maxAvg = Math.max(...(averages.filter((v) => v > 0) || [1]));
            const minAvg = Math.min(...(averages.filter((v) => v > 0) || [0]));

            const colorScale = chroma.scale("Set1").mode("lab");
            const colorMap = {};
            users.forEach((u, i) => {
              colorMap[u.id] = colorScale(i / users.length).hex();
            });
            setUserIdToColor(colorMap);

            const nodes = users.map((user) => {
              const avg = counts[user.id] ? avgScores[user.id] / counts[user.id] : 0;
              const normalized = maxAvg > minAvg ? (avg - minAvg) / (maxAvg - minAvg) : 0;
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
            answers.forEach((a) => {
              const sourceId = users.find((u) => u.name === a.evaluator_name)?.id;
              const targetId = a.target_id;
              if (!sourceId || sourceId === targetId) return;
              const key = `${sourceId}-${targetId}`;
              if (!linkMap[key]) {
                linkMap[key] = {
                  count: 0,
                  sum: 0,
                  source: sourceId,
                  target: targetId,
                };
              }
              linkMap[key].sum += a.value || 0;
              linkMap[key].count += 1;
            });

            const links = Object.values(linkMap).map((l) => {
              const avgValue = l.count > 0 ? l.sum / l.count : 1;
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
      const answersQuery = query(collection(db, "answers"));
      const unsubscribe = onSnapshot(answersQuery, (snapshot) => {
        snapshot.forEach((doc) => doc.ref.delete());
      }, (err) => {
        console.error("Ошибка очистки ответов:", err);
      });

      const usersQuery = query(collection(db, "users"));
      onSnapshot(usersQuery, (snapshot) => {
        snapshot.forEach((doc) => updateDoc(doc.ref, { submitted: false }));
      }, (err) => {
        console.error("Ошибка сброса submitted:", err);
      });

      const statusDoc = doc(db, "test_status", "status");
      await updateDoc(statusDoc, { reset_needed: true });

      console.log("Сброс выполнен");
      window.location.href = "/";
    } catch (err) {
      console.error("Общая ошибка сброса:", err);
      alert("Ошибка при сбросе: " + err.message);
    }
  }

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      {!readyToShow ? (
        <div
          style={{ textAlign: "center", paddingTop: "40vh", fontSize: "20px" }}
        >
          Очікуємо відповіді від усіх учасників...
        </div>
      ) : (
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
          cooldownTicks={0}
          onEngineStop={() => {
            window.forceGraph && window.forceGraph.zoomToFit(400);
          }}
          ref={(fg) => (window.forceGraph = fg)}
        />
      )}
      <div style={{ textAlign: "center", padding: "1rem" }}>
        <button
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            padding: "10px 16px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "8px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
            cursor: "pointer",
            fontSize: "14px",
            zIndex: 999,
            opacity: readyToShow ? 1 : 0.5,
            pointerEvents: readyToShow ? "auto" : "none",
          }}
          onClick={handleFullReset}
          disabled={!readyToShow}
        >
          ⬅ Повернутися на головну
        </button>
      </div>
    </div>
  );
}

export default GraphPage;