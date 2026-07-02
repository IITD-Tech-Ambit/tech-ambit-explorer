import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Layers, Compass, Network, Building2, ArrowLeft, Search, X } from "lucide-react";
import {
    useTaxonomyDepartments, useTaxonomyThemes, useTaxonomyDomains,
    useTaxonomySubdomains, useTaxonomyCounts,
} from "@/lib/api/hooks/useTaxonomy";
import { rankByPaperCount, type TaxonomyNode } from "@/lib/api/services/taxonomyService";
import TaxonomyNodeGrid from "@/components/explore/taxonomy/TaxonomyNodeGrid";
import TaxonomyNodePagination from "@/components/explore/taxonomy/TaxonomyNodePagination";
import TaxonomySelectionBar, { type SelectionChip } from "@/components/explore/taxonomy/TaxonomySelectionBar";
import TaxonomyFacultySection from "@/components/explore/taxonomy/TaxonomyFacultySection";

const ALL_DEPARTMENTS = "all";
// Domains (35 total) get a larger page — a clean multiple of the 4-column
// dense grid, so every full page fills evenly with no ragged trailing row.
// Sub-domains max out around 11 per domain, so a smaller page keeps
// pagination meaningfully usable there instead of never triggering.
const DOMAINS_PER_PAGE = 20;
const SUBDOMAINS_PER_PAGE = 8;

/**
 * Browse Research Areas — a single guided path through the classified corpus:
 * pick a Thematic Area, then a Domain within it, then a Sub-domain, then see
 * the faculty behind that combination. Domain/Sub-domain browsing is always
 * theme-scoped (no direct "all domains" entry), one step at a time. Faculty
 * results resolve to the shared FacultyCard and link to /faculty/:kerberos
 * like the Directory.
 */
const TaxonomyBrowse = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    const theme = searchParams.get("theme") ?? undefined;
    const domain = searchParams.get("domain") ?? undefined;
    const subdomain = searchParams.get("subdomain") ?? undefined;
    const department = searchParams.get("department") ?? undefined;
    const facultyPage = Math.max(1, parseInt(searchParams.get("fpage") ?? "1", 10) || 1);
    const domainPage = Math.max(1, parseInt(searchParams.get("dpage") ?? "1", 10) || 1);
    const subdomainPage = Math.max(1, parseInt(searchParams.get("spage") ?? "1", 10) || 1);

    const updateParams = useCallback((updates: Record<string, string | undefined>) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            for (const [key, value] of Object.entries(updates)) {
                if (value === undefined) next.delete(key);
                else next.set(key, value);
            }
            // Any filter change resets paging for whichever level(s) it affects
            if (!("fpage" in updates)) next.delete("fpage");
            if (!("dpage" in updates)) next.delete("dpage");
            if (!("spage" in updates)) next.delete("spage");
            return next;
        });
    }, [setSearchParams]);

    const hasSelection = !!(theme || domain || subdomain);
    const filters = useMemo(
        () => ({ theme, domain, subdomain, department }),
        [theme, domain, subdomain, department]
    );

    // Ephemeral client-side filter to narrow the visible node grid (esp. useful
    // for the 35 domains / 186 sub-domains). Reset whenever the browse context changes.
    const [nodeFilter, setNodeFilter] = useState("");
    const filterNodes = useCallback(<T extends TaxonomyNode>(nodes: T[] | undefined): T[] | undefined => {
        const q = nodeFilter.trim().toLowerCase();
        if (!q || !nodes) return nodes;
        return nodes.filter((n) => n.name.toLowerCase().includes(q));
    }, [nodeFilter]);

    // Data — every call is a precomputed, cached lookup on the backend
    const departmentsQuery = useTaxonomyDepartments();
    const themesQuery = useTaxonomyThemes(department);
    const domainsQuery = useTaxonomyDomains(theme, department);
    const subdomainsQuery = useTaxonomySubdomains(domain, theme, department);
    const countsQuery = useTaxonomyCounts(filters, hasSelection);

    // Display names for chips, resolved from already-cached lists
    const themeName = themesQuery.data?.themes.find((t) => t.slug === theme)?.name;
    const domainName =
        domainsQuery.data?.domains.find((d) => d.slug === domain)?.name
        ?? subdomainsQuery.data?.domain.name;
    const subdomainName = subdomainsQuery.data?.subdomains.find((s) => s.slug === subdomain)?.name;

    const chips: SelectionChip[] = [
        theme && {
            key: "theme", label: "Theme", value: themeName ?? theme,
            onRemove: () => updateParams({ theme: undefined, domain: undefined, subdomain: undefined }),
        },
        domain && {
            key: "domain", label: "Domain", value: domainName ?? domain,
            onRemove: () => updateParams({ domain: undefined, subdomain: undefined }),
        },
        subdomain && {
            key: "subdomain", label: "Sub-domain", value: subdomainName ?? subdomain,
            onRemove: () => updateParams({ subdomain: undefined }),
        },
    ].filter(Boolean) as SelectionChip[];

    // Drill level: what the node grid currently shows. Domains/sub-domains are
    // always theme-scoped — there is no "browse all domains" entry point.
    const level: "themes" | "domains" | "subdomains" | "leaf" =
        subdomain ? "leaf"
        : domain ? "subdomains"
        : theme ? "domains"
        : "themes";

    useEffect(() => {
        setNodeFilter("");
    }, [level, department]);

    /**
     * Slice an already-filtered node list into one page. Clamps the current
     * page to the valid range itself (rather than resetting the URL on every
     * keystroke) so narrowing the node-filter text never strands the view on
     * an empty out-of-range page.
     */
    const paginate = useCallback(<T extends TaxonomyNode>(nodes: T[] | undefined, page: number, perPage: number) => {
        if (!nodes) return { pageItems: undefined, totalPages: 0, currentPage: page };
        const totalPages = Math.max(1, Math.ceil(nodes.length / perPage));
        const currentPage = Math.min(page, totalPages);
        const start = (currentPage - 1) * perPage;
        return { pageItems: nodes.slice(start, start + perPage), totalPages, currentPage };
    }, []);

    // Kept short and unconditional — the active theme/domain is already shown
    // as a removable chip in the selection bar directly below, so repeating
    // the (potentially long) name here would only truncate awkwardly.
    const gridTitle =
        level === "themes" ? "Thematic Areas"
        : level === "domains" ? "Domains"
        : level === "subdomains" ? "Sub-domains"
        : null;

    const visibleCount =
        level === "themes" ? filterNodes(themesQuery.data?.themes)?.length
        : level === "domains" ? filterNodes(domainsQuery.data?.domains)?.length
        : level === "subdomains" ? filterNodes(subdomainsQuery.data?.subdomains)?.length
        : undefined;

    const selectNode = (key: "theme" | "domain" | "subdomain") => (node: TaxonomyNode) =>
        updateParams({ [key]: node.slug });

    return (
        <div className="page-bg min-h-screen flex flex-col">
            <Navigation />

            {/* Hero */}
            <section className="relative overflow-hidden gradient-subtle section-bg border-b border-border/60">
                <div className="absolute top-1/4 -left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-80 h-80 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative container mx-auto px-4 py-10 md:py-14">
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                        <div className="max-w-2xl">
                            <h1 className="text-3xl md:text-4xl font-bold mb-3">Browse Research Areas</h1>
                            <p className="text-muted-foreground text-base md:text-lg">
                                Start with a strategic Thematic Area, drill into a Domain and
                                Sub-domain, and discover the faculty behind each area.
                            </p>
                        </div>
                        <Button variant="outline" asChild className="self-start md:self-auto">
                            <Link to="/explore">
                                <Search className="w-4 h-4 mr-2" />
                                Search instead
                            </Link>
                        </Button>
                    </div>

                    {/* Controls: filter + department row */}
                    <div className="mt-8 flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row items-stretch gap-3">
                            {/* Only worth a search box once there are enough nodes to scan
                                through — 9 fixed themes never need it. */}
                            {level !== "leaf" && level !== "themes" && (
                                <div className="relative flex-1 min-w-0">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                    <Input
                                        value={nodeFilter}
                                        onChange={(e) => setNodeFilter(e.target.value)}
                                        placeholder={
                                            level === "themes" ? "Filter thematic areas by name…"
                                            : level === "domains" ? "Filter domains by name…"
                                            : "Filter sub-domains by name…"
                                        }
                                        className="pl-11 pr-10 h-12 rounded-full border-2 bg-background shadow-sm"
                                    />
                                    {nodeFilter && (
                                        <button
                                            onClick={() => setNodeFilter("")}
                                            aria-label="Clear filter"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-muted-foreground hover:bg-muted transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            )}

                            <Select
                                value={department ?? ALL_DEPARTMENTS}
                                onValueChange={(value) =>
                                    updateParams({ department: value === ALL_DEPARTMENTS ? undefined : value })
                                }
                            >
                                <SelectTrigger className="h-12 w-full sm:w-[280px] shrink-0 rounded-full border-2 bg-background shadow-sm">
                                    <span className="inline-flex items-center gap-2 truncate">
                                        <Building2 className="w-4 h-4 shrink-0 text-muted-foreground" />
                                        <SelectValue placeholder="All departments" />
                                    </span>
                                </SelectTrigger>
                                <SelectContent className="max-h-80">
                                    <SelectItem value={ALL_DEPARTMENTS}>All departments</SelectItem>
                                    {departmentsQuery.data?.departments.map((d) => (
                                        <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </section>

            <TaxonomySelectionBar
                chips={chips}
                paperCount={countsQuery.data?.paper_count}
                facultyCount={countsQuery.data?.faculty_count}
                isCountLoading={countsQuery.isLoading}
                onClearAll={() => updateParams({ theme: undefined, domain: undefined, subdomain: undefined })}
            />

            <main className="container mx-auto px-4 py-10 flex-1 space-y-12">
                {level !== "leaf" && (
                    <section aria-label={gridTitle ?? "Research areas"}>
                        <div className="flex items-center gap-3 mb-5">
                            {hasSelection && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 shrink-0"
                                    onClick={() =>
                                        level === "subdomains"
                                            ? updateParams({ domain: undefined })
                                            : updateParams({ theme: undefined })
                                    }
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                </Button>
                            )}
                            <h2 className="text-xl font-semibold flex items-center gap-2 min-w-0">
                                <Compass className="w-5 h-5 shrink-0 text-primary" />
                                <span className="truncate">{gridTitle}</span>
                            </h2>
                            {visibleCount !== undefined && (
                                <span className="shrink-0 text-sm font-medium text-muted-foreground rounded-full bg-muted px-2.5 py-0.5">
                                    {visibleCount}
                                </span>
                            )}
                        </div>

                        {level === "themes" && (
                            <TaxonomyNodeGrid
                                nodes={rankByPaperCount(themesQuery.data?.themes)}
                                isLoading={themesQuery.isLoading}
                                icon={Layers}
                                onSelect={selectNode("theme")}
                                useThemeAccents
                                emptyMessage="No thematic areas found for this department."
                            />
                        )}
                        {level === "domains" && (() => {
                            const { pageItems, totalPages, currentPage } = paginate(rankByPaperCount(filterNodes(domainsQuery.data?.domains)), domainPage, DOMAINS_PER_PAGE);
                            return (
                                <>
                                    <TaxonomyNodeGrid
                                        nodes={pageItems}
                                        isLoading={domainsQuery.isLoading}
                                        icon={Network}
                                        onSelect={selectNode("domain")}
                                        density="dense"
                                        detailFor={(n) =>
                                            n.subdomain_count ? `${n.subdomain_count} sub-domains` : undefined
                                        }
                                        emptyMessage={nodeFilter ? `No domains match "${nodeFilter}".` : "No domains found for this combination of filters."}
                                    />
                                    <TaxonomyNodePagination
                                        page={currentPage}
                                        totalPages={totalPages}
                                        onPageChange={(page) => updateParams({ dpage: String(page) })}
                                    />
                                </>
                            );
                        })()}
                        {level === "subdomains" && (() => {
                            const { pageItems, totalPages, currentPage } = paginate(rankByPaperCount(filterNodes(subdomainsQuery.data?.subdomains)), subdomainPage, SUBDOMAINS_PER_PAGE);
                            return (
                                <>
                                    <TaxonomyNodeGrid
                                        nodes={pageItems}
                                        isLoading={subdomainsQuery.isLoading}
                                        icon={Compass}
                                        onSelect={selectNode("subdomain")}
                                        density="dense"
                                        emptyMessage={nodeFilter ? `No sub-domains match "${nodeFilter}".` : "No sub-domains found for this combination of filters."}
                                    />
                                    <TaxonomyNodePagination
                                        page={currentPage}
                                        totalPages={totalPages}
                                        onPageChange={(page) => updateParams({ spage: String(page) })}
                                    />
                                </>
                            );
                        })()}
                    </section>
                )}

                {hasSelection && (
                    <div className="rounded-3xl bg-muted/40 border border-border/50 p-5 md:p-8">
                        <TaxonomyFacultySection
                            filters={filters}
                            page={facultyPage}
                            onPageChange={(page) => updateParams({ fpage: String(page) })}
                        />
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
};

export default TaxonomyBrowse;
