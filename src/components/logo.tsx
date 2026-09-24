import logoMark from "@/assets/roostni-logo-mark.png";

export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <img
      src={logoMark}
      alt="RoostNI"
      width={32}
      height={32}
      className={`shrink-0 ${className}`}
    />
  );
}
