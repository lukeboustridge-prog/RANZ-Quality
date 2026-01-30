"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  MapPin,
  Shield,
  Star,
  Users,
  CheckCircle,
  ChevronRight,
  Filter,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CERTIFICATION_TIER_LABELS,
  NZ_REGIONS,
  type CertificationTier,
} from "@/types";

interface SearchResult {
  id: string;
  name: string;
  tradingName: string | null;
  tier: CertificationTier;
  city: string | null;
  memberSince: string | null;
  staffCount: number;
  insuranceValid: boolean;
  rating: number | null;
  reviewCount: number;
  verificationUrl: string;
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  totalPages: number;
}

const tierColors: Record<CertificationTier, string> = {
  ACCREDITED: "bg-slate-100 text-slate-700 border-slate-300",
  CERTIFIED: "bg-blue-100 text-blue-700 border-blue-300",
  MASTER_ROOFER: "bg-amber-100 text-amber-700 border-amber-300",
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState<string>("all");
  const [region, setRegion] = useState<string>("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const performSearch = async (newPage = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (tier && tier !== "all") params.set("tier", tier);
      if (region && region !== "all") params.set("region", region);
      params.set("limit", "10");
      params.set("offset", String((newPage - 1) * 10));

      const response = await fetch(`/api/public/search?${params}`);
      const data: SearchResponse = await response.json();

      setResults(data.results);
      setTotal(data.total);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    performSearch();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(1);
  };

  const clearFilters = () => {
    setQuery("");
    setTier("all");
    setRegion("all");
    performSearch(1);
  };

  const hasFilters = query || tier !== "all" || region !== "all";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <span className="font-semibold text-slate-900">RANZ Portal</span>
          </div>
          <Link
            href="https://ranz.org.nz"
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            About RANZ
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Check a RANZ Certified Roofer
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Search our directory of certified roofing professionals. All listed
            businesses meet RANZ quality standards and maintain current
            insurance coverage.
          </p>
        </div>

        {/* Search Form */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <form onSubmit={handleSearch}>
              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by business name or location..."
                    className="pl-10"
                  />
                </div>
                <Button type="submit" disabled={loading}>
                  {loading ? "Searching..." : "Search"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </div>

              {/* Filters */}
              {showFilters && (
                <div className="flex flex-wrap gap-4 pt-4 border-t">
                  <div className="w-48">
                    <label className="text-sm font-medium text-slate-700 mb-1 block">
                      Certification Tier
                    </label>
                    <Select value={tier} onValueChange={setTier}>
                      <SelectTrigger>
                        <SelectValue placeholder="All tiers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All tiers</SelectItem>
                        <SelectItem value="MASTER_ROOFER">
                          Master Roofer
                        </SelectItem>
                        <SelectItem value="CERTIFIED">Certified</SelectItem>
                        <SelectItem value="ACCREDITED">Accredited</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-48">
                    <label className="text-sm font-medium text-slate-700 mb-1 block">
                      Region
                    </label>
                    <Select value={region} onValueChange={setRegion}>
                      <SelectTrigger>
                        <SelectValue placeholder="All regions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All regions</SelectItem>
                        {NZ_REGIONS.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {hasFilters && (
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={clearFilters}
                        className="text-slate-500"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Clear filters
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            {total === 0
              ? "No businesses found"
              : `Showing ${results.length} of ${total} certified businesses`}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-slate-600">Searching...</p>
          </div>
        ) : results.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Search className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                No results found
              </h3>
              <p className="text-slate-600 mb-4">
                Try adjusting your search or filters to find certified roofers.
              </p>
              <Button variant="outline" onClick={clearFilters}>
                Clear all filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {results.map((business) => (
              <Card key={business.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">
                            {business.name}
                          </h3>
                          {business.tradingName && (
                            <p className="text-sm text-slate-500">
                              Trading as: {business.tradingName}
                            </p>
                          )}
                        </div>
                        <Badge
                          className={tierColors[business.tier]}
                        >
                          {CERTIFICATION_TIER_LABELS[business.tier]}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-3">
                        {business.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {business.city}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {business.staffCount} staff
                        </span>
                        {business.insuranceValid && (
                          <span className="flex items-center gap-1 text-green-600">
                            <Shield className="h-4 w-4" />
                            Insured
                          </span>
                        )}
                        {business.rating && (
                          <span className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                            {business.rating.toFixed(1)} ({business.reviewCount}{" "}
                            reviews)
                          </span>
                        )}
                      </div>

                      {business.memberSince && (
                        <p className="text-xs text-slate-400">
                          Member since{" "}
                          {new Date(business.memberSince).toLocaleDateString(
                            "en-NZ",
                            { month: "long", year: "numeric" }
                          )}
                        </p>
                      )}
                    </div>

                    <Link href={`/verify/${business.id}`}>
                      <Button variant="outline" size="sm">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Verify
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => performSearch(page - 1)}
            >
              Previous
            </Button>
            <span className="flex items-center px-4 text-sm text-slate-600">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              disabled={page === totalPages}
              onClick={() => performSearch(page + 1)}
            >
              Next
            </Button>
          </div>
        )}

        {/* About Section */}
        <Card className="mt-12">
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">
              About RANZ Certification
            </h2>
            <p className="text-sm text-slate-600 mb-4">
              The Roofing Association of New Zealand (RANZ) certifies roofing
              businesses that meet strict quality standards. All certified
              members:
            </p>
            <ul className="text-sm text-slate-600 space-y-2 mb-4">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                Maintain current public liability and professional indemnity
                insurance
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                Employ Licensed Building Practitioners (LBPs)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                Follow documented quality management procedures
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                Undergo regular compliance audits
              </li>
            </ul>
            <Link
              href="https://ranz.org.nz"
              className="text-sm text-blue-600 hover:underline"
            >
              Learn more about RANZ certification
            </Link>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 py-8 bg-white">
        <div className="max-w-5xl mx-auto px-4 text-center text-sm text-slate-500">
          <p>
            Roofing Association of New Zealand | Certified Business Portal
          </p>
          <p className="mt-1">
            <Link href="/privacy" className="hover:underline">
              Privacy Policy
            </Link>
            {" | "}
            <Link href="/terms" className="hover:underline">
              Terms of Use
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
