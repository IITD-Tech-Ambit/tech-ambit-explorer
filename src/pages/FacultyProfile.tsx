import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    User, Mail, BookOpen, Award, ExternalLink, Building2, ArrowLeft, Loader2,
    FileText, TrendingUp, FileBadge2, Pencil, Camera, X, Plus, GraduationCap,
    Trophy, Phone, MapPin, Link2,
} from "lucide-react";
import { useState, useRef, useEffect, type ElementType, type ChangeEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useFacultyByKerberos, useFacultyResearchSummary } from "@/lib/api/hooks/useDirectory";
import { useFacultyPatents } from "@/lib/api/hooks/useIPSearch";
import PublicationTimeline from "@/components/PublicationTimeline";
import PatentTimeline from "@/components/PatentTimeline";
import { getDepartmentUrl } from "@/lib/deptUrls";
import { useAuth } from "@/contexts/AuthContext";
import {
    uploadFacultyImage, updateFacultyVisibility, getFacultyProfileExtras,
    updateFacultyProfileExtras, type MetricVisibility, type FacultyProfileExtras,
} from "@/lib/api/services/directoryService";
import { queryKeys } from "@/lib/api/hooks/queryKeys";

const ALL_VISIBLE: MetricVisibility = { h_index: true, citations: true, papers: true, patents: true };
const BACKGROUND_MIN = 100;

const kerberosFromEmail = (email?: string) =>
    email ? email.split("@")[0]?.toLowerCase() : "";

// The server validates + stores only absolute http(s) links; this is a
// defence-in-depth guard so a bad value can never become a javascript: href.
const isHttpUrl = (url: string) => /^https?:\/\//i.test(url);

const FacultyProfile = () => {
    const { kerberos: urlKerberos } = useParams<{ kerberos: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    const kerberos = urlKerberos?.trim().toLowerCase() ?? "";

    // Profiles are linked from many places (Directory, taxonomy Browse, Explore,
    // Atlas, chat) — go back to wherever the user actually came from
    // instead of a hardcoded destination. React Router sets location.key to
    // 'default' when this tab has no prior in-app history (direct link/refresh).
    const goBack = () => {
        if (location.key !== "default") navigate(-1);
        else navigate("/directory");
    };

    const { data: faculty, isLoading: isFacultyLoading, isError: isFacultyError } = useFacultyByKerberos(kerberos);
    const { data: summaryData, isLoading: isSummaryLoading } = useFacultyResearchSummary(kerberos);
    const { data: patentsData, isLoading: isPatentsLoading } = useFacultyPatents(kerberos, faculty?.name ?? "");

    // A faculty member may edit ONLY their own profile (their kerberos === this page's).
    const { user } = useAuth();
    const isOwner = !!user && user.kerberos?.toLowerCase() === kerberos;
    const queryClient = useQueryClient();
    const [editMode, setEditMode] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Metric-visibility toggles (owner edits these; hidden metrics are already
    // redacted server-side, so `faculty.metricVisibility` is the source of truth).
    const serverVis: MetricVisibility = { ...ALL_VISIBLE, ...(faculty?.metricVisibility ?? {}) };
    const [visFlags, setVisFlags] = useState<MetricVisibility>(ALL_VISIBLE);
    useEffect(() => {
        if (faculty?.metricVisibility) setVisFlags({ ...ALL_VISIBLE, ...faculty.metricVisibility });
    }, [faculty?.metricVisibility]);

    // Background / Qualifications editor state. The DRAFT (`extras`) is loaded from
    // the owner-only endpoint when edit mode opens, so the owner can edit even
    // hidden content (the public read redacts it). Display (non-edit) uses the
    // public `faculty.*` fields instead.
    const [extras, setExtras] = useState<FacultyProfileExtras | null>(null);
    const [extrasLoading, setExtrasLoading] = useState(false);
    const [savingExtras, setSavingExtras] = useState(false);
    const [extrasError, setExtrasError] = useState<string | null>(null);

    useEffect(() => {
        // Don't refetch after a failure (extrasError) — that would loop; closeEdit
        // clears the error so reopening the editor retries once.
        if (!editMode || !isOwner || extras || extrasLoading || extrasError) return;
        setExtrasLoading(true);
        getFacultyProfileExtras(kerberos)
            .then((e) => setExtras(e))
            .catch((err) => setExtrasError(err instanceof Error ? err.message : "Failed to load sections."))
            .finally(() => setExtrasLoading(false));
    }, [editMode, isOwner, kerberos, extras, extrasLoading, extrasError]);

    const closeEdit = () => {
        setEditMode(false);
        setUploadError(null);
        setExtrasError(null);
        setExtras(null); // drop unsaved draft so the next open reloads server state
        setVisFlags(serverVis); // ...and unsaved metric toggles, too
    };

    // Metric toggles are saved by the same "Save changes" button as the sections.
    const visChanged = (Object.keys(visFlags) as (keyof MetricVisibility)[]).some(
        (k) => visFlags[k] !== serverVis[k],
    );

    const handleSave = async () => {
        if (!extras) return;
        const background = extras.background;
        const qualifications = extras.qualifications.map((q) => q.trim()).filter(Boolean);
        const awards = extras.awards.map((a) => a.trim()).filter(Boolean);
        const customResearchAreas = extras.customResearchAreas.map((a) => a.trim()).filter(Boolean);
        const additionalEmails = extras.additionalEmails.map((e) => e.trim()).filter(Boolean);
        const phone = extras.phone.trim();
        const officeAddress = extras.officeAddress.trim();
        // Blank rows (no URL) are simply dropped; the server validates the rest.
        const externalLinks = extras.externalLinks
            .map((l) => ({ label: l.label.trim(), url: l.url.trim() }))
            .filter((l) => l.url);

        // Mirror the backend "only enforce when shown" validation so the owner
        // gets an inline message instead of a round-trip 400.
        if (extras.backgroundVisible && background.trim().length < BACKGROUND_MIN) {
            setExtrasError(`Background must be at least ${BACKGROUND_MIN} characters to show it.`);
            return;
        }
        if (extras.qualificationsVisible && qualifications.length === 0) {
            setExtrasError("Add at least one qualification to show this section.");
            return;
        }
        if (extras.awardsVisible && awards.length === 0) {
            setExtrasError("Add at least one award to show this section.");
            return;
        }
        if (extras.phoneVisible && !phone) {
            setExtrasError("Add a contact number to show it.");
            return;
        }
        if (extras.officeAddressVisible && !officeAddress) {
            setExtrasError("Add an office address to show it.");
            return;
        }
        if (extras.externalLinksVisible && externalLinks.length === 0) {
            setExtrasError("Add at least one link to show this section.");
            return;
        }
        setSavingExtras(true);
        setExtrasError(null);
        let sectionsSaved = false;
        try {
            const saved = await updateFacultyProfileExtras(kerberos, {
                background,
                qualifications,
                background_visible: extras.backgroundVisible,
                qualifications_visible: extras.qualificationsVisible,
                awards,
                awards_visible: extras.awardsVisible,
                custom_research_areas: customResearchAreas,
                additional_emails: additionalEmails,
                phone,
                phone_visible: extras.phoneVisible,
                office_address: officeAddress,
                office_address_visible: extras.officeAddressVisible,
                external_links: externalLinks,
                external_links_visible: extras.externalLinksVisible,
            });
            setExtras(saved);
            sectionsSaved = true;
            if (visChanged) await updateFacultyVisibility(kerberos, visFlags);
            await queryClient.invalidateQueries({ queryKey: queryKeys.directory.all });
            setEditMode(false);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to save.";
            if (sectionsSaved) {
                // Sections went through but the metric toggles didn't: refresh what did
                // save and say so, rather than implying nothing was saved.
                await queryClient.invalidateQueries({ queryKey: queryKeys.directory.all });
                setExtrasError(`Your profile details were saved, but the metric visibility was not: ${msg}`);
            } else {
                setExtrasError(msg);
            }
        } finally {
            setSavingExtras(false);
        }
    };

    const handleImageSelected = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = ""; // let the same file be re-picked after an error
        if (!file) return;
        if (!file.type.startsWith("image/")) { setUploadError("Please choose an image file."); return; }
        if (file.size > 5 * 1024 * 1024) { setUploadError("Image must be under 5 MB."); return; }
        setUploadError(null);
        setUploading(true);
        try {
            await uploadFacultyImage(kerberos, file);
            // Refresh this profile + every directory listing so the new image
            // appears here and in directory results at once.
            await queryClient.invalidateQueries({ queryKey: queryKeys.directory.all });
            setEditMode(false);
        } catch (err) {
            setUploadError(err instanceof Error ? err.message : "Upload failed.");
        } finally {
            setUploading(false);
        }
    };

    if (isFacultyLoading) {
        return (
            <div className="min-h-screen page-bg">
                <Navigation />
                <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                        <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-b-accent/40 animate-spin" style={{ animationDuration: "1.5s", animationDirection: "reverse" }} />
                    </div>
                    <p className="text-sm text-muted-foreground animate-pulse">Loading faculty profile…</p>
                </div>
                <Footer />
            </div>
        );
    }

    if (isFacultyError || !faculty) {
        return (
            <div className="min-h-screen page-bg">
                <Navigation />
                <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                        <User className="w-9 h-9 text-muted-foreground/50" />
                    </div>
                    <p className="text-muted-foreground text-lg font-medium">Faculty profile not found</p>
                    <Button variant="outline" onClick={goBack}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                </div>
                <Footer />
            </div>
        );
    }

    const initials = getInitials(faculty.name);
    const dept = faculty.department;
    const deptName = dept?.name?.trim();
    const deptCode = dept?.code?.trim();
    const deptCategory = dept?.category?.trim();
    const deptUrl = dept?.officialUrl || getDepartmentUrl(deptName);
    const extraUnits = (faculty.affiliations || []).filter(
        (unit) => unit?.name && unit.name !== deptName
    );

    const hIndex = summaryData?.hIndex ?? faculty.hIndex ?? 0;
    const citations = summaryData?.citationCount ?? faculty.citationCount ?? 0;
    const totalPapers = summaryData?.stats?.totalPapers ?? 0;

    const scopusId = summaryData?.scopusId || faculty.scopusId;
    const googleScholarId = faculty.googleScholarId;

    // Faculty-labelled external links. The server returns null while the section
    // is hidden, so an empty list here means "nothing to show".
    const externalLinks = (faculty.externalLinks ?? []).filter((l) => isHttpUrl(l.url));
    const patents = patentsData?.results ?? [];
    const totalPatents = patentsData?.pagination?.total ?? 0;
    // While the patents fetch is still in flight we don't yet know whether there'll be a second
    // column, so optimistically reserve the 2-col layout (a loading placeholder briefly occupies
    // it) rather than flashing 1-col -> 2-col. Once it resolves, collapse to a single full-width
    // column for Publications when there are genuinely 0 patents — a `grid-cols-2` template
    // doesn't collapse on its own just because one child renders null, so this has to be driven
    // from here rather than from PatentTimeline's own empty-state return.
    const showPatentsColumn = isPatentsLoading || patents.length > 0;

    const handleNavigateAuthor = (authorId: string, matchedProfile: string | null, name: string) => {
        if (matchedProfile) {
            resolveAndNavigate(matchedProfile);
        } else if (authorId) {
            resolveAndNavigateByScopus(authorId, name);
        }
    };

    const resolveAndNavigate = async (facultyId: string) => {
        try {
            const { getFacultyById } = await import("@/lib/api/services/directoryService");
            const f = await getFacultyById(facultyId);
            const k = kerberosFromEmail(f.email);
            if (k) window.open(`/faculty/${k}`, "_blank", "noopener");
        } catch { /* ignore */ }
    };

    const resolveAndNavigateByScopus = async (scopusAuthorId: string, _name: string) => {
        try {
            const { getFacultyByScopusId } = await import("@/lib/api/services/directoryService");
            const f = await getFacultyByScopusId(scopusAuthorId);
            const k = kerberosFromEmail(f.email);
            if (k) window.open(`/faculty/${k}`, "_blank", "noopener");
        } catch { /* ignore */ }
    };

    return (
        <div className="min-h-screen page-bg">
            <Navigation />

            {/* Hero Banner */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10 pointer-events-none" />
                <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-72 h-72 rounded-full bg-accent/5 blur-3xl pointer-events-none" />

                <div className="relative container mx-auto px-4 pt-10 pb-12">
                    <div className="flex items-center justify-between mb-8">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={goBack}
                            className="-ml-2 text-muted-foreground hover:text-foreground group"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1.5 transition-transform group-hover:-translate-x-0.5" />
                            Back
                        </Button>
                        {isOwner && (
                            editMode ? (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={closeEdit}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    <X className="w-4 h-4 mr-1.5" />
                                    Cancel
                                </Button>
                            ) : (
                                <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                                    <Pencil className="w-4 h-4 mr-1.5" />
                                    Edit
                                </Button>
                            )
                        )}
                    </div>

                    <div className="flex flex-col lg:flex-row items-start gap-8">
                        <div className="flex-shrink-0">
                            <div className="relative">
                                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-primary/30 to-accent/20 blur-md opacity-60" />
                                {faculty.profileImageUrl ? (
                                    <img
                                        src={faculty.profileImageUrl}
                                        alt={faculty.name}
                                        loading="lazy"
                                        className="relative w-36 h-36 rounded-3xl object-cover shadow-2xl border-2 border-white/50 dark:border-white/10"
                                    />
                                ) : (
                                    <div className="relative w-36 h-36 rounded-3xl bg-gradient-to-br from-primary/50 to-accent/40 flex items-center justify-center text-4xl font-bold text-white shadow-2xl">
                                        {initials}
                                    </div>
                                )}
                                {isOwner && editMode && (
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading}
                                        title="Change photo"
                                        className="absolute inset-0 z-10 rounded-3xl bg-black/45 hover:bg-black/55 flex flex-col items-center justify-center gap-1 text-white text-xs font-medium cursor-pointer transition-colors disabled:cursor-wait"
                                    >
                                        {uploading ? (
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                        ) : (
                                            <>
                                                <Camera className="w-6 h-6" />
                                                <span>Change photo</span>
                                            </>
                                        )}
                                    </button>
                                )}
                                {deptCode && (
                                    <Badge className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[10px] px-2.5 py-1 bg-primary text-primary-foreground border border-primary/20 shadow-lg whitespace-nowrap">
                                        {deptCode.toUpperCase()}
                                    </Badge>
                                )}
                            </div>
                            {isOwner && (
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageSelected}
                                />
                            )}
                            {uploadError && (
                                <p className="mt-3 text-xs text-destructive text-center max-w-36">{uploadError}</p>
                            )}
                        </div>

                        <div className="flex-1 min-w-0 pt-1">
                            <h1 className="text-4xl font-bold tracking-tight mb-1">{faculty.name}</h1>
                            {faculty.designation && (
                                <p className="text-primary font-semibold text-lg mb-4">{faculty.designation}</p>
                            )}

                            <div className="flex flex-wrap gap-3 mb-5">
                                {deptName && (
                                    deptUrl ? (
                                        <a
                                            href={deptUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 rounded-xl bg-background/70 backdrop-blur border border-border/60 px-3 py-2 shadow-sm text-foreground hover:text-primary hover:border-primary/30 transition-colors group"
                                        >
                                            <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                                                <Building2 className="w-3.5 h-3.5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold leading-none mb-0.5">
                                                    {deptCategory || "Department"}
                                                </p>
                                                <p className="text-sm font-semibold leading-none flex items-center gap-1">
                                                    {deptName}
                                                    <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                                                </p>
                                            </div>
                                        </a>
                                    ) : (
                                        <div className="inline-flex items-center gap-2 rounded-xl bg-background/70 backdrop-blur border border-border/60 px-3 py-2 shadow-sm">
                                            <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                                                <Building2 className="w-3.5 h-3.5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold leading-none mb-0.5">
                                                    {deptCategory || "Department"}
                                                </p>
                                                <p className="text-sm font-semibold text-foreground leading-none">{deptName}</p>
                                            </div>
                                        </div>
                                    )
                                )}
                                {extraUnits.map((unit) => {
                                    const extraUrl = unit.officialUrl || getDepartmentUrl(unit.name);
                                    return extraUrl ? (
                                        <a
                                            key={unit._id || unit.code}
                                            href={extraUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 rounded-xl bg-background/70 backdrop-blur border border-border/60 px-3 py-2 shadow-sm text-foreground hover:text-primary hover:border-primary/30 transition-colors"
                                        >
                                            <div>
                                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold leading-none mb-0.5">
                                                    Also
                                                </p>
                                                <p className="text-sm font-semibold leading-none">{unit.name}</p>
                                            </div>
                                        </a>
                                    ) : (
                                        <div
                                            key={unit._id || unit.code}
                                            className="inline-flex items-center gap-2 rounded-xl bg-background/70 backdrop-blur border border-border/60 px-3 py-2 shadow-sm"
                                        >
                                            <div>
                                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold leading-none mb-0.5">
                                                    Also
                                                </p>
                                                <p className="text-sm font-semibold leading-none">{unit.name}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                                {faculty.email && (
                                    <a
                                        href={`mailto:${faculty.email}`}
                                        className="inline-flex items-center gap-2 rounded-xl bg-background/70 backdrop-blur border border-border/60 px-3 py-2 shadow-sm text-sm text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
                                    >
                                        <Mail className="w-3.5 h-3.5" />
                                        {faculty.email}
                                    </a>
                                )}
                                {faculty.additionalEmails?.map((em) => (
                                    <a
                                        key={em}
                                        href={`mailto:${em}`}
                                        className="inline-flex items-center gap-2 rounded-xl bg-background/70 backdrop-blur border border-border/60 px-3 py-2 shadow-sm text-sm text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
                                    >
                                        <Mail className="w-3.5 h-3.5" />
                                        {em}
                                    </a>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl">
                                {serverVis.h_index && <BigStatCard icon={Award} label="H-Index" value={hIndex} color="primary" />}
                                {serverVis.citations && <BigStatCard icon={BookOpen} label="Citations" value={citations.toLocaleString()} color="accent" />}
                                {serverVis.papers && totalPapers > 0 && (
                                    <BigStatCard icon={FileText} label="Papers" value={totalPapers} color="primary" />
                                )}
                                {serverVis.patents && !isPatentsLoading && totalPatents > 0 && (
                                    <BigStatCard icon={FileBadge2} label="Patents" value={totalPatents} color="accent" />
                                )}
                            </div>

                            {isOwner && editMode && (
                                <div className="mt-5 rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-4 max-w-md">
                                    <p className="text-sm font-semibold mb-1">Show on your public profile</p>
                                    <p className="text-xs text-muted-foreground mb-3">
                                        Hidden metrics disappear everywhere (profile, directory, search) but are kept and can be shown again anytime. Applied when you press Save changes.
                                    </p>
                                    <div className="space-y-2.5">
                                        {([["h_index", "H-Index"], ["citations", "Citations"], ["papers", "Papers"], ["patents", "Patents"]] as const).map(([key, label]) => (
                                            <div key={key} className="flex items-center justify-between">
                                                <span className="text-sm text-muted-foreground">{label}</span>
                                                <Switch
                                                    checked={visFlags[key]}
                                                    onCheckedChange={(v) => setVisFlags((f) => ({ ...f, [key]: v }))}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Body */}
            <div className="container mx-auto px-4 py-10">
                <div className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto">

                    {/* Left Sidebar — a slim fixed-width rail on lg+ so the timelines get most of the width */}
                    <div className="lg:w-72 lg:flex-shrink-0 space-y-6">
                        {((faculty.dominant_domains && faculty.dominant_domains.length > 0) ||
                            (faculty.customResearchAreas && faculty.customResearchAreas.length > 0)) && (
                            <SectionCard icon={TrendingUp} title="Research Areas">
                                <div className="flex flex-wrap gap-1.5">
                                    {faculty.dominant_domains?.map((area) => (
                                        <Link
                                            key={area.slug}
                                            to={`/research-areas?domain=${encodeURIComponent(area.slug)}&experts=1`}
                                            className="text-[11px] px-2.5 py-1 rounded-lg bg-primary/8 text-primary border border-primary/15 hover:bg-primary/15 hover:border-primary/30 transition-colors"
                                        >
                                            {area.name}
                                        </Link>
                                    ))}
                                    {/* Faculty-added areas: same look as the linked ones above, but plain
                                        text — not clickable and no hover effect (no taxonomy slug). */}
                                    {faculty.customResearchAreas?.map((area, i) => (
                                        <span
                                            key={`custom-${i}`}
                                            className="text-[11px] px-2.5 py-1 rounded-lg bg-primary/8 text-primary border border-primary/15 cursor-default"
                                        >
                                            {area}
                                        </span>
                                    ))}
                                </div>
                            </SectionCard>
                        )}

                        {/* Qualifications (public display) */}
                        {!editMode && faculty.qualificationsVisible && faculty.qualifications && faculty.qualifications.length > 0 && (
                            <SectionCard icon={GraduationCap} title="Qualifications">
                                <ul className="space-y-2">
                                    {faculty.qualifications.map((q, i) => (
                                        <li key={i} className="text-sm text-foreground/90 flex gap-2">
                                            <span className="text-primary mt-0.5 shrink-0">•</span>
                                            <span>{q}</span>
                                        </li>
                                    ))}
                                </ul>
                            </SectionCard>
                        )}

                        {/* Awards & Honors (public display) */}
                        {!editMode && faculty.awardsVisible && faculty.awards && faculty.awards.length > 0 && (
                            <SectionCard icon={Trophy} title="Awards & Honors">
                                <ul className="space-y-2">
                                    {faculty.awards.map((a, i) => (
                                        <li key={i} className="text-sm text-foreground/90 flex gap-2">
                                            <span className="text-primary mt-0.5 shrink-0">•</span>
                                            <span>{a}</span>
                                        </li>
                                    ))}
                                </ul>
                            </SectionCard>
                        )}

                        {/* Contact (public display) — phone / office are null unless shown */}
                        {!editMode && (faculty.phone || faculty.officeAddress) && (
                            <SectionCard icon={Phone} title="Contact">
                                <div className="space-y-3 text-sm">
                                    {faculty.phone && (
                                        <a href={`tel:${faculty.phone.replace(/\s+/g, "")}`} className="flex items-center gap-2 text-foreground/90 hover:text-primary transition-colors">
                                            <Phone className="w-3.5 h-3.5 shrink-0 text-primary" />
                                            <span>{faculty.phone}</span>
                                        </a>
                                    )}
                                    {faculty.officeAddress && (
                                        <div className="flex items-start gap-2 text-foreground/90">
                                            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
                                            <span className="whitespace-pre-line">{faculty.officeAddress}</span>
                                        </div>
                                    )}
                                </div>
                            </SectionCard>
                        )}

                        {(scopusId || googleScholarId || externalLinks.length > 0) && (
                            <div className="space-y-2">
                                {scopusId && (
                                    <a
                                        href={`https://www.scopus.com/authid/detail.uri?authorId=${scopusId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between w-full rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5 p-4 shadow-sm hover:shadow-md hover:border-primary/40 transition-all group"
                                    >
                                        <div>
                                            <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-0.5">External Profile</p>
                                            <p className="text-sm font-semibold text-primary">View on Scopus</p>
                                        </div>
                                        <ExternalLink className="w-5 h-5 text-primary/60 group-hover:text-primary transition-colors flex-shrink-0" />
                                    </a>
                                )}
                                {googleScholarId && (
                                    <a
                                        href={`https://scholar.google.com/citations?user=${googleScholarId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between w-full rounded-2xl border border-blue-200/60 bg-gradient-to-r from-blue-50/50 to-sky-50/50 dark:from-blue-950/20 dark:to-sky-950/20 dark:border-blue-800/30 p-4 shadow-sm hover:shadow-md hover:border-blue-400/60 transition-all group"
                                    >
                                        <div>
                                            <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-0.5">External Profile</p>
                                            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">View on Google Scholar</p>
                                        </div>
                                        <ExternalLink className="w-5 h-5 text-blue-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-shrink-0" />
                                    </a>
                                )}
                                {externalLinks.map(({ label, url }, i) => (
                                    <a
                                        key={`${url}-${i}`}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between w-full rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm hover:shadow-md hover:border-primary/40 transition-all group"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <Link2 className="w-4 h-4 text-primary shrink-0" />
                                            <p className="text-sm font-semibold text-foreground truncate">{label || url}</p>
                                        </div>
                                        <ExternalLink className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right Main Content — Publications and Patents sit side by side on xl+ when there
                        are patents to show; the grid itself only claims a 2nd column in that case, so
                        Publications genuinely spans full width (not just visually, but in the actual
                        grid template) for the many faculty with 0 patents. */}
                    <div className="flex-1 min-w-0">
                        {/* Background & Qualifications editor (owner, edit mode). Roomy card
                            here rather than the cramped hero; loads full content incl. hidden. */}
                        {isOwner && editMode && (
                            <div className="mb-6 rounded-2xl border border-border/60 bg-card/80 backdrop-blur shadow-sm overflow-hidden">
                                <div className="px-5 py-4 border-b border-border/50 bg-muted/20">
                                    <h2 className="text-sm font-semibold text-foreground tracking-wide">Edit profile details</h2>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Optional profile sections. Turn one on to show it publicly; your text is kept even while hidden.
                                    </p>
                                </div>
                                <div className="p-5 space-y-6">
                                    {!extras ? (
                                        extrasError && !extrasLoading ? (
                                            <p className="text-sm text-destructive">
                                                {extrasError} Cancel and try again.
                                            </p>
                                        ) : (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                                                <Loader2 className="w-4 h-4 animate-spin" /> Loading your sections…
                                            </div>
                                        )
                                    ) : (
                                        <>
                                            {/* Background */}
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="text-sm font-semibold text-foreground">Background</label>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground">Show publicly</span>
                                                        <Switch
                                                            checked={extras.backgroundVisible}
                                                            onCheckedChange={(v) => setExtras((e) => (e ? { ...e, backgroundVisible: v } : e))}
                                                        />
                                                    </div>
                                                </div>
                                                <textarea
                                                    value={extras.background}
                                                    onChange={(e) => setExtras((x) => (x ? { ...x, background: e.target.value } : x))}
                                                    rows={5}
                                                    placeholder="A short background / bio (at least 100 characters to show it)…"
                                                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/30"
                                                />
                                                <p className={`mt-1 text-xs ${extras.backgroundVisible && extras.background.trim().length < BACKGROUND_MIN ? "text-destructive" : "text-muted-foreground"}`}>
                                                    {extras.background.trim().length} characters · {BACKGROUND_MIN} minimum to show
                                                </p>
                                            </div>

                                            {/* Qualifications */}
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="text-sm font-semibold text-foreground">Qualifications</label>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground">Show publicly</span>
                                                        <Switch
                                                            checked={extras.qualificationsVisible}
                                                            onCheckedChange={(v) => setExtras((e) => (e ? { ...e, qualificationsVisible: v } : e))}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    {extras.qualifications.map((q, i) => (
                                                        <div key={i} className="flex items-center gap-2">
                                                            <input
                                                                value={q}
                                                                onChange={(e) => setExtras((x) => {
                                                                    if (!x) return x;
                                                                    const arr = [...x.qualifications];
                                                                    arr[i] = e.target.value;
                                                                    return { ...x, qualifications: arr };
                                                                })}
                                                                placeholder="e.g. Ph.D. in Computer Science, Stanford University (2010)"
                                                                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="shrink-0 text-muted-foreground hover:text-destructive"
                                                                onClick={() => setExtras((x) => (x ? { ...x, qualifications: x.qualifications.filter((_, j) => j !== i) } : x))}
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setExtras((x) => (x ? { ...x, qualifications: [...x.qualifications, ""] } : x))}
                                                    >
                                                        <Plus className="w-4 h-4 mr-1.5" />
                                                        Add qualification
                                                    </Button>
                                                </div>
                                                {extras.qualificationsVisible && extras.qualifications.filter((q) => q.trim()).length === 0 && (
                                                    <p className="mt-1 text-xs text-destructive">Add at least one qualification to show this section.</p>
                                                )}
                                            </div>

                                            {/* Awards & Honors */}
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="text-sm font-semibold text-foreground">Awards &amp; Honors</label>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground">Show publicly</span>
                                                        <Switch
                                                            checked={extras.awardsVisible}
                                                            onCheckedChange={(v) => setExtras((e) => (e ? { ...e, awardsVisible: v } : e))}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    {extras.awards.map((a, i) => (
                                                        <div key={i} className="flex items-center gap-2">
                                                            <input
                                                                value={a}
                                                                onChange={(e) => setExtras((x) => {
                                                                    if (!x) return x;
                                                                    const arr = [...x.awards];
                                                                    arr[i] = e.target.value;
                                                                    return { ...x, awards: arr };
                                                                })}
                                                                placeholder="e.g. Fellow, Indian National Academy of Engineering (2021)"
                                                                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="shrink-0 text-muted-foreground hover:text-destructive"
                                                                onClick={() => setExtras((x) => (x ? { ...x, awards: x.awards.filter((_, j) => j !== i) } : x))}
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setExtras((x) => (x ? { ...x, awards: [...x.awards, ""] } : x))}
                                                    >
                                                        <Plus className="w-4 h-4 mr-1.5" />
                                                        Add award
                                                    </Button>
                                                </div>
                                                {extras.awardsVisible && extras.awards.filter((a) => a.trim()).length === 0 && (
                                                    <p className="mt-1 text-xs text-destructive">Add at least one award to show this section.</p>
                                                )}
                                            </div>

                                            {/* Research areas — computed ones are read-only; faculty may add extras */}
                                            <div>
                                                <label className="text-sm font-semibold text-foreground">Research areas</label>
                                                <p className="text-xs text-muted-foreground mt-1 mb-2">
                                                    Your auto-generated areas can&apos;t be changed. Add your own below — these show as plain text (not clickable).
                                                </p>
                                                {faculty.dominant_domains && faculty.dominant_domains.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                                        {faculty.dominant_domains.map((area) => (
                                                            <span
                                                                key={area.slug}
                                                                className="text-[11px] px-2.5 py-1 rounded-lg bg-muted text-muted-foreground border border-border"
                                                                title="Auto-generated — can't be edited"
                                                            >
                                                                {area.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                <div className="space-y-2">
                                                    {extras.customResearchAreas.map((a, i) => (
                                                        <div key={i} className="flex items-center gap-2">
                                                            <input
                                                                value={a}
                                                                onChange={(e) => setExtras((x) => {
                                                                    if (!x) return x;
                                                                    const arr = [...x.customResearchAreas];
                                                                    arr[i] = e.target.value;
                                                                    return { ...x, customResearchAreas: arr };
                                                                })}
                                                                placeholder="e.g. Process Systems Engineering"
                                                                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="shrink-0 text-muted-foreground hover:text-destructive"
                                                                onClick={() => setExtras((x) => (x ? { ...x, customResearchAreas: x.customResearchAreas.filter((_, j) => j !== i) } : x))}
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setExtras((x) => (x ? { ...x, customResearchAreas: [...x.customResearchAreas, ""] } : x))}
                                                    >
                                                        <Plus className="w-4 h-4 mr-1.5" />
                                                        Add research area
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Emails — primary (kerberos) is read-only and can't be removed */}
                                            <div>
                                                <label className="text-sm font-semibold text-foreground">Emails</label>
                                                <p className="text-xs text-muted-foreground mt-1 mb-2">
                                                    Your primary email can&apos;t be removed. Add more contact emails if you like.
                                                </p>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <input
                                                        value={extras.primaryEmail}
                                                        disabled
                                                        className="flex-1 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
                                                    />
                                                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold shrink-0 w-16 text-center">Primary</span>
                                                </div>
                                                <div className="space-y-2">
                                                    {extras.additionalEmails.map((em, i) => (
                                                        <div key={i} className="flex items-center gap-2">
                                                            <input
                                                                type="email"
                                                                value={em}
                                                                onChange={(e) => setExtras((x) => {
                                                                    if (!x) return x;
                                                                    const arr = [...x.additionalEmails];
                                                                    arr[i] = e.target.value;
                                                                    return { ...x, additionalEmails: arr };
                                                                })}
                                                                placeholder="e.g. name@example.com"
                                                                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="shrink-0 text-muted-foreground hover:text-destructive"
                                                                onClick={() => setExtras((x) => (x ? { ...x, additionalEmails: x.additionalEmails.filter((_, j) => j !== i) } : x))}
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setExtras((x) => (x ? { ...x, additionalEmails: [...x.additionalEmails, ""] } : x))}
                                                    >
                                                        <Plus className="w-4 h-4 mr-1.5" />
                                                        Add email
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Contact number */}
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="text-sm font-semibold text-foreground">Contact number</label>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground">Show publicly</span>
                                                        <Switch
                                                            checked={extras.phoneVisible}
                                                            onCheckedChange={(v) => setExtras((e) => (e ? { ...e, phoneVisible: v } : e))}
                                                        />
                                                    </div>
                                                </div>
                                                <input
                                                    value={extras.phone}
                                                    onChange={(e) => setExtras((x) => (x ? { ...x, phone: e.target.value } : x))}
                                                    placeholder="e.g. +91 11 2659 1234"
                                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                                />
                                                {extras.phoneVisible && !extras.phone.trim() && (
                                                    <p className="mt-1 text-xs text-destructive">Add a contact number to show it.</p>
                                                )}
                                            </div>

                                            {/* Office address */}
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="text-sm font-semibold text-foreground">Office address</label>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground">Show publicly</span>
                                                        <Switch
                                                            checked={extras.officeAddressVisible}
                                                            onCheckedChange={(v) => setExtras((e) => (e ? { ...e, officeAddressVisible: v } : e))}
                                                        />
                                                    </div>
                                                </div>
                                                <textarea
                                                    value={extras.officeAddress}
                                                    onChange={(e) => setExtras((x) => (x ? { ...x, officeAddress: e.target.value } : x))}
                                                    rows={2}
                                                    placeholder="e.g. Block II, Room 123, Dept. of ..., IIT Delhi, Hauz Khas"
                                                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/30"
                                                />
                                                {extras.officeAddressVisible && !extras.officeAddress.trim() && (
                                                    <p className="mt-1 text-xs text-destructive">Add an office address to show it.</p>
                                                )}
                                            </div>

                                            {/* External links — faculty-labelled, with show/hide toggle */}
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="text-sm font-semibold text-foreground">External links</label>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground">Show publicly</span>
                                                        <Switch
                                                            checked={extras.externalLinksVisible}
                                                            onCheckedChange={(v) => setExtras((e) => (e ? { ...e, externalLinksVisible: v } : e))}
                                                        />
                                                    </div>
                                                </div>
                                                <p className="text-xs text-muted-foreground mb-2">
                                                    Add any links you like (personal site, lab, LinkedIn, ORCID…) and name each one. Shown alongside your Scopus / Google Scholar links.
                                                </p>
                                                <div className="space-y-2">
                                                    {extras.externalLinks.map((link, i) => (
                                                        <div key={i} className="flex items-center gap-2">
                                                            <input
                                                                value={link.label}
                                                                maxLength={60}
                                                                onChange={(e) => setExtras((x) => {
                                                                    if (!x) return x;
                                                                    const arr = [...x.externalLinks];
                                                                    arr[i] = { ...arr[i], label: e.target.value };
                                                                    return { ...x, externalLinks: arr };
                                                                })}
                                                                placeholder="Label (e.g. My Lab)"
                                                                className="w-2/5 min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                                            />
                                                            <input
                                                                value={link.url}
                                                                onChange={(e) => setExtras((x) => {
                                                                    if (!x) return x;
                                                                    const arr = [...x.externalLinks];
                                                                    arr[i] = { ...arr[i], url: e.target.value };
                                                                    return { ...x, externalLinks: arr };
                                                                })}
                                                                placeholder="https://…"
                                                                className="flex-1 min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="shrink-0 text-muted-foreground hover:text-destructive"
                                                                onClick={() => setExtras((x) => (x ? { ...x, externalLinks: x.externalLinks.filter((_, j) => j !== i) } : x))}
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setExtras((x) => (x ? { ...x, externalLinks: [...x.externalLinks, { label: "", url: "" }] } : x))}
                                                    >
                                                        <Plus className="w-4 h-4 mr-1.5" />
                                                        Add link
                                                    </Button>
                                                </div>
                                                {extras.externalLinksVisible && extras.externalLinks.filter((l) => l.url.trim()).length === 0 && (
                                                    <p className="mt-1 text-xs text-destructive">Add at least one link to show this section.</p>
                                                )}
                                            </div>

                                            {extrasError && <p className="text-sm text-destructive">{extrasError}</p>}
                                            <Button size="sm" onClick={handleSave} disabled={savingExtras}>
                                                {savingExtras && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                                                Save changes
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Background (public display) */}
                        {!editMode && faculty.backgroundVisible && faculty.background && (
                            <div className="mb-6">
                                <SectionCard icon={User} title="Background">
                                    <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">{faculty.background}</p>
                                </SectionCard>
                            </div>
                        )}

                        <div className={`grid grid-cols-1 gap-6 items-start ${showPatentsColumn ? "xl:grid-cols-2" : ""}`}>
                            <div className="space-y-6 min-w-0">
                                {isSummaryLoading ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                        <p className="text-sm text-muted-foreground">Loading research data…</p>
                                    </div>
                                ) : (
                                    summaryData?.timeline && summaryData.timeline.length > 0 && (
                                        <PublicationTimeline
                                            timeline={summaryData.timeline}
                                            kerberos={kerberos}
                                            totalYears={summaryData.stats.totalYears}
                                            yearLimit={summaryData.yearLimit}
                                            onNavigateAuthor={handleNavigateAuthor}
                                        />
                                    )
                                )}
                            </div>

                            {showPatentsColumn && (
                                <div className="space-y-6 min-w-0">
                                    {isPatentsLoading ? (
                                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                                            <Loader2 className="w-8 h-8 animate-spin text-accent" />
                                            <p className="text-sm text-muted-foreground">Loading patent record…</p>
                                        </div>
                                    ) : (
                                        <PatentTimeline
                                            documents={patents}
                                            kerberos={kerberos}
                                            facultyName={faculty.name}
                                            pagination={patentsData?.pagination ?? null}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
};

export default FacultyProfile;

const getInitials = (name: string) =>
    name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("") || "?";

const BigStatCard = ({
    icon: Icon,
    label,
    value,
    color,
}: {
    icon: ElementType;
    label: string;
    value: number | string;
    color: "primary" | "accent";
}) => (
    <div className={`rounded-2xl border bg-background/70 backdrop-blur shadow-sm px-4 py-3 flex items-center gap-3 ${color === "primary" ? "border-primary/15" : "border-accent/15"}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color === "primary" ? "bg-primary/10" : "bg-accent/10"}`}>
            <Icon className={`w-5 h-5 ${color === "primary" ? "text-primary" : "text-accent"}`} />
        </div>
        <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold leading-none mb-1">{label}</p>
            <p className={`text-xl font-bold leading-none ${color === "primary" ? "text-primary" : "text-accent"}`}>{value}</p>
        </div>
    </div>
);

const SectionCard = ({
    icon: Icon,
    title,
    children,
}: {
    icon: ElementType;
    title: string;
    children: React.ReactNode;
}) => (
    <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border/50 bg-muted/20">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="w-3.5 h-3.5 text-primary" />
            </div>
            <h2 className="text-sm font-semibold text-foreground tracking-wide">{title}</h2>
        </div>
        <div className="p-5">{children}</div>
    </div>
);
