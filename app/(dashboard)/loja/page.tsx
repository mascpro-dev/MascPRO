"use client"

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useEffect, useState } from "react"
import { Loader2, ShoppingCart } from "lucide-react"
import Link from "next/link"

// --- CARD RESPONSIVO ---
const ProductCard = ({ product }: { product: any }) => {
  return (
    <div className="group hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100 rounded-xl p-3 h-full flex flex-col bg-white">
      <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-gray-50">
        <img
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          alt={product.title || product.name || "Produto"}
          src={product.image_url || "https://placehold.co/600x400?text=Foto"}
        />
      </div>
      <div className="flex flex-col pt-3 flex-grow">
        <div className="text-base md:text-lg font-semibold text-slate-800 group-hover:text-blue-600 transition line-clamp-2 leading-tight">
          {product.title || product.name}
        </div>
        <p className="text-xs text-gray-500 mt-1 mb-2">
          {product.ProductCategory?.name || "Produto Masc PRO"}
        </p>
        
        <div className="mt-auto flex items-center justify-between pt-2 border-t border-gray-50">
            <span className="text-lg font-bold text-blue-600">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price || 0)}
            </span>
            <Link 
                href={`/loja/${product.slug}`} 
                className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-blue-600 transition shadow-sm active:scale-95"
            >
                Comprar
            </Link>
        </div>
      </div>
    </div>
  )
}

export default function LojaPage() {
  const [categories, setCategories] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [filteredProducts, setFilteredProducts] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  
  const supabase = createClientComponentClient()

  const fetchData = async () => {
    try {
      setLoading(true)
      const { data: categoriesData } = await supabase.from('ProductCategory').select('*')
      const { data: productsData } = await supabase
        .from('Product')
        .select(`*, ProductCategory (id, name, slug)`)
        .eq('isPublished', true)

      if (categoriesData) setCategories(categoriesData)
      if (productsData) {
        setProducts(productsData)
        setFilteredProducts(productsData)
      }
    } catch (error) {
      console.log("Erro:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (selectedCategory === null) {
      setFilteredProducts(products)
    } else {
      setFilteredProducts(
        products.filter(
          (product) => 
            product.categoryId === selectedCategory || 
            product.ProductCategory?.id === selectedCategory
        )
      )
    }
  }, [selectedCategory, products])

  if (loading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6 md:mb-10">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Loja Oficial</h1>
        <p className="text-sm md:text-base text-gray-500 mt-1">Produtos Profissionais e Home Care</p>
      </div>

      {/* Filtros Responsivos (Scroll horizontal no celular) */}
      <div className="flex overflow-x-auto pb-4 gap-2 mb-6 no-scrollbar touch-pan-x">
        <button onClick={() => setSelectedCategory(null)} className={`whitespace-nowrap px-4 py-2 rounded-full text-xs md:text-sm font-medium transition-colors border ${selectedCategory === null ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'}`}>Todas</button>
        {categories.map((category) => (
          <button key={category.id} onClick={() => setSelectedCategory(category.id)} className={`whitespace-nowrap px-4 py-2 rounded-full text-xs md:text-sm font-medium transition-colors border ${selectedCategory === category.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'}`}>{category.name}</button>
        ))}
      </div>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed"><p className="text-gray-500">Nenhum produto encontrado.</p></div>
      ) : (
        // GRID RESPONSIVO: 1 coluna no celular, 2 no tablet, 3 no PC, 4 na tela grande
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {filteredProducts.map((product) => (<ProductCard key={product.id} product={product} />))}
        </div>
      )}
    </div>
  )
}