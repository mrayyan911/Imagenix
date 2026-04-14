export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Imagenix" className="h-10 w-10 rounded-lg object-contain" />
            <span className="text-2xl font-semibold text-neutral-900">Imagenix</span>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
