export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    // pt-14 compensa a topbar fixa no mobile; no desktop (md:) zeramos
    <div className="pt-14 md:pt-0 min-h-screen bg-black">
      {children}
    </div>
  );
}
