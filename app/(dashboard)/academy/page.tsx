'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Category, Course } from '@/lib/types'
import CategoryFilter from '@/components/category-filter'
import CourseCard from '@/components/course-card'
import { Loader2 } from 'lucide-react'

export default function AcademyPage() {
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
          (course: Course) => course.published || course.isPublished
        )
        setCourses(publishedCourses)
        setFilteredCourses(publishedCourses)
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
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
        <h1 className="text-3xl font-bold text-gray-900">Academy</h1>
        <p className="text-gray-600 mt-2">
          Explore os cursos disponíveis e continue seu aprendizado
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
            ? `Cursos - ${categories.find(c => c.id === selectedCategory)?.name}`
            : 'Todos os Cursos'}
          <span className="text-sm font-normal text-gray-500 ml-2">
            ({filteredCourses.length} {filteredCourses.length === 1 ? 'curso' : 'cursos'})
          </span>
        </h2>

        {filteredCourses.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">
              {selectedCategory 
                ? 'Nenhum curso encontrado nesta categoria'
                : 'Nenhum curso disponível no momento'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
