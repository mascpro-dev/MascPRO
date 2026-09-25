import { Suspense } from "react";
import MapaApp from "@/componentes/mapa/MapaApp";

export default function MapaPage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center text-sm text-zinc-500">Abrindo o mapa…</div>}>
      <MapaApp />
    </Suspense>
  );
}
