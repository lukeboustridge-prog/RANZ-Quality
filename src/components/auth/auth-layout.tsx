import Image from "next/image";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel - RANZ branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-ranz-charcoal items-center justify-center">
        <div className="text-center px-8">
          {/* Logo */}
          <div className="mx-auto h-16 w-16 rounded-xl bg-white flex items-center justify-center">
            <Image
              src="/ranz-logo.svg"
              alt="RANZ"
              width={48}
              height={48}
              className="h-12 w-12"
            />
          </div>
          {/* Title */}
          <h1 className="mt-6 text-2xl font-bold text-white">{title}</h1>
          {subtitle && (
            <p className="mt-2 text-ranz-silver text-sm">{subtitle}</p>
          )}
          {/* RANZ tagline */}
          <p className="mt-8 text-ranz-charcoal-light text-sm">
            Roofing Association of New Zealand
          </p>
        </div>
      </div>

      {/* Right panel - form container */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Card with accent border */}
          <div className="border-t-4 border-app-accent rounded-lg shadow-lg p-8 bg-white">
            {/* Mobile logo (shown on small screens) */}
            <div className="lg:hidden flex justify-center mb-6">
              <div className="h-12 w-12 rounded-lg bg-ranz-charcoal flex items-center justify-center">
                <Image
                  src="/ranz-logo.svg"
                  alt="RANZ"
                  width={32}
                  height={32}
                  className="h-8 w-8"
                />
              </div>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
