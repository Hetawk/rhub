"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { getToolsByGroup } from "@/lib/tools-config";
import { getFeaturedConversions } from "@/lib/img/conversions-config";
import { getFeaturedDocumentTools } from "@/lib/doc/tools-config";

export function ToolsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
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
      setHoveredGroup(null);
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Group tools by category
  const imgTools = getToolsByGroup("img");
  const vidTools = getToolsByGroup("vid");
  const refTools = getToolsByGroup("ref");
  const urlTools = getToolsByGroup("url");
  const docTools = getToolsByGroup("doc");

  // Get featured image conversions
  const featuredImgConversions = getFeaturedConversions().slice(0, 5);
  // Get featured document conversions
  const featuredDocTools = getFeaturedDocumentTools();

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
        <div className="absolute left-0 top-full mt-2 w-[600px] rounded-lg border-2 border-border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95">
          <div className="grid grid-cols-2 gap-2 p-2">
            {/* Left Column - Main Tools */}
            <div className="space-y-1">
              <Link
                href="/#resources"
                className="block rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground border-2 border-transparent hover:border-gold/20"
              >
                All Tools
              </Link>
              <div className="my-1 h-px bg-border" />

              {/* Image Converters Group */}
              {imgTools.length > 0 && (
                <div
                  className="relative"
                  onMouseEnter={() => setHoveredGroup("img")}
                >
                  <Link
                    href="/tools/img"
                    className="flex items-center justify-between rounded-md px-3 py-2 transition-colors hover:bg-accent hover:text-accent-foreground border-2 border-transparent hover:border-gold/20"
                  >
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        Image Converters
                      </div>
                      <div className="text-xs text-muted-foreground">
                        25+ format conversions
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              )}

              {/* Document Converters Group */}
              {docTools.length > 0 && (
                <div
                  className="relative"
                  onMouseEnter={() => setHoveredGroup("doc")}
                >
                  <Link
                    href="/tools/doc"
                    className="flex items-center justify-between rounded-md px-3 py-2 transition-colors hover:bg-accent hover:text-accent-foreground border-2 border-transparent hover:border-gold/20"
                  >
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        Document Converters
                      </div>
                      <div className="text-xs text-muted-foreground">
                        PDF, Word, ODT & more
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              )}

              {/* Video Downloaders Group */}
              {vidTools.length > 0 && (
                <div
                  className="relative"
                  onMouseEnter={() => setHoveredGroup("vid")}
                >
                  <div className="flex items-center justify-between rounded-md px-3 py-2 transition-colors hover:bg-accent hover:text-accent-foreground border-2 border-transparent hover:border-gold/20">
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        Video Downloaders
                      </div>
                      <div className="text-xs text-muted-foreground">
                        YouTube, Instagram & more
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              )}

              {/* Other Tools */}
              {refTools.map((tool) => (
                <Link
                  key={tool.slug}
                  href={tool.path}
                  className="block rounded-md px-3 py-2 transition-colors hover:bg-accent hover:text-accent-foreground border-2 border-transparent hover:border-gold/20"
                >
                  <div className="text-sm font-medium text-foreground">
                    {tool.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {tool.tagline}
                  </div>
                </Link>
              ))}

              {urlTools.map((tool) => (
                <Link
                  key={tool.slug}
                  href={tool.path}
                  className="block rounded-md px-3 py-2 transition-colors hover:bg-accent hover:text-accent-foreground border-2 border-transparent hover:border-gold/20"
                >
                  <div className="text-sm font-medium text-foreground">
                    {tool.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {tool.tagline}
                  </div>
                </Link>
              ))}
            </div>

            {/* Right Column - Sub-menus */}
            <div className="border-l border-border pl-2">
              {hoveredGroup === "img" && (
                <div className="space-y-1 animate-in fade-in-0 slide-in-from-left-2">
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
                    Featured Conversions
                  </div>
                  {featuredImgConversions.map((conv) => (
                    <Link
                      key={conv.slug}
                      href={`/tools/img/${conv.slug}`}
                      className="block rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground border-2 border-transparent hover:border-gold/20"
                    >
                      <div className="font-medium text-foreground">
                        {conv.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {conv.description}
                      </div>
                    </Link>
                  ))}
                  <Link
                    href="/tools/img"
                    className="block rounded-md px-3 py-2 text-sm font-medium text-gold hover:bg-accent border-2 border-transparent hover:border-gold/20"
                  >
                    View all 25+ conversions →
                  </Link>
                </div>
              )}

              {hoveredGroup === "vid" && (
                <div className="space-y-1 animate-in fade-in-0 slide-in-from-left-2">
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
                    Video Platforms
                  </div>
                  {vidTools.map((tool) => (
                    <Link
                      key={tool.slug}
                      href={tool.path}
                      className="block rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground border-2 border-transparent hover:border-gold/20"
                    >
                      <div className="font-medium text-foreground">
                        {tool.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {tool.tagline}
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {hoveredGroup === "doc" && (
                <div className="space-y-1 animate-in fade-in-0 slide-in-from-left-2">
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
                    Document Conversions
                  </div>
                  {featuredDocTools.map((tool) => (
                    <Link
                      key={tool.slug}
                      href={`/tools/doc/${tool.slug}`}
                      className="block rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground border-2 border-transparent hover:border-gold/20"
                    >
                      <div className="font-medium text-foreground">
                        {tool.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {tool.inputFormat
                          .map((f) => f.toUpperCase())
                          .join(", ")}{" "}
                        →{" "}
                        {tool.outputFormat
                          .map((f) => f.toUpperCase())
                          .join(", ")}
                      </div>
                    </Link>
                  ))}
                  <Link
                    href="/tools/doc"
                    className="block rounded-md px-3 py-2 text-sm font-medium text-gold hover:bg-accent border-2 border-transparent hover:border-gold/20"
                  >
                    View all document tools →
                  </Link>
                </div>
              )}

              {!hoveredGroup && (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  Hover over groups to see more
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
