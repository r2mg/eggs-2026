/**
 * Shimmer while episode art resolves (YouTube overlay + thumbnail load).
 * - Keyframes: `eggs-media-shimmer` in `src/styles/tailwind.css`.
 * - Colors: `--eggs-media-shimmer-*` in `src/styles/theme.css`.
 * - `z-[5]` keeps this **above** card scrim gradients (`z-[2]`) on Home / archive so the motion is not washed out.
 */
export function MediaLoadingShimmer({ retreating }: { retreating: boolean }) {
  return (
    <div
      className={`absolute inset-0 z-[5] overflow-hidden transition-opacity duration-500 ease-out ${
        retreating ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      aria-hidden
    >
      <div className="absolute inset-0" style={{ backgroundColor: 'var(--eggs-media-shimmer-base)' }} />
      <div
        className="pointer-events-none absolute inset-y-[-38%] w-[56%]"
        style={{
          opacity: 0.94,
          background:
            'linear-gradient(90deg, transparent 0%, var(--eggs-media-shimmer-highlight) 50%, transparent 100%)',
          animation: 'eggs-media-shimmer 1.35s cubic-bezier(0.42, 0, 0.58, 1) infinite',
        }}
      />
    </div>
  );
}
