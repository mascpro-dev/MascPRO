"use client"

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useEffect, useState } from "react"
import { Loader2, MapPin, Calendar } from "lucide-react"

const EventCard = ({ event }: { event: any }) => {
  const dateFormatted = new Date(event.date).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long'
  })

  return (
    <div className="group border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full">
      <div className="h-48 md:h-56 w-full bg-gray-100 relative overflow-hidden">
        <img
          src={event.image_url || "https://placehold.co/800x400?text=Evento"}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
        />
        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-slate-900 shadow-sm">
          {event.price === 0 ? "Gratuito" : `R$ ${event.price}`}
        </div>
      </div>

      <div className="p-5 flex flex-col flex-grow">
        <div className="flex items-center text-blue-600 mb-2 text-xs font-bold uppercase tracking-wide">
          <Calendar size={14} className="mr-1.5" />
          {dateFormatted}
        </div>

        <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-2 leading-snug">
          {event.title}
        </h3>

        <p className="text-gray-500 text-sm mb-4 line-clamp-2 flex-grow">
          {event.description}
        </p>

        <div className="mt-auto pt-4 border-t border-gray-50">
            <div className="flex items-center justify-between">
                <div className="flex items-center text-gray-400 text-xs">
                    <MapPin size={14} className="mr-1" />
                    <span className="truncate max-w-[120px]">{event.location || "Online"}</span>
                </div>
                <button className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-600 transition">
                    Inscrever
                </button>
            </div>
        </div>
      </div>
    </div>
  )
}

export default function AgendaPage() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true)
        const { data } = await supabase
          .from('Event')
          .select('*')
          .eq('isPublished', true)
          .order('date', { ascending: true })
        if (data) setEvents(data)
      } catch (error) { console.error(error) } 
      finally { setLoading(false) }
    }
    fetchEvents()
  }, [])

  if (loading) return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Agenda</h1>
        <p className="text-sm text-gray-500 mt-1">Próximos eventos e workshops</p>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed"><p className="text-gray-500">Nenhum evento.</p></div>
      ) : (
        // GRID RESPONSIVO: 1 coluna no celular, 2 no tablet, 3 no PC
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (<EventCard key={event.id} event={event} />))}
        </div>
      )}
    </div>
  )
}