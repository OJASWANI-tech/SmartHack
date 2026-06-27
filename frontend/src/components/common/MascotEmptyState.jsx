// Subtle mascot empty-state. Lives only in low-density "nothing here yet" voids —
// never inside busy tables or metric grids — so it reads as a small delight and
// never disturbs layout. Theme-aware via CSS vars; degrades gracefully if the
// preferred art isn't present (falls back to the hero pose, then hides).
export default function MascotEmptyState({
  message,
  src = '/robot-empty.png',
  fallbackSrc = '/robot-hero.png',
  size = 84,
  style,
}) {
  const handleError = (e) => {
    const img = e.currentTarget;
    if (fallbackSrc && img.dataset.fellBack !== '1') {
      img.dataset.fellBack = '1';
      img.src = fallbackSrc;
    } else {
      img.style.display = 'none';
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '1.25rem 1rem',
        textAlign: 'center',
        ...style,
      }}
    >
      <img
        src={src}
        alt=""
        aria-hidden="true"
        draggable={false}
        onError={handleError}
        style={{
          width: `${size}px`,
          height: 'auto',
          opacity: 0.9,
          filter: 'drop-shadow(0 10px 18px rgba(0,0,0,0.14))',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      />
      <span
        style={{
          color: 'var(--text-secondary)',
          fontSize: '0.78rem',
          lineHeight: 1.45,
          maxWidth: '260px',
        }}
      >
        {message}
      </span>
    </div>
  );
}
