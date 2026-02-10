import fs from "fs";
import path from "path";
import { HelpPageContent } from "@/components/help/help-page-content";

const guides = [
  { title: "Quick Start", slug: "quick-start", file: "quick-start.md" },
  { title: "Member Guide", slug: "member-guide", file: "member-guide.md" },
  { title: "Admin Guide", slug: "admin-guide", file: "admin-guide.md" },
  { title: "FAQ", slug: "faq", file: "faq.md" },
];

export default function HelpPage() {
  const docsDir = path.join(process.cwd(), "docs");
  const loadedGuides = guides.map((guide) => ({
    title: guide.title,
    slug: guide.slug,
    content: fs.readFileSync(path.join(docsDir, guide.file), "utf-8"),
  }));

  return <HelpPageContent guides={loadedGuides} />;
}
