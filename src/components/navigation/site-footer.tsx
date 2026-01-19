"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Mail, Linkedin, Github, Twitter, MapPin } from "lucide-react";
import { footerNavSections, socialLinks } from "./nav-config";

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  const socialIcons = {
    Email: Mail,
    LinkedIn: Linkedin,
    GitHub: Github,
    Twitter: Twitter,
  };

  return (
    <footer className="relative border-t border-border/40 bg-background overflow-hidden">
      {/* Decorative wave */}
      <div className="absolute top-0 left-0 right-0 h-px">
        <svg
          className="absolute top-0 w-full h-32 opacity-10"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path
            d="M0,0 C150,60 350,60 600,30 C850,0 1050,60 1200,30 L1200,120 L0,120 Z"
            className="fill-ekd-gold"
          />
        </svg>
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-linear-to-b from-background via-ekd-navy/5 to-background pointer-events-none" />

      <div className="container relative z-10 mx-auto px-4 py-12 md:py-16">
        {/* Main footer content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-8">
          {/* Brand section */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-flex items-center space-x-2 mb-4">
              <Image
                src="/rhub_logo.png"
                alt="Resource Hub Logo"
                width={40}
                height={40}
                className="h-10 w-10"
              />
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Resource Hub
                </h3>
                <p className="text-xs text-muted-foreground">by EKD Digital</p>
              </div>
            </Link>
            <p className="text-sm text-muted-foreground mb-4">
              Comprehensive digital tools and resources for researchers,
              developers, and creators.
            </p>
            {/* Location badge */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>Global Platform</span>
            </div>
          </div>

          {/* Navigation sections */}
          {footerNavSections.map((section) => (
            <div key={section.title} className="lg:col-span-1">
              <h4 className="text-sm font-semibold text-foreground mb-3">
                {section.title}
              </h4>
              <ul className="space-y-2">
                {section.items.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2 group"
                      {...(item.external && {
                        target: "_blank",
                        rel: "noopener noreferrer",
                      })}
                    >
                      <span>{item.name}</span>
                      {item.badge && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-ekd-gold/10 text-ekd-gold border border-ekd-gold/20">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-border/40 my-8" />

        {/* Bottom section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Copyright & Brand */}
          <div className="flex items-center gap-3">
            <Link
              href="https://ekddigital.com"
              className="flex items-center gap-2 group"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg overflow-hidden group-hover:shadow-lg transition-shadow">
                <Image
                  src="/logo.png"
                  alt="EKD Digital"
                  width={32}
                  height={32}
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                Powered by{" "}
                <span className="font-semibold text-foreground">
                  EKD Digital
                </span>
              </span>
            </Link>
            <span className="text-sm text-muted-foreground">
              © {currentYear}
            </span>
          </div>

          {/* Social links */}
          <div className="flex items-center gap-4">
            {socialLinks.map((social) => {
              const Icon = socialIcons[social.name as keyof typeof socialIcons];
              return (
                <motion.a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-9 h-9 rounded-full bg-muted hover:bg-ekd-gold/10 transition-colors group"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label={social.name}
                >
                  <Icon className="h-4 w-4 text-muted-foreground group-hover:text-ekd-gold transition-colors" />
                </motion.a>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
}
