"use client"

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useEffect, useState } from "react"
import { CourseCard } from "@/components/course-card" // Vamos reusar o card visualmente
import { Loader2 } from "lucide-react"

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
      
      // 1. Busca Categorias de PRODUTOS
      const { data: categoriesData } = await supabase
        .from('ProductCategory')
        .select('*')

      // 2. Busca PRODUTOS FÍSICOS
      const { data: productsData, error } = await supabase
        .from('Product')
        .select(`
          *,
          ProductCategory (
            id,
            name,
            slug
          )
        `)
        .eq('isPublished', true)

      if (error) {
        console.error('Erro ao buscar produtos:', error)
      }

      if (categoriesData) setCategories(categoriesData)
      if (productsData) {
        setProducts(productsData)
        setFilteredProducts(productsData)
      }
      
    } catch (error) {
      console.log("Erro geral:", error)
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Loja</h1>
        <p className="text-gray-500 mt-2">
          Descubra produtos profissionais e home care da Masc PRO
        </p>
      </div>

      {/* Filtros de Categoria */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors
            ${selectedCategory === null 
              ? 'bg-primary text-white' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Todas
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors
              ${selectedCategory === category.id 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {category.name}
          </button>
        ))}
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {selectedCategory 
            ? categories.find(c => c.id === selectedCategory)?.name 
            : 'Todos os Produtos'} 
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({filteredProducts.length} {filteredProducts.length === 1 ? 'produto' : 'produtos'})
          </span>
        </h2>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">
            {selectedCategory 
              ? 'Nenhum produto encontrado nesta categoria' 
              : 'Nenhum produto disponível no momento'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <CourseCard
              key={product.id}
              course={product as any} // O TRUQUE: 'as any' evita erro vermelho
              showPrice={true}
              actionLabel="Comprar"
              actionHref={`/loja/${product.slug}`} // Link corrigido para Loja
            />
          ))}
        </div>
      )}
    </div>
  )
}