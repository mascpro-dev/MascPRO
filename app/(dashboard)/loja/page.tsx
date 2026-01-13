"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft, ShoppingBag, Loader2, Star } from "lucide-react"
import { useState, useEffect } from "react"

export default function LojaPage() {
  const router = useRouter()
  const [produtos, setProdutos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch('/api/products')
        const data = await response.json()
        setProdutos(data)
      } catch (err) {
        console.error("Erro na Loja:", err)
      } finally {
        setLoading(false)
      }
    }
    loadProducts()
  }, [])

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    )
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      
      {/* HEADER COM VOLTAR */}
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => router.back()} className="p-2.5 bg-white border rounded-full shadow-sm">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Loja Real-Time</h1>
          <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">Sincronizado com Nuvemshop</p>
        </div>
      </div>

      {/* GRID DE PRODUTOS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
        {produtos.map((prod) => (
          <div 
            key={prod.id} 
            onClick={() => router.push(`/loja/${prod.id}`)}
            className="group bg-white rounded-3xl border border-slate-100 overflow-hidden hover:shadow-2xl transition-all duration-500 cursor-pointer"
          >
            <div className="aspect-square relative p-6 bg-slate-50">
              <img src={prod.image_url} className="w-full h-full object-contain group-hover:scale-110 transition duration-700" />
              {prod.stock <= 0 && (
                <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                  <span className="bg-slate-900 text-white text-[10px] px-3 py-1 rounded-full font-bold">ESGOTADO</span>
                </div>
              )}
            </div>
            <div className="p-5 text-center">
              <h3 className="font-bold text-slate-800 text-sm truncate">{prod.title}</h3>
              <div className="mt-2 text-blue-600 font-black text-lg">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.price)}
              </div>
              <button className="mt-4 w-full bg-slate-900 text-white py-3 rounded-xl text-[10px] font-bold uppercase hover:bg-blue-600 transition">
                Ver Produto
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}