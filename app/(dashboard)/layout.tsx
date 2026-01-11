import AuthProvider from '@/components/auth-provider'
import Sidebar from '@/components/sidebar'
import XPBar from '@/components/xp-bar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 ml-64">
          <div className="p-8">
            <div className="mb-6">
              <XPBar />
            </div>
            {children}
          </div>
        </main>
      </div>
    </AuthProvider>
  )
}
