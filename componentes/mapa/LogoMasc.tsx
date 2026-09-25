export default function LogoMasc({
  className = "h-10 w-auto",
  branca = false,
}: {
  className?: string;
  branca?: boolean;
}) {
  return (
    <img
      src={branca ? "/logo-masc-branco.png" : "/logo-masc.png"}
      alt="MASC PRO"
      className={`object-contain ${className}`}
    />
  );
}
