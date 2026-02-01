import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import FacultyCard from "@/components/directory/FacultyCard";
import FacultyModal from "@/components/directory/FacultyModal";
import { useFaculties } from "@/lib/api/hooks/useDirectory";
import type { DirectoryFaculty } from "@/lib/api/types";

const Directory = () => {
    const [page, setPage] = useState(1);
    const [selectedFaculty, setSelectedFaculty] = useState<DirectoryFaculty | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    const { data, isLoading, isError } = useFaculties(page, 9);

    const handleCardClick = (faculty: DirectoryFaculty) => {
        setSelectedFaculty(faculty);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setSelectedFaculty(null);
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
                        <Input
                            type="text"
                            placeholder="Search by name, department, or research area..."
                            className="pl-4 h-12 text-base search-input"
                        />
                    </div>
                </div>
            </section>

            <section className="container mx-auto px-4 py-8">
                {data?.pagination && (
                    <div className="flex items-center justify-between mb-6">
                        <p className="text-sm text-muted-foreground">
                            Showing <strong>{data.data.length}</strong> of <strong>{data.pagination.total}</strong> faculty members
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={!data.pagination.hasPrev}
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                Previous
                            </Button>
                            <span className="text-sm px-3 py-1 bg-muted rounded">
                                Page {data.pagination.page} of {data.pagination.totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => p + 1)}
                                disabled={!data.pagination.hasNext}
                            >
                                Next
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
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
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {data?.data.map((faculty) => (
                            <FacultyCard
                                key={faculty._id}
                                faculty={faculty}
                                onClick={() => handleCardClick(faculty)}
                            />
                        ))}
                    </div>
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
