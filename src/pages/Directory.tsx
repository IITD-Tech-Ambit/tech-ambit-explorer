import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Loader2, Building2, School, FlaskConical, Microscope, GraduationCap, Search, X } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import FacultyCard from "@/components/directory/FacultyCard";
import FacultyModal from "@/components/directory/FacultyModal";
import { useFaculties, useGroupedFaculties, useDirectorySearch } from "@/lib/api/hooks/useDirectory";
import type { DirectoryFaculty, GroupedDepartmentFaculty } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

type CategoryFilter = 'all' | 'departments' | 'schools' | 'centres' | 'researchlabs';

const categoryConfig: { key: CategoryFilter; label: string; icon: React.ElementType; description: string }[] = [
    { key: 'all', label: 'All', icon: Building2, description: 'All faculty members' },
    { key: 'departments', label: 'Departments', icon: GraduationCap, description: 'Department faculties' },
    { key: 'schools', label: 'Schools', icon: School, description: 'School faculties' },
    { key: 'centres', label: 'Centres', icon: FlaskConical, description: 'Centre faculties' },
    { key: 'researchlabs', label: 'Research Labs', icon: Microscope, description: 'Research lab faculties' },
];

const Directory = () => {
    const [page, setPage] = useState(1);
    const [selectedFaculty, setSelectedFaculty] = useState<DirectoryFaculty | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
    const [openAccordions, setOpenAccordions] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 300);
    const isSearching = debouncedSearch.length >= 2;

    // Search query
    const { data: searchData, isLoading: isSearchLoading } = useDirectorySearch(
        debouncedSearch,
        15,
        { enabled: isSearching }
    );

    // Use paginated query for "all", grouped query for specific categories
    const { data: paginatedData, isLoading: isPaginatedLoading, isError: isPaginatedError } = useFaculties(
        page, 9, 'hIndex', 'desc',
        { enabled: activeCategory === 'all' && !isSearching }
    );

    const { data: groupedData, isLoading: isGroupedLoading, isError: isGroupedError } = useGroupedFaculties(
        activeCategory,
        { enabled: activeCategory !== 'all' && !isSearching }
    );

    const isLoading = isSearching ? isSearchLoading : (activeCategory === 'all' ? isPaginatedLoading : isGroupedLoading);
    const isError = !isSearching && (activeCategory === 'all' ? isPaginatedError : isGroupedError);

    // Open all department accordions by default when grouped data changes
    useEffect(() => {
        if (groupedData?.departments && groupedData.departments.length > 0) {
            setOpenAccordions(groupedData.departments.map(d => d.department.name));
        }
    }, [groupedData]);

    const handleCardClick = (faculty: DirectoryFaculty | GroupedDepartmentFaculty, dept?: { _id: string; name: string; code: string }) => {
        // Convert GroupedDepartmentFaculty to DirectoryFaculty format for modal
        const fullFaculty: DirectoryFaculty = {
            ...faculty,
            department: dept || { _id: '', name: '', code: '' }
        } as DirectoryFaculty;
        setSelectedFaculty(fullFaculty);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setSelectedFaculty(null);
    };

    const handleCategoryChange = (category: CategoryFilter) => {
        setActiveCategory(category);
        setPage(1);
        setSearchQuery(''); // Clear search when changing category
    };

    const clearSearch = () => {
        setSearchQuery('');
    };

    return (
        <div className="min-h-screen page-bg">
            <Navigation />

            <section className="gradient-subtle pt-32 pb-16 section-bg">
                <div className="container mx-auto px-4">
                    <h1 className="text-5xl font-bold mb-4 animate-fade-in">
                        Who We Are
                    </h1>
                    <p className="text-xl text-muted-foreground mb-8 max-w-3xl animate-slide-up">
                        Connect with our distinguished faculty driving cutting-edge 
                        discoveries at IIT Delhi.
                    </p>

                    <div className="relative max-w-2xl animate-slide-up">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                            <Search className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <Input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by faculty name or department..."
                            className="pl-12 pr-12 h-14 text-base rounded-xl border-2 focus:border-primary bg-background/80 backdrop-blur-sm"
                        />
                        {isSearchLoading && debouncedSearch.length >= 2 && (
                            <div className="absolute right-14 top-1/2 -translate-y-1/2">
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            </div>
                        )}
                        {searchQuery && (
                            <button
                                onClick={clearSearch}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-muted transition-colors"
                            >
                                <X className="w-4 h-4 text-muted-foreground" />
                            </button>
                        )}
                    </div>

                    {/* Category Filter Tabs */}
                    <div className="mt-10 animate-slide-up">
                        <div className="flex flex-wrap items-center gap-3">
                            {categoryConfig.map(({ key, label, icon: Icon, description }) => (
                                <button
                                    key={key}
                                    onClick={() => handleCategoryChange(key)}
                                    className={cn(
                                        "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-200",
                                        "border-2",
                                        activeCategory === key
                                            ? "bg-primary text-primary-foreground border-primary shadow-md"
                                            : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                                    )}
                                    title={description}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span>{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="container mx-auto px-4 py-8">
                {isSearching && searchData && (
                    <div className="flex items-center justify-between mb-6">
                        <p className="text-sm text-muted-foreground">
                            Found <strong>{searchData.faculties.length}</strong> faculty members
                            {searchData.departments.length > 0 && (
                                <span> and <strong>{searchData.departments.length}</strong> departments</span>
                            )}
                            {' '}matching "<strong>{debouncedSearch}</strong>"
                        </p>
                        <Button variant="ghost" size="sm" onClick={clearSearch}>
                            Clear search
                        </Button>
                    </div>
                )}
                {!isSearching && activeCategory === 'all' && paginatedData?.pagination && (
                    <div className="flex items-center justify-between mb-6">
                        <p className="text-sm text-muted-foreground">
                            Showing <strong>{paginatedData.data.length}</strong> of <strong>{paginatedData.pagination.total}</strong> faculty members
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={!paginatedData.pagination.hasPrev}
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                Previous
                            </Button>
                            <span className="text-sm px-3 py-1 bg-muted rounded">
                                Page {paginatedData.pagination.page} of {paginatedData.pagination.totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => p + 1)}
                                disabled={!paginatedData.pagination.hasNext}
                            >
                                Next
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                )}
                {!isSearching && activeCategory !== 'all' && groupedData && (
                    <div className="flex items-center justify-between mb-6">
                        <p className="text-sm text-muted-foreground">
                            <strong>{groupedData.totalDepartments}</strong> {categoryConfig.find(c => c.key === activeCategory)?.label.toLowerCase()} with <strong>{groupedData.totalFaculty}</strong> faculty members
                        </p>
                    </div>
                )}
            </section>

            <section className="container mx-auto px-4 pb-20">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : isError ? (
                    <div className="text-center py-20">
                        <p className="text-muted-foreground">Failed to load faculty data. Please try again.</p>
                        <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => window.location.reload()}
                        >
                            Retry
                        </Button>
                    </div>
                ) : isSearching ? (
                    // Search results view
                    searchData && searchData.faculties.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {searchData.faculties.map((faculty) => (
                                <FacultyCard
                                    key={faculty._id}
                                    faculty={faculty}
                                    onClick={() => handleCardClick(faculty)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                                <Search className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-medium mb-2">No results found</h3>
                            <p className="text-muted-foreground mb-4">
                                No faculty or departments match "{debouncedSearch}"
                            </p>
                            <Button variant="outline" onClick={clearSearch}>
                                Clear search
                            </Button>
                        </div>
                    )
                ) : activeCategory === 'all' ? (
                    // Simple grid view for "All" category
                    paginatedData?.data && paginatedData.data.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {paginatedData.data.map((faculty) => (
                                <FacultyCard
                                    key={faculty._id}
                                    faculty={faculty}
                                    onClick={() => handleCardClick(faculty)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                                <Building2 className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-medium mb-2">No faculty found</h3>
                            <p className="text-muted-foreground mb-4">
                                No faculty members available.
                            </p>
                        </div>
                    )
                ) : (
                    // Accordion view for specific categories
                    groupedData?.departments && groupedData.departments.length > 0 ? (
                        <Accordion
                            type="multiple"
                            value={openAccordions}
                            onValueChange={setOpenAccordions}
                            className="space-y-4"
                        >
                            {groupedData.departments.map((deptGroup) => (
                                <AccordionItem
                                    key={deptGroup._id}
                                    value={deptGroup.department.name}
                                    className="border border-border rounded-xl overflow-hidden bg-card/50 backdrop-blur-sm"
                                >
                                    <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <GraduationCap className="w-5 h-5 text-primary" />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="font-semibold text-base">{deptGroup.department.name}</h3>
                                                <p className="text-xs text-muted-foreground">
                                                    {deptGroup.stats.totalFaculty} faculty member{deptGroup.stats.totalFaculty !== 1 ? 's' : ''}
                                                </p>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-6 pb-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                                            {deptGroup.faculties.map((faculty) => (
                                                <FacultyCard
                                                    key={faculty._id}
                                                    faculty={{
                                                        ...faculty,
                                                        department: deptGroup.department
                                                    } as DirectoryFaculty}
                                                    onClick={() => handleCardClick(faculty, deptGroup.department)}
                                                />
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    ) : (
                        <div className="text-center py-16">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                                <Building2 className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-medium mb-2">No {categoryConfig.find(c => c.key === activeCategory)?.label.toLowerCase()} found</h3>
                            <p className="text-muted-foreground mb-4">
                                No faculty members in this category.
                            </p>
                            <Button variant="outline" onClick={() => setActiveCategory('all')}>
                                View All Faculty
                            </Button>
                        </div>
                    )
                )}
            </section>

            <FacultyModal
                faculty={selectedFaculty}
                open={modalOpen}
                onClose={handleCloseModal}
            />

            <Footer />
        </div>
    );
};

export default Directory;
