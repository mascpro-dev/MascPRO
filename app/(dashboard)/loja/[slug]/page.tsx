"use client"

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useEffect, useState } from "react"
import { Loader2, ShoppingCart, ArrowLeft, Check, Star } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"

export default function ProductDetailsPage() {
  const params = useParams()
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchProduct = async () => {
      if (!params?.slug) return

      try {
        setLoading(true)
        // Busca o produto pelo "slug" (o nome no link)
        const { data, error } = await supabase
          .from('Product')
          .select(`*, ProductCategory (id, name)`)
          .eq('slug', params.slug)
          .single()

        if (error) throw error
        setProduct(data)
      } catch (error) {
        console.error("Erro ao carregar produto:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [params?.slug])

  if (loading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-xl font-bold">Produto não encontrado 😕</h2>
        <Link href="/loja" className="text-blue-600 hover:underline mt-4 block">Voltar para a Loja</Link>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Botão Voltar */}
      <Link href="/loja" className="inline-flex items-center text-sm text-gray-500 hover:text-blue-600 mb-6 transition">
        <ArrowLeft size={16} className="mr-1" />
        Voltar para a Loja
      </Link>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row">
        
        {/* COLUNA DA ESQUERDA: FOTO */}
        <div className="w-full md:w-1/2 bg-gray-50 p-8 flex items-center justify-center relative">
           <img
            src={product.image_url || "https://placehold.co/600x600?text=Produto"}
            alt={product.title}
            className="max-h-[400px] w-auto object-contain drop-shadow-xl hover:scale-105 transition duration-500"
          />
        </div>

        {/* COLUNA DA DIREITA: DETALHES */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col">
          <div className="mb-4">
             <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
               {product.ProductCategory?.name || "Oferta"}
             </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 leading-tight">
            {product.title || product.name}
          </h1>

          {/* Preço */}
          <div className="text-3xl font-bold text-blue-600 mb-6">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price || 0)}
          </div>

          <p className="text-gray-600 leading-relaxed mb-8 border-b border-gray-100 pb-8">
            {product.description || "Sem descrição detalhada para este produto."}
          </p>

          {/* Vantagens (Fictícias para design) */}
          <div className="space-y-3 mb-8">
            <div className="flex items-center gap-2 text-sm text-gray-600">
                <Check size={16} className="text-green-500" /> <span>Entrega rápida para todo Brasil</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
                <Check size={16} className="text-green-500" /> <span>Garantia de originalidade Masc PRO</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
                <Check size={16} className="text-green-500" /> <span>Suporte técnico especializado</span>
            </div>
          </div>

          {/* Botão de Compra */}
          <div className="mt-auto">
            <button className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-600 transition shadow-lg hover:shadow-blue-500/30 flex items-center justify-center gap-2 active:scale-95">
              <ShoppingCart size={20} />
              Comprar Agora
            </button>
            <p className="text-xs text-center text-gray-400 mt-3">Transação segura e criptografada</p>
          </div>
        </div>
      </div>
    </div>
  )
}