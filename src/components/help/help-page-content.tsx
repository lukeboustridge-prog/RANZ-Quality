"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MarkdownContent } from "./markdown-content";
import { BookOpen, ChevronDown, List } from "lucide-react";

interface Guide {
  title: string;
  slug: string;
  content: string;
}

interface HelpPageContentProps {
  guides: Guide[];
}

interface TocEntry {
  id: string;
  text: string;
}

function extractHeadings(markdown: string): TocEntry[] {
  const headings: TocEntry[] = [];
  const lines = markdown.split("\n");
  for (const line of lines) {
    const match = line.match(/^##\s+(.+)/);
    if (match) {
      const text = match[1].replace(/[*_`]/g, "").trim();
      const id = text.toLowerCase().replace(/[^\w]+/g, "-").replace(/(^-|-$)/g, "");
      headings.push({ id, text });
    }
  }
  return headings;
}

export function HelpPageContent({ guides }: HelpPageContentProps) {
  const [activeTab, setActiveTab] = useState(guides[0]?.slug || "");
  const [tocOpen, setTocOpen] = useState(false);

  // Read hash on mount
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash && guides.some((g) => g.slug === hash)) {
      setActiveTab(hash);
    }
  }, [guides]);

  // Update hash when tab changes
  useEffect(() => {
    window.history.replaceState(null, "", `#${activeTab}`);
  }, [activeTab]);

  const activeGuide = guides.find((g) => g.slug === activeTab);
  const headings = useMemo(
    () => (activeGuide ? extractHeadings(activeGuide.content) : []),
    [activeGuide]
  );

  const handleLinkClick = useCallback(
    (slug: string) => {
      const found = guides.find((g) => g.slug === slug);
      if (found) {
        setActiveTab(found.slug);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [guides]
  );

  const scrollToHeading = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      setTocOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
          <BookOpen className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Help &amp; Guides</h1>
          <p className="text-sm text-slate-500">Documentation and guides for using the portal</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="w-full sm:w-auto">
            {guides.map((guide) => (
              <TabsTrigger key={guide.slug} value={guide.slug} className="text-xs sm:text-sm">
                {guide.title}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {guides.map((guide) => (
          <TabsContent key={guide.slug} value={guide.slug}>
            <div className="flex gap-8">
              {/* Main content */}
              <div className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
                <MarkdownContent content={guide.content} onLinkClick={handleLinkClick} />
              </div>

              {/* Desktop TOC sidebar */}
              {headings.length > 2 && (
                <aside className="hidden xl:block w-56 shrink-0">
                  <div className="sticky top-24">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                      On this page
                    </h3>
                    <nav className="space-y-1">
                      {headings.map((h) => (
                        <button
                          key={h.id}
                          onClick={() => scrollToHeading(h.id)}
                          className="block w-full text-left text-sm text-slate-500 hover:text-slate-900 py-1 px-2 rounded hover:bg-slate-50 transition-colors truncate"
                        >
                          {h.text}
                        </button>
                      ))}
                    </nav>
                  </div>
                </aside>
              )}
            </div>

            {/* Mobile TOC */}
            {headings.length > 2 && (
              <div className="xl:hidden mt-4">
                <button
                  onClick={() => setTocOpen(!tocOpen)}
                  className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 w-full p-3 rounded-lg border border-slate-200 bg-white"
                >
                  <List className="h-4 w-4" />
                  Table of Contents
                  <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${tocOpen ? "rotate-180" : ""}`} />
                </button>
                {tocOpen && (
                  <nav className="mt-2 p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                    {headings.map((h) => (
                      <button
                        key={h.id}
                        onClick={() => scrollToHeading(h.id)}
                        className="block w-full text-left text-sm text-slate-500 hover:text-slate-900 py-1.5 px-2 rounded hover:bg-slate-50 transition-colors"
                      >
                        {h.text}
                      </button>
                    ))}
                  </nav>
                )}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
