import Image from "next/image";

const HIGHLIGHTS = [
  "Access research tools, converters & references",
  "LaTeX to Word, BibTeX, URL shortener & more",
  "Downloadable templates, guides & API docs",
  "Kingdom-focused digital resources & services",
];

function BrandPanel() {
  return (
    <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] flex-shrink-0 flex-col justify-between bg-gradient-to-br from-ekd-dark-brown to-ekd-deep-navy p-12">
      <div>
        <Image
          src="/rhub_logo.png"
          alt="RHub"
          width={120}
          height={120}
          className="h-14 w-auto"
          priority
        />
      </div>

      <div>
        <h2 className="text-3xl font-bold text-white leading-tight mb-2">
          EKD Digital
          <br />
          Resource Hub
        </h2>
        <p className="text-ekd-gold text-sm italic mb-8">
          Building a Better World Through KINGDOM Principles
        </p>
        <ul className="space-y-3">
          {HIGHLIGHTS.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2.5 text-sm text-white/70"
            >
              <span className="mt-1 h-3.5 w-3.5 rounded-full bg-ekd-gold/20 flex items-center justify-center flex-shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-ekd-gold" />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-white/30 text-xs">
        &copy; 2023&ndash;{new Date().getFullYear()} EKD Digital. All rights
        reserved.
      </p>
    </div>
  );
}

function MobileLogo() {
  return (
    <div className="lg:hidden flex flex-col items-center mb-8">
      <Image
        src="/rhub_logo.png"
        alt="RHub"
        width={64}
        height={64}
        className="h-16 w-auto mb-2"
        priority
      />
      <p className="text-xs text-ekd-gold italic text-center">
        Building a Better World Through KINGDOM Principles
      </p>
    </div>
  );
}

interface AuthShellProps {
  children: React.ReactNode;
}

/**
 * Two-panel auth layout.
 * Left: branded dark panel with logo (hidden on mobile).
 * Right: scrollable form area (full screen on mobile).
 */
export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="flex min-h-screen">
      <BrandPanel />
      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto bg-background px-6 py-12">
        <div className="w-full max-w-sm">
          <MobileLogo />
          {children}
        </div>
      </div>
    </div>
  );
}
