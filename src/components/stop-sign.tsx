/**
 * The green "H" in a yellow circle: the sign at every tram and bus stop in Germany
 * (traffic sign 224, "Haltestelle"). Used as the app's logo.
 */
export function StopSign({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={className}
      focusable="false"
    >
      <circle cx="16" cy="16" r="15" fill="var(--sign-yellow)" stroke="var(--sign-green)" strokeWidth="2" />
      <path d="M10.5 8.5h3v6h5v-6h3v15h-3v-6.2h-5v6.2h-3z" fill="var(--sign-green)" />
    </svg>
  );
}
