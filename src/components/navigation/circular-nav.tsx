"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, useScroll, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "@/components/ui/button";
import { mainNavItems, featuredResources } from "./nav-config";

export function CircularNav() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { scrollY } = useScroll();

  useEffect(() => {
    return scrollY.on("change", (latest: number) => {
      setIsScrolled(latest > 50);
    });
  }, [scrollY]);

  return (
    <>
      {/* Main Circular Navigation */}
      <motion.nav
        initial={{ y: -50, opacity: 0 }}
        animate={{
          y: 0,
          opacity: 1,
          top: isScrolled ? "1rem" : "1.5rem",
          left: isScrolled ? "auto" : "50%",
          right: isScrolled ? "1.5rem" : "auto",
          x: isScrolled ? 0 : "-50%",
          scale: isScrolled ? 0.95 : 1,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed z-50 hidden md:block"
      >
        <div
          className={`relative rounded-full shadow-2xl transition-all duration-300 ${
            isScrolled ? "px-3 py-2" : "px-5 py-3"
          }`}
        >
          {/* Glassmorphism background */}
          <div className="absolute inset-0 bg-linear-to-br from-background/95 via-background/90 to-background/85 backdrop-blur-xl rounded-full border border-border/40 shadow-inner" />

          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-linear-to-b from-ekd-gold/5 to-transparent rounded-full" />

          {/* Content */}
          <div className="relative flex items-center gap-1">
            {/* Logo - only show when not scrolled */}
            {!isScrolled && (
              <Link
                href="/"
                className="flex items-center gap-2 px-3 py-2 rounded-full transition-colors hover:bg-ekd-gold/10"
              >
                <Logo />
              </Link>
            )}

            {/* Nav Items */}
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-300 hover:bg-ekd-gold/10 group"
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  <span className="whitespace-nowrap">{item.name}</span>
                  {item.badge && (
                    <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold bg-ekd-gold text-white rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            {/* Theme Toggle & CTA */}
            <div className="flex items-center gap-2 pl-2 border-l border-border/40">
              <ThemeToggle />
              <Button
                asChild
                size="sm"
                className="rounded-full bg-linear-to-r from-ekd-maroon to-ekd-navy hover:opacity-90 transition-opacity"
              >
                <Link href="https://ekddigital.com">EKD Digital</Link>
              </Button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Header */}
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border/40"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Logo />
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="rounded-full"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-border/40 bg-background/95 backdrop-blur-lg"
            >
              <div className="p-4 space-y-4">
                {/* Main Nav */}
                <div className="space-y-2">
                  {mainNavItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-ekd-gold/10 transition-colors"
                      >
                        {Icon && <Icon className="w-5 h-5" />}
                        <span className="flex-1">{item.name}</span>
                        {item.badge && (
                          <span className="px-2 py-0.5 text-xs font-semibold bg-ekd-gold text-white rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>

                {/* Featured Resources */}
                <div className="pt-4 border-t border-border/40">
                  <h3 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Quick Access
                  </h3>
                  <div className="space-y-2">
                    {featuredResources.map((resource) => {
                      const Icon = resource.icon;
                      return (
                        <Link
                          key={resource.href}
                          href={resource.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-ekd-navy/10 transition-colors"
                        >
                          {Icon && <Icon className="w-5 h-5" />}
                          <div className="flex-1">
                            <div className="font-medium">{resource.name}</div>
                            {resource.description && (
                              <div className="text-xs text-muted-foreground">
                                {resource.description}
                              </div>
                            )}
                          </div>
                          {resource.badge && (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-ekd-gold text-white rounded-full">
                              {resource.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* CTA */}
                <div className="pt-4 border-t border-border/40">
                  <Button
                    asChild
                    className="w-full rounded-full bg-linear-to-r from-ekd-maroon to-ekd-navy hover:opacity-90 transition-opacity"
                  >
                    <Link href="https://ekddigital.com">Visit EKD Digital</Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Spacer for mobile to prevent content overlap */}
      <div className="md:hidden h-16" />
    </>
  );
}
