import Link from "next/link";
import Image from "next/image";
import {
  Github,
  Mail,
  Phone,
  MapPin,
  Twitter,
  Linkedin,
  Facebook,
} from "lucide-react";

const quickLinks = [
  { name: "Home", href: "/" },
  { name: "Tools", href: "/#resources" },
  { name: "Documentation", href: "/docs" },
  { name: "API", href: "/api" },
  { name: "Support", href: "/support" },
];

const tools = [
  { name: "Reference Converter", href: "/tools/ref" },
  { name: "URL Shortener", href: "/tools/s" },
  { name: "LaTeX to Word", href: "/tools/latex" },
  { name: "API Playground", href: "/tools/api" },
];

const resources = [
  { name: "Getting Started", href: "/docs/getting-started" },
  { name: "API Reference", href: "/docs/api" },
  { name: "Examples", href: "/docs/examples" },
  { name: "Blog", href: "/blog" },
];

const socialLinks = [
  { icon: Github, href: "https://github.com/ekddigital", label: "GitHub" },
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: Facebook, href: "#", label: "Facebook" },
];

const contactInfo = [
  {
    icon: Phone,
    content: "+8618506832159",
    href: "tel:+8618506832159",
  },
  {
    icon: Mail,
    content: "support@ekddigital.com",
    href: "mailto:support@ekddigital.com",
  },
];

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-border/20 bg-muted/30">
      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Company Info */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-primary/10 p-1">
                <div className="rounded-full overflow-hidden w-full h-full bg-primary">
                  <Image
                    src="/logo.png"
                    alt="EKD Digital"
                    width={40}
                    height={40}
                    className="object-contain w-full h-full"
                  />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-foreground text-lg">
                  <span className="text-primary">EKD</span> Digital
                </span>
                <span className="text-xs text-muted-foreground">
                  Resource Hub
                </span>
              </div>
            </Link>
            <p className="text-muted-foreground text-sm max-w-md">
              Professional tools and resources for academic research, reference
              management, and scientific publishing. Built by researchers, for
              researchers.
            </p>
            <div className="flex gap-4 mt-2">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="text-muted-foreground hover:text-primary transition-colors"
                  aria-label={social.label}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <social.icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Quick Links</h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Tools */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Tools</h3>
            <ul className="space-y-3">
              {tools.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Resources</h3>
            <ul className="space-y-3">
              {resources.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t border-border/20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Location */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <div className="flex items-center gap-2 mb-2 text-foreground">
                <MapPin size={16} className="text-primary shrink-0" />
                <h4 className="text-sm font-medium">Location</h4>
              </div>
              <p className="text-muted-foreground text-xs">
                Japan Freeway, Jacob Town
                <br />
                Adjacent Lonestar, Paynesville
                <br />
                Montserrado County, Liberia
              </p>
            </div>

            {/* Contact */}
            <div className="flex flex-col items-center text-center">
              <h4 className="text-sm font-medium text-foreground mb-3">
                Contact Us
              </h4>
              <div className="flex flex-col space-y-2">
                {contactInfo.map((info, index) => (
                  <a
                    key={index}
                    href={info.href}
                    className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-xs"
                  >
                    <info.icon size={14} className="shrink-0" />
                    <span>{info.content}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Legal */}
            <div className="flex flex-col items-center md:items-end text-center md:text-right">
              <h4 className="text-sm font-medium text-foreground mb-3">
                Legal
              </h4>
              <div className="flex flex-col space-y-2 text-xs">
                <Link
                  href="/privacy"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/terms"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Terms of Service
                </Link>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-8 pt-6 border-t border-border/10 text-center space-y-1">
            <p className="text-muted-foreground text-xs">
              © {currentYear} EKD Digital. All rights reserved.
            </p>
            <p className="text-muted-foreground/60 text-xs">
              A subsidiary of A.N.D. GROUP OF COMPANIES LLC
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
