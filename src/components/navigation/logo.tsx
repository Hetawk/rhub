import Link from "next/link";
import Image from "next/image";

export function Logo() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2 text-base font-semibold tracking-tight text-foreground"
      aria-label="EKD Digital Resource Hub"
    >
      <Image
        src="/rhub_logo.png"
        alt="Resource Hub Logo"
        width={36}
        height={36}
        className="h-9 w-9"
        priority
      />
      <div className="flex flex-col leading-tight">
        <span>Resource Hub</span>
        <span className="text-xs font-normal text-foreground/70">
          EKD Digital
        </span>
      </div>
    </Link>
  );
}
