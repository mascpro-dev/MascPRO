'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface XPBarProps {
  userId?: string
}

export default function XPBar({ userId }: XPBarProps) {
  const [xp, setXP] = useState(0)
  const [level, setLevel] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserProgress = async () => {
      if (!userId) return

      const { data, error } = await supabase
        .from('user_lessons_progress')
        .select('xp_earned')
        .eq('user_id', userId)

      if (!error && data) {
        const totalXP = data.reduce((sum, item) => sum + (item.xp_earned || 0), 0)
        setXP(totalXP)
        setLevel(Math.floor(totalXP / 100) + 1)
      }

      setLoading(false)
    }

    fetchUserProgress()
  }, [userId])

  const currentLevelXP = (level - 1) * 100
  const nextLevelXP = level * 100
  const progressPercentage = ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
        <div className="h-2 bg-gray-200 rounded"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">Nível {level}</span>
        <span className="text-xs text-gray-500">{xp} XP</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(progressPercentage, 100)}%` }}
        ></div>
      </div>
      <div className="text-xs text-gray-500 mt-1 text-right">
        {nextLevelXP - xp} XP para o próximo nível
      </div>
    </div>
  )
}
