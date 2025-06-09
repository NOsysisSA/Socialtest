import React, { useEffect, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { supabase } from "../supabaseClient";
import chroma from "chroma-js";

function GraphPage() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [userIdToColor, setUserIdToColor] = useState({});

  useEffect(() => {
    async function loadData() {
      const { data: users } = await supabase.from("users").select("*");
      const { data: answers } = await supabase.from("answers").select("*");
      if (!users || !answers) return;

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
          linkMap[key] = {
            count: 0,
            sum: 0,
            source: sourceId,
            target: targetId,
          };
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

    loadData();
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
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
    </div>
  );
}

export default GraphPage;
