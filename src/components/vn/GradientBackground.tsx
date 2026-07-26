"use client";

import { useEffect, useRef } from "react";
import { animate } from "animejs";
import type { VNTheme } from "@/lib/vn-store";
import { cn } from "@/lib/utils";

interface GradientBackgroundProps {
  theme: VNTheme;
  className?: string;
}

/**
 * Animated generic gradient background, powered by animejs.
 * Renders multiple soft color blobs that drift around the screen
 * behind the app. Each theme gets its own palette and density.
 */
const THEME_PALETTES: Record<VNTheme, string[]> = {
  sakura: ["#ffd6e0", "#ffb6c1", "#ff8fab", "#ffc8d6", "#f8a5c2"],
  night: ["#4a2e6e", "#1f4068", "#6d28d9", "#312e81", "#5b21b6"],
  paper: ["#f7f3e8", "#efe6d3", "#e8d9b8", "#d4b896", "#c9a876"],
  ocean: ["#b8dde6", "#7ec8d8", "#5ab1c5", "#a3d4e0", "#6db5c8"],
};

export function GradientBackground({ theme, className }: GradientBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const blobsRef = useRef<HTMLDivElement[]>([]);

  // (Re)start animations whenever theme changes (different palette + speed).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Kill previous animations on every blob.
    blobsRef.current.forEach((b) => b && (b as any)._anime?.pause?.());

    // Generate blob configurations once.
    const palette = THEME_PALETTES[theme];
    const blobs = blobsRef.current.filter(Boolean);
    const speedFactor = theme === "night" ? 1.4 : theme === "paper" ? 0.8 : 1;

    blobs.forEach((blob, i) => {
      const color = palette[i % palette.length];
      blob.style.background = `radial-gradient(circle at 30% 30%, ${color}, transparent 70%)`;
      blob.style.opacity = theme === "night" ? "0.45" : "0.55";

      // Stagger the start position so blobs don't overlap initially.
      const startX = 10 + (i * 17) % 80;
      const startY = 10 + (i * 23) % 80;

      const animation = animate(blob, {
        translateX: [
          { to: `${startX + 25}vw`, duration: 8000 * speedFactor },
          { to: `${startX - 15}vw`, duration: 9000 * speedFactor },
          { to: `${startX}vw`, duration: 7000 * speedFactor },
        ],
        translateY: [
          { to: `${startY - 15}vh`, duration: 9000 * speedFactor },
          { to: `${startY + 20}vh`, duration: 8000 * speedFactor },
          { to: `${startY}vh`, duration: 10000 * speedFactor },
        ],
        scale: [
          { to: 1.3, duration: 6000 * speedFactor },
          { to: 0.8, duration: 7000 * speedFactor },
          { to: 1, duration: 8000 * speedFactor },
        ],
        rotate: [
          { to: 45, duration: 12000 * speedFactor },
          { to: -30, duration: 10000 * speedFactor },
          { to: 0, duration: 8000 * speedFactor },
        ],
        ease: "inOutSine",
        loop: true,
      });
      (blob as any)._anime = animation;
    });

    return () => {
      blobs.forEach((b) => (b as any)._anime?.pause?.());
    };
  }, [theme]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute inset-0 overflow-hidden pointer-events-none z-0",
        className
      )}
      aria-hidden
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          ref={(el) => {
            if (el) blobsRef.current[i] = el;
          }}
          className="absolute rounded-full blur-3xl"
          style={{
            width: "45vw",
            height: "45vw",
            left: 0,
            top: 0,
            willChange: "transform, opacity",
          }}
        />
      ))}
    </div>
  );
}
