"use client"
import { Star } from "lucide-react"

export default function XPToast({ amount, show, onClose }: any) {
  if (!show) return null
  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] bg-slate-900 border-2 border-blue-500 p-4 rounded-2xl flex items-center gap-4">
      <Star className="text-blue-500 fill-blue-500" size={20} />
      <div className="text-white font-bold">+ {amount} XP GANHO!</div>
    </div>
  )
}