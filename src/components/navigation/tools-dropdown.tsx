"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { getLiveTools } from "@/lib/tools-config";

export function ToolsDropdown() {
  const tools = getLiveTools();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className="relative"
      ref={dropdownRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        Tools
        <ChevronDown
          className={`h-4 w-4 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-64 rounded-lg border border-border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95">
          <div className="p-2">
            <Link
              href="/#resources"
              className="block rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              All Tools
            </Link>
            <div className="my-1 h-px bg-border" />
            {tools.length > 0 ? (
              tools.map((tool) => (
                <Link
                  key={tool.slug}
                  href={tool.path}
                  className="block rounded-md px-3 py-2 transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <div className="text-sm font-medium text-foreground">
                    {tool.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {tool.tagline}
                  </div>
                </Link>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No tools available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
