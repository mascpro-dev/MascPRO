export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="w-full max-w-md">
        {/* Logo/Marca Centralizada */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tighter text-white italic">
            MASC<span className="text-blue-600">PRO</span>
          </h1>
          <p className="text-slate-500 text-sm mt-2 font-medium tracking-widest uppercase">
            Exclusive Access
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}