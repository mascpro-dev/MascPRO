"use client";

import Link from "next/link";
import { PRODUTOS_TECNICOS } from "@/lib/catalogoTecnico";

export default function CatalogoTecnicoPage() {
  return (
    <div className="space-y-4">
      <Link href="/forca" className="text-xs font-bold uppercase tracking-widest text-zinc-500">
        Voltar
      </Link>
      {PRODUTOS_TECNICOS.length === 0 ? (
        <p className="text-sm text-zinc-400">Envie os produtos e as imagens para montar o catálogo técnico nesta tela.</p>
      ) : (
        <div className="space-y-4">
          {PRODUTOS_TECNICOS.map((produto) => (
            <article key={produto.id} className="overflow-hidden rounded-xl border border-white/10 bg-zinc-900">
              <div className="space-y-2 p-2">
                {produto.imagens.map((imagem) => (
                  <img key={imagem} src={imagem} alt={produto.nome} className="w-full rounded-lg object-cover" />
                ))}
              </div>
              <div className="px-3 pb-3">
                <p className="font-black">{produto.nome}</p>
                {produto.descricao && <p className="mt-1 text-sm text-zinc-400">{produto.descricao}</p>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
