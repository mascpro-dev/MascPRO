import { Course } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { BookOpen, DollarSign } from 'lucide-react'

interface CourseCardProps {
  course: Course
  showPrice?: boolean
  actionLabel?: string
  actionHref?: string
}

export default function CourseCard({ 
  course, 
  showPrice = false,
  actionLabel = 'Ver Curso',
  actionHref 
}: CourseCardProps) {
  const categoryName = course.Category?.name || course.category?.name || 'Sem categoria'
  const isPublished = course.published || course.isPublished
  const price = course.price || 0
  const href = actionHref || `/academy/courses/${course.id}`

  if (!isPublished) return null

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl line-clamp-2">{course.title}</CardTitle>
            <CardDescription className="mt-2">
              <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                <BookOpen className="w-3 h-3" />
                {categoryName}
              </span>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {course.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-3">
            {course.description}
          </p>
        )}
        <div className="flex items-center justify-between">
          {showPrice && (
            <div className="flex items-center gap-1 text-lg font-bold text-primary">
              <DollarSign className="w-5 h-5" />
              {price.toFixed(2)}
            </div>
          )}
          <Link href={href} className={showPrice ? '' : 'w-full'}>
            <Button className={showPrice ? '' : 'w-full'}>
              {actionLabel}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
