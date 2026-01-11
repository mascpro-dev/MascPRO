'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Course, Module, Lesson } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, BookOpen, PlayCircle, CheckCircle2, Lock } from 'lucide-react'

interface CoursePageProps {
  params: {
    id: string
  }
}

export default function CoursePage({ params }: CoursePageProps) {
  const [course, setCourse] = useState<Course | null>(null)
  const [modules, setModules] = useState<Module[]>([])
  const [lessons, setLessons] = useState<Record<string, Lesson[]>>({})
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchCourseData()
  }, [params.id])

  const fetchCourseData = async () => {
    try {
      const { data: courseData, error: courseError } = await supabase
        .from('Course')
        .select(`
          *,
          Category (
            id,
            name,
            slug
          )
        `)
        .eq('id', params.id)
        .single()

      if (courseError) throw courseError
      setCourse(courseData)

      const { data: modulesData, error: modulesError } = await supabase
        .from('Module')
        .select('*')
        .eq('course_id', params.id)
        .order('order', { ascending: true })

      if (modulesError) throw modulesError
      
      const publishedModules = modulesData?.filter((m: Module) => m.isPublished) || []
      setModules(publishedModules)

      const lessonsMap: Record<string, Lesson[]> = {}
      for (const module of publishedModules) {
        const { data: lessonsData } = await supabase
          .from('Lesson')
          .select('*')
          .eq('module_id', module.id)
          .order('order', { ascending: true })

        lessonsMap[module.id] = lessonsData?.filter((l: Lesson) => l.isPublished) || []
      }
      setLessons(lessonsMap)

    } catch (error) {
      console.error('Erro ao carregar curso:', error)
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

  if (!course) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Curso não encontrado</p>
        <Button onClick={() => router.back()} className="mt-4">
          Voltar
        </Button>
      </div>
    )
  }

  const categoryName = course.Category?.name || course.category?.name || 'Sem categoria'
  const totalLessons = Object.values(lessons).reduce((acc, curr) => acc + curr.length, 0)

  return (
    <div className="space-y-6">
      <Button onClick={() => router.back()} variant="ghost">
        ← Voltar
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-3xl">{course.title}</CardTitle>
              <CardDescription className="mt-2">
                <span className="inline-flex items-center gap-1 text-sm bg-primary/10 text-primary px-3 py-1 rounded-full">
                  <BookOpen className="w-4 h-4" />
                  {categoryName}
                </span>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {course.description && (
            <p className="text-gray-700 mb-4">{course.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>{modules.length} módulos</span>
            <span>•</span>
            <span>{totalLessons} aulas</span>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-2xl font-bold mb-4">Conteúdo do Curso</h2>
        
        {modules.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">Nenhum módulo disponível ainda</p>
          </div>
        ) : (
          <div className="space-y-4">
            {modules.map((module, moduleIndex) => (
              <Card key={module.id}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white text-sm">
                      {moduleIndex + 1}
                    </span>
                    {module.title}
                  </CardTitle>
                  {module.description && (
                    <CardDescription>{module.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {lessons[module.id]?.length === 0 ? (
                    <p className="text-sm text-gray-500">Nenhuma aula disponível</p>
                  ) : (
                    <div className="space-y-2">
                      {lessons[module.id]?.map((lesson, lessonIndex) => (
                        <div
                          key={lesson.id}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <PlayCircle className="w-5 h-5 text-primary flex-shrink-0" />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{lesson.title}</p>
                            {lesson.duration && (
                              <p className="text-xs text-gray-500">{lesson.duration} min</p>
                            )}
                          </div>
                          {lesson.xp_reward && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                              +{lesson.xp_reward} XP
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
