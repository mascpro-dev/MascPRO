export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pt-14 md:pt-0 flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-black md:h-screen md:max-h-screen">
      <div className="flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden">{children}</div>
    </div>
  );
}
