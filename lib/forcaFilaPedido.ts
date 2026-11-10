const CHAVE = "masc_forca_fila_pedidos";

export type PedidoNaFila = {
  id: string;
  criado_em: string;
  url: string;
  body: Record<string, unknown>;
  cliente: string;
  ultimo_erro?: string;
  permanente?: boolean;
};

export function listarFilaPedido(): PedidoNaFila[] {
  if (typeof window === "undefined") return [];
  try {
    const bruto = JSON.parse(window.localStorage.getItem(CHAVE) || "[]");
    return Array.isArray(bruto) ? bruto : [];
  } catch {
    return [];
  }
}

export function guardarPedidoOffline(pedido: PedidoNaFila) {
  const lista = listarFilaPedido().filter((item) => item.id !== pedido.id);
  lista.push(pedido);
  window.localStorage.setItem(CHAVE, JSON.stringify(lista));
  window.dispatchEvent(new Event("forca-fila"));
}

export function atualizarFilaPedido(lista: PedidoNaFila[]) {
  window.localStorage.setItem(CHAVE, JSON.stringify(lista));
  window.dispatchEvent(new Event("forca-fila"));
}

export async function enviarFilaPedido() {
  if (typeof navigator !== "undefined" && !navigator.onLine) return { enviados: 0, pendentes: listarFilaPedido().length };
  const lista = listarFilaPedido();
  const restantes: PedidoNaFila[] = [];
  let enviados = 0;

  for (const pedido of lista) {
    if (pedido.permanente) {
      restantes.push(pedido);
      continue;
    }
    try {
      const res = await fetch(pedido.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(pedido.body),
      });
      const d = await res.json().catch(() => null);
      if (res.ok && d?.ok) {
        enviados += 1;
        continue;
      }
      if (res.status === 401) {
        restantes.push(...lista.slice(lista.indexOf(pedido)));
        break;
      }
      restantes.push({
        ...pedido,
        ultimo_erro: d?.error || "Não foi possível enviar o pedido.",
        permanente: res.status >= 400 && res.status < 500,
      });
    } catch {
      restantes.push(...lista.slice(lista.indexOf(pedido)));
      break;
    }
  }

  atualizarFilaPedido(restantes);
  return { enviados, pendentes: restantes.length };
}
