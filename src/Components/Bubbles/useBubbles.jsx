import { useEffect } from "react";

export function useBubbles() {
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
}