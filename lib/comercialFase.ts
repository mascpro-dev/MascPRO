/** Único número para o topo do painel. Avance aqui quando a fase seguinte entrar. */
export const FASE_COMERCIAL = 6;
export const FASE_COMERCIAL_TOTAL = 7;

export const FASE_COMERCIAL_LEGENDA: Record<number, string> = {
  1: "Ver · funil · semáforo",
  2: "Classificar lead e linha",
  3: "Régua · kit · recompra",
  4: "Score da rede",
  5: "Prova · evento",
  6: "Alarmes",
  7: "IA e WhatsApp",
};

export function rotuloFaseComercial(fase = FASE_COMERCIAL) {
  return `Fase ${fase}`;
}

export function resumoFaseComercial(fase = FASE_COMERCIAL) {
  return FASE_COMERCIAL_LEGENDA[fase] || "";
}
