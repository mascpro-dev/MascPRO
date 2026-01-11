export interface Category {
  id: string
  name: string
  slug: string
  created_at?: string
}

export interface Course {
  id: string
  title: string
  description?: string
  categoryId?: string
  category_id?: string
  published?: boolean
  isPublished?: boolean
  price?: number
  created_at?: string
  Category?: Category
  category?: Category
}

export interface Module {
  id: string
  title: string
  description?: string
  course_id: string
  isPublished?: boolean
  order?: number
  created_at?: string
}

export interface Lesson {
  id: string
  title: string
  description?: string
  module_id: string
  isPublished?: boolean
  content?: string
  video_url?: string
  duration?: number
  order?: number
  xp_reward?: number
  created_at?: string
}

export interface UserLessonProgress {
  id: string
  user_id: string
  lesson_id: string
  completed: boolean
  xp_earned?: number
  completed_at?: string
  created_at?: string
}
