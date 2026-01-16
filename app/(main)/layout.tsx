export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Sidebar virá aqui */}
      <main className="p-6">
        {children}
      </main>
    </div>
  );
}