"use client"

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useEffect, useState } from "react"
import { Loader2, ShoppingCart } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

// --- COMPONENTE VISUAL DO CARD (CRIADO AQUI MESMO PARA NÃO DAR ERRO) ---
const ProductCard = ({ product }: { product: any }) => {
  return (
    <div className="group hover:shadow-sm transition overflow-hidden border rounded-lg p-3 h-full flex flex-col bg-white">
      <div className="relative w-full aspect-video rounded-md overflow-hidden bg-gray-100">
        <Image
          fill
          className="object-cover"
          alt={product.title || product.name || "Produto"}
          src={product.image_url || "https://placehold.co/600x400?text=Foto"}
        />
      </div>
      <div className="flex flex-col pt-2 flex-grow">
        <div className="text-lg md:text-base font-medium group-hover:text-sky-700 transition line-clamp-2">
          {product.title || product.name}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {product.ProductCategory?.name || "Produto Masc PRO"}
        </p>
        <div className="my-3 flex items-center gap-x-2 text-sm md:text-xs">
          <div className="flex items-center gap-x-1 text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
            <ShoppingCart size={14} />
            <span>Físico</span>
          </div>
        </div>
        <div className="mt-auto flex items-center justify-between">
            <span className="text-md md:text-sm font-medium text-slate-700">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price || 0)}
            </span>
            <Link 
                href={`/loja/${product.slug}`} 
                className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700 transition"
            >
                Comprar
            </Link>
        </div>
      </div>
    </div>
  )
}

// --- PÁGINA DA LOJA ---
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
      
      // 1. Busca Categorias
      const { data: categoriesData } = await supabase
        .from('ProductCategory')
        .select('*')

      // 2. Busca Produtos
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
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Loja Oficial</h1>
        <p className="text-gray-500 mt-2">
          Produtos Profissionais e Home Care
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border
            ${selectedCategory === null 
              ? 'bg-blue-600 text-white border-blue-600' 
              : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'}`}
        >
          Todos
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border
              ${selectedCategory === category.id 
                ? 'bg-blue-600 text-white border-blue-600' 
                : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'}`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
          <p className="text-gray-500">Nenhum produto encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}