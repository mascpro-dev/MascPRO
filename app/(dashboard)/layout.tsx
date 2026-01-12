"use client"
import Sidebar from "@/components/sidebar"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 lg:ml-72 w-full p-4 md:p-8">
        {children}
      </main>
    </div>
  )
}