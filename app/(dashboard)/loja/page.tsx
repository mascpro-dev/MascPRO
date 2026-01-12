"use client"

import { useRouter, useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { ArrowLeft, ShoppingCart, ShieldCheck, Zap, Package } from "lucide-react"

export default function DetalheProdutoPage() {
  const router = useRouter()
  const { id } = useParams()
  const [produto, setProduto] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchProduto = async () => {
      // Aqui o código já está pronto para receber as colunas 'description' e 'stock'
      const { data } = await supabase
        .from('Product')
        .select('*')
        .eq('id', id)
        .single()
      
      if (data) setProduto(data)
      setLoading(false)
    }
    fetchProduto()
  }, [id])

  if (loading) return <div className="p-10 text-center animate-pulse">Carregando detalhes...</div>
  if (!produto) return <div className="p-10 text-center">Produto não encontrado.</div>

  const temEstoque = produto.stock > 0

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      
      {/* CABEÇALHO COM VOLTAR */}
      <button 
        onClick={() => router.back()} 
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-all font-bold group"
      >
        <div className="p-2 bg-white rounded-full border shadow-sm group-hover:bg-slate-50">
          <ArrowLeft size={20} />
        </div>
        Voltar para a Loja
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
        
        {/* IMAGEM DO PRODUTO */}
        <div className="bg-white rounded-[40px] p-8 md:p-12 border border-slate-100 shadow-sm flex items-center justify-center relative overflow-hidden">
          <img 
            src={produto.image_url || "https://placehold.co/600x600?text=Produto"} 
            className="w-full h-auto object-contain hover:scale-105 transition duration-700"
          />
          {!temEstoque && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
              <span className="bg-slate-900 text-white px-6 py-2 rounded-full font-black uppercase tracking-tighter">Esgotado</span>
            </div>
          )}
        </div>

        {/* INFORMAÇÕES E COMPRA */}
        <div className="flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
            <Zap size={12} className="fill-blue-600" />
            Ganhe +{Math.floor(produto.price / 2)} XP nesta compra
          </div>
          
          <h1 className="text-4xl font-black text-slate-900 mb-2 leading-tight">{produto.title}</h1>
          
          <div className="flex items-center gap-4 mb-6">
            <span className="text-3xl font-black text-blue-600">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.price)}
            </span>
            <div className="flex items-center gap-1 text-slate-400 text-sm font-bold border-l pl-4">
              <Package size={16} />
              {temEstoque ? `${produto.stock} em estoque` : "Sem estoque"}
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-100">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Descrição do Produto</h3>
            <p className="text-slate-600 leading-relaxed">
              {produto.description || "Descrição detalhada vinda diretamente da sua loja Nuvemshop. Este produto profissional é ideal para manter a performance e o estilo Masc PRO."}
            </p>
          </div>

          <button 
            disabled={!temEstoque}
            className={`w-full py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-100
              ${temEstoque 
                ? "bg-slate-900 text-white hover:bg-blue-600" 
                : "bg-slate-200 text-slate-400 cursor-not-allowed"}
            `}
          >
            <ShoppingCart size={24} />
            {temEstoque ? "COMPRAR AGORA" : "AVISE-ME QUANDO CHEGAR"}
          </button>

          <div className="flex items-center gap-6 mt-8">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <ShieldCheck size={16} className="text-green-500" />
              Pagamento Seguro
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}