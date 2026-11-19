export function LogoIcon({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden>
      <rect x="4" y="4" width="192" height="192" rx="44" fill="#1F7A5A" />
      <path d="M50 48 h100 a22 22 0 0 1 22 22 v52 a22 22 0 0 1 -22 22 h-52 l-30 24 v-24 h-18 a22 22 0 0 1 -22 -22 v-52 a22 22 0 0 1 22 -22z" fill="#fff" />
      <g transform="rotate(-45 100 96)"><rect x="93" y="70" width="14" height="62" rx="7" fill="#23303B" /><circle cx="100" cy="66" r="19" fill="#23303B" /><rect x="94" y="44" width="12" height="20" rx="2" fill="#fff" /></g>
      <circle cx="134" cy="118" r="17" fill="#F28C28" />
      <path d="M126 118 l6 6 l11 -12" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function Wordmark({ light = false, size = "text-2xl" }: { light?: boolean; size?: string }) {
  return <span className={`${size} font-extrabold tracking-tight`}><span className={light ? "text-white" : "text-selva"}>Bi</span><span className={light ? "text-white" : "text-grafito"}>taller</span><span className="text-motor">.</span></span>;
}
