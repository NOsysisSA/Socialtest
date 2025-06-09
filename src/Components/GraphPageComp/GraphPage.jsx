import React, { useEffect, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import chroma from "chroma-js";

function GraphPage() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [userIdToColor, setUserIdToColor] = useState({});
  const [readyToShow, setReadyToShow] = useState(false);
  const navigate = useNavigate();

useEffect(() => {
  let subscription;

  async function checkAndLoad() {
    const { data: users } = await supabase.from("users").select("*");
    const { data: answers } = await supabase.from("answers").select("*");

    if (!users || !answers) return;

    const expectedAnswersPerUser = (users.length - 1) * 5;
    const submittedMap = {};
    answers.forEach((a) => {
      if (!submittedMap[a.evaluator_name]) submittedMap[a.evaluator_name] = 0;
      submittedMap[a.evaluator_name] += 1;
    });

    const allSubmitted = users.every(
      (u) => submittedMap[u.name] === expectedAnswersPerUser
    );

    if (!allSubmitted) {
      setReadyToShow(false);
      return;
    } else {
      setReadyToShow(true);
    }

    // ... (побудова графа — залиш як є в тебе)
    const avgScores = {};
    const counts = {};
    answers.forEach((a) => {
      if (!avgScores[a.target_id]) {
        avgScores[a.target_id] = 0;
        counts[a.target_id] = 0;
      }
      avgScores[a.target_id] += a.value;
      counts[a.target_id] += 1;
    });

    const averages = users.map((u) =>
      counts[u.id] ? avgScores[u.id] / counts[u.id] : 0
    );
    const maxAvg = Math.max(...averages);
    const minAvg = Math.min(...averages);

    const colorScale = chroma.scale("Set1").mode("lab");
    const colorMap = {};
    users.forEach((u, i) => {
      colorMap[u.id] = colorScale(i / users.length).hex();
    });
    setUserIdToColor(colorMap);

    const nodes = users.map((user) => {
      const avg = counts[user.id] ? avgScores[user.id] / counts[user.id] : 0;
      const normalized = (avg - minAvg) / (maxAvg - minAvg || 1);
      return {
        id: user.id,
        name: user.name,
        val: 20 + normalized * 80,
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
        linkMap[key] = { count: 0, sum: 0, source: sourceId, target: targetId };
      }
      linkMap[key].sum += a.value;
      linkMap[key].count += 1;
    });

    const links = Object.values(linkMap).map((l) => {
      const avgValue = l.sum / l.count;
      const valueNorm = avgValue / 5;
      return {
        source: l.source,
        target: l.target,
        value: avgValue,
        width: 1 + valueNorm * 10,
        color: chroma(colorMap[l.source]).darken(1.5).hex(),
        distance: 100 + (1 - valueNorm) * 90,
        curvature: 0.6 * (Math.random() - 0.5),
      };
    });

    setGraphData({ nodes, links });
  }

  checkAndLoad();

  // 🔴 ПІДПИСКА на зміни у answers
  subscription = supabase
    .channel("answers-graph-subscribe")
    .on("postgres_changes", { event: "*", schema: "public", table: "answers" }, () => {
      checkAndLoad(); // повторна перевірка і побудова графа
    })
    .subscribe();

  return () => {
    if (subscription) supabase.removeChannel(subscription);
  };
}, []);

  const handleFullReset = async () => {
    const { error } = await supabase.rpc("full_reset");
    if (error) {
      alert("Помилка при скиданні: " + error.message);
    } else {
      alert("Дані скинуто");
      window.location.href = "/";
    }
  };

  const floatingButtonStyle = {
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
  };

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      {!readyToShow ? (
        <div style={{ textAlign: "center", paddingTop: "40vh", fontSize: "20px" }}>
          Очікуємо відповіді від усіх учасників...
        </div>
      ) : (
        <ForceGraph2D
          graphData={graphData}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const label = node.name;
            const fontSize = 12 / globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            ctx.fillStyle = userIdToColor[node.id] || "gray";
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI, false);
            ctx.fill();

            ctx.fillStyle = "white";
            ctx.fillText(label, node.x, node.y);
          }}
          nodeVal={(node) => node.val}
          nodeColor={(node) => userIdToColor[node.id]}
          linkColor={(link) => link.color}
          linkWidth={(link) => link.width}
          linkDirectionalArrowLength={12}
          linkDirectionalArrowRelPos={1}
          linkCurvature={(link) => link.curvature || 0.2}
          linkDirectionalParticles={0}
          linkDistance={(link) => link.distance}
          cooldownTicks={0}
          onEngineStop={() => {
            window.forceGraph && window.forceGraph.zoomToFit(400);
          }}
          ref={(fg) => (window.forceGraph = fg)}
        />
      )}
      <div style={{ textAlign: "center", padding: "1rem" }}>
        <button style={floatingButtonStyle} onClick={handleFullReset}>
          ⬅ Повернутися на головну
        </button>
      </div>
    </div>
  );
}

export default GraphPage;
