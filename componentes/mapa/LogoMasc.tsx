export default function LogoMasc({ className = "h-10 w-auto" }: { className?: string }) {
  return <img src="/logo-masc.png" alt="MASC PRO" className={`object-contain ${className}`} />;
}
