import confetti from "canvas-confetti";

/** A brief, restrained persimmon burst — used only on a client approval. */
export function celebrate(): void {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const base = {
    colors: ["#FF4F00", "#FF6A2B", "#F5F5F4"],
    disableForReducedMotion: true,
    origin: { y: 0.72 },
  };

  confetti({ ...base, particleCount: 55, spread: 52, startVelocity: 42, scalar: 0.9 });
  window.setTimeout(
    () => confetti({ ...base, particleCount: 35, spread: 100, decay: 0.92, scalar: 0.8 }),
    130,
  );
}
