"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion" // Certifique-se de ter o framer-motion instalado
import { Star, TrendingUp } from "lucide-react"

interface XPToastProps {
  amount: number
  show: boolean
  onClose: () => void
}

export default function XPToast({ amount, show, onClose }: XPToastProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 4000) // Some após 4 segundos
      return () => clearTimeout(timer)
    }
  }, [show, onClose])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 20, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-md"
        >
          <div className="bg-slate-900 border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.3)] rounded-2xl p-4 flex items-center justify-between overflow-hidden relative">
            {/* Brilho de fundo */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-transparent pointer-events-none" />
            
            <div className="flex items-center gap-4 relative z-10">
              <div className="bg-blue-600 p-2.5 rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                <Star className="text-white fill-white" size={20} />
              </div>
              <div>
                <h4 className="text-white font-black italic text-sm tracking-tight">EXPERIÊNCIA GANHA!</h4>
                <p className="text-blue-400 text-xs font-bold uppercase tracking-widest">+ {amount} XP Adicionados</p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-lg border border-white/10 relative z-10">
              <TrendingUp className="text-green-400" size={16} />
              <span className="text-white font-black text-xs">GO PRO</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}