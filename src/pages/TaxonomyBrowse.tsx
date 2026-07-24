import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Building2, Search } from "lucide-react";
import { useTaxonomyDepartments } from "@/lib/api/hooks/useTaxonomy";
import TaxonomyFieldPicker from "@/components/explore/taxonomy/TaxonomyFieldPicker";
import TaxonomyFacultySection from "@/components/explore/taxonomy/TaxonomyFacultySection";

const ALL_DEPARTMENTS = "__ALL__";
const normalizeNonEmpty = (value: string | null | undefined): string | undefined => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
};

/**
 * Browse Research Areas — a cascading field picker (Thematic Area → Domain,
 * each choice collapsing into a removable pill), mirroring UQ Experts'
 * "Browse by fields of research" picker. A single "Browse N experts" action
 * at the bottom updates in place as the selection deepens — nothing appears
 * automatically on selection, and results re-hide if the selection changes.
 */
const TaxonomyBrowse = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    const theme = normalizeNonEmpty(searchParams.get("theme"));
    const domain = normalizeNonEmpty(searchParams.get("domain"));
    const department = normalizeNonEmpty(searchParams.get("department"));
    const facultyPage = Math.max(1, parseInt(searchParams.get("fpage") ?? "1", 10) || 1);

    const updateParams = useCallback((updates: Record<string, string | undefined>) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            for (const [key, value] of Object.entries(updates)) {
                if (value === undefined) next.delete(key);
                else next.set(key, value);
            }
            // Any filter change resets faculty paging
            if (!("fpage" in updates)) next.delete("fpage");
            return next;
        });
    }, [setSearchParams]);

    // Results are an explicit "Browse" action (the single button in the
    // picker), not automatic on selection — resets whenever the underlying
    // selection changes, so it has to be clicked again for the new choice.
    // Exception: arriving via a deep link with ?experts=1 (e.g. the chatbot's
    // "View experts" button) auto-reveals the experts for the pre-selected area.
    const [revealed, setRevealed] = useState(() => searchParams.get("experts") === "1");
    const skipFirstRevealReset = useRef(true);
    useEffect(() => {
        if (skipFirstRevealReset.current) {
            skipFirstRevealReset.current = false;
            return;
        }
        setRevealed(false);
    }, [theme, domain]);

    // Data — every call is a precomputed, cached lookup on the backend
    const departmentsQuery = useTaxonomyDepartments();
    const sanitizedDepartments = useMemo(() => {
        const source = departmentsQuery.data?.departments ?? [];
        const seen = new Set<string>();
        const sanitized: Array<{ id: string; name: string; code: string }> = [];

        for (const dept of source) {
            const code = normalizeNonEmpty(dept.code);
            if (!code) continue;

            const codeKey = code.toLowerCase();
            if (seen.has(codeKey)) continue;
            seen.add(codeKey);

            sanitized.push({
                ...dept,
                code,
                name: normalizeNonEmpty(dept.name) ?? code,
            });
        }
        return sanitized;
    }, [departmentsQuery.data?.departments]);
    const departmentCodeLookup = useMemo(() => {
        const lookup = new Map<string, string>();
        for (const dept of sanitizedDepartments) {
            lookup.set(dept.code.toLowerCase(), dept.code);
        }
        return lookup;
    }, [sanitizedDepartments]);
    const canonicalDepartment = department ? departmentCodeLookup.get(department.toLowerCase()) : undefined;
    const selectedDepartmentValue = canonicalDepartment ?? ALL_DEPARTMENTS;

    const filters = useMemo(
        () => ({ theme, domain, department: canonicalDepartment }),
        [theme, domain, canonicalDepartment]
    );

    useEffect(() => {
        if (!searchParams.has("department")) return;

        // Remove invalid/blank URL department values once list metadata is available.
        if (!department || (sanitizedDepartments.length > 0 && !canonicalDepartment)) {
            updateParams({ department: undefined });
        }
    }, [searchParams, department, sanitizedDepartments.length, canonicalDepartment, updateParams]);

    return (
        <div className="page-bg min-h-screen flex flex-col">
            <Navigation />

            <section className="relative overflow-hidden gradient-subtle section-bg border-b border-border/60">
                <div className="absolute top-1/4 -left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-80 h-80 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative container mx-auto px-4 py-10 md:py-12">
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                        <div className="max-w-2xl">
                            <h1 className="text-3xl md:text-4xl font-bold mb-3">Browse by Thematic Area</h1>
                            <p className="text-muted-foreground text-base md:text-lg">
                                Filter by Thematic Area and Domain to find the experts working in it.
                            </p>
                        </div>
                        <Button variant="outline" asChild className="self-start md:self-auto">
                            <Link to="/explore">
                                <Search className="w-4 h-4 mr-2" />
                                Search instead
                            </Link>
                        </Button>
                    </div>

                    <div className="mt-8 flex flex-col gap-2">
                        <Select
                            value={selectedDepartmentValue}
                            onValueChange={(value) =>
                                updateParams({ department: value === ALL_DEPARTMENTS ? undefined : value })
                            }
                        >
                            <SelectTrigger className="h-11 w-full sm:w-[280px] gap-2 rounded-xl border border-border/80 bg-background shadow-sm hover:border-primary/30 focus:ring-1 focus:ring-primary/30 focus:ring-offset-0">
                                <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <SelectValue placeholder="All departments" />
                            </SelectTrigger>
                            <SelectContent className="max-h-80 rounded-xl">
                                <SelectItem value={ALL_DEPARTMENTS}>All departments</SelectItem>
                                {sanitizedDepartments.map((d) => (
                                    <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {departmentsQuery.isError && (
                            <p className="text-xs text-muted-foreground">
                                Department filters are temporarily unavailable. Browsing by area still works.
                            </p>
                        )}
                    </div>
                </div>
            </section>

            <main className="container mx-auto px-4 py-10 flex-1 space-y-10">
                <div className="max-w-6xl mx-auto">
                    <TaxonomyFieldPicker
                        department={canonicalDepartment}
                        selectedTheme={theme}
                        selectedDomain={domain}
                        onSelectTheme={(node) => updateParams({ theme: node.slug, domain: undefined })}
                        onClearTheme={() => updateParams({ theme: undefined, domain: undefined })}
                        onSelectDomain={(node) => updateParams({ domain: node.slug })}
                        onClearDomain={() => updateParams({ domain: undefined })}
                        onBrowse={() => setRevealed(true)}
                    />
                </div>

                {revealed && (
                    <div className="max-w-6xl mx-auto animate-fade-in">
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
