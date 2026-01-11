'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Category, Course } from '@/lib/types'
import CategoryFilter from '@/components/category-filter'
import CourseCard from '@/components/course-card'
import { Loader2, ShoppingCart } from 'lucide-react'

export default function LojaPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (selectedCategory === null) {
      setFilteredCourses(courses)
    } else {
      setFilteredCourses(
        courses.filter(
          (course) => 
            course.categoryId === selectedCategory || 
            course.category_id === selectedCategory
        )
      )
    }
  }, [selectedCategory, courses])

  const fetchData = async () => {
    try {
      const [categoriesRes, coursesRes] = await Promise.all([
        supabase.from('Category').select('*'),
        supabase.from('Course').select(`
          *,
          Category (
            id,
            name,
            slug
          )
        `)
      ])

      if (categoriesRes.data) {
        setCategories(categoriesRes.data)
      }

      if (coursesRes.data) {
        const publishedCourses = coursesRes.data.filter(
          (course: Course) => 
            (course.published || course.isPublished) && 
            (course.price !== undefined && course.price > 0)
        )
        setCourses(publishedCourses)
        setFilteredCourses(publishedCourses)
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <ShoppingCart className="w-8 h-8" />
          Loja
        </h1>
        <p className="text-gray-600 mt-2">
          Descubra cursos e materiais para sua jornada profissional
        </p>
      </div>

      {categories.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Filtrar por Categoria</h2>
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-4">
          {selectedCategory 
            ? `Produtos - ${categories.find(c => c.id === selectedCategory)?.name}`
            : 'Todos os Produtos'}
          <span className="text-sm font-normal text-gray-500 ml-2">
            ({filteredCourses.length} {filteredCourses.length === 1 ? 'produto' : 'produtos'})
          </span>
        </h2>

        {filteredCourses.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">
              {selectedCategory 
                ? 'Nenhum produto encontrado nesta categoria'
                : 'Nenhum produto disponível no momento'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <CourseCard 
                key={course.id} 
                course={course} 
                showPrice={true}
                actionLabel="Comprar"
                actionHref={`/loja/${course.id}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
