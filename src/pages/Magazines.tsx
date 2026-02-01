import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Calendar, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import magazineCover from "@/assets/magazine-cover-1.jpg";
import { useNavigate } from "react-router-dom";
import { usePaginatedMagazines, BASE_URL, type Magazine } from "@/lib/api";


// API base URL for images (use centralized config)
const API_BASE_URL = BASE_URL.replace('/api', ''); // Remove /api suffix for image URLs

// Pagination settings - 9 magazines per page
const MAGAZINES_PER_PAGE = 9;

const Magazines = () => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch paginated online magazines from server (only loads 9 at a time)
  const { data, isLoading, error } = usePaginatedMagazines(
    currentPage,
    MAGAZINES_PER_PAGE,
    'online'
  );

  // Extract data from server response
  const magazines = data?.magazines || [];
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages || 1;
  const totalCount = pagination?.totalCount || 0;

  // Helper to get the full image URL
  const getImageUrl = (imageUrl: string) => {
    if (!imageUrl) return magazineCover;
    if (imageUrl.startsWith('http')) return imageUrl;
    return imageUrl;
  };

  // Format date from ISO string
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Page navigation
  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen">
      <Navigation />

      {/* Header / Hero - Responsive layout */}
      <section className="pt-24 sm:pt-28 pb-8 sm:pb-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Custom responsive hero - stacks on mobile */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 md:gap-6 items-center sm:items-start p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/5 via-accent/5 to-transparent shadow-card border border-border">
            {/* Magazine Cover - smaller on mobile */}
            <div className="w-28 h-40 sm:w-36 sm:h-52 md:w-40 md:h-56 lg:w-44 lg:h-60 rounded-lg sm:rounded-xl overflow-hidden shadow-elegant flex-shrink-0 border border-border bg-background">
              <img src={magazineCover} alt="Tech Ambit" className="w-full h-full object-cover" />
            </div>
            {/* Content */}
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 sm:mb-3">Research Ambit Magazine</h1>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground mb-3 sm:mb-4 max-w-2xl">
                Our quarterly publication showcasing the latest research stories, breakthroughs, and innovations from across IIT Delhi's research ecosystem.
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3">
                <Badge variant="secondary" className="text-xs sm:text-sm md:text-base px-2.5 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2">Published Quarterly</Badge>
                <a href="https://cms-iitd.vercel.app/" target="_blank" rel="noopener noreferrer" className="mag-button-primary text-xs sm:text-sm">Contribute</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Magazines Grid - Responsive */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 md:py-12">
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col sm:flex-row justify-center items-center py-16 sm:py-20 gap-2 sm:gap-3">
            <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary" />
            <span className="text-base sm:text-lg">Loading magazines...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-16 sm:py-20 px-4">
            <p className="text-destructive text-base sm:text-lg mb-3 sm:mb-4">Failed to load magazines</p>
            <p className="text-muted-foreground text-sm sm:text-base">Please check your connection and try again.</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && magazines.length === 0 && (
          <div className="text-center py-16 sm:py-20 px-4">
            <p className="text-base sm:text-lg text-muted-foreground">No magazines available at the moment.</p>
            <p className="text-muted-foreground text-sm sm:text-base mt-2">Check back soon for new publications!</p>
          </div>
        )}

        {/* Magazines Grid */}
        {!isLoading && !error && magazines.length > 0 && (
          <>
            {/* Results info */}
            <div className="mb-4 sm:mb-6 text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
              Showing {(currentPage - 1) * MAGAZINES_PER_PAGE + 1}-{Math.min(currentPage * MAGAZINES_PER_PAGE, totalCount)} of {totalCount} magazines
            </div>

            {/* Responsive grid: 1 col mobile, 2 cols tablet, 3 cols desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
              {magazines.map((magazine: Magazine) => (
                <Card key={magazine._id} className="magazine-card group flex flex-col h-full">
                  <div className="relative overflow-hidden">
                    <img
                      src={magazine.image_url }
                      alt={magazine.title}
                      className="w-full h-48 sm:h-56 md:h-64 lg:h-72 object-cover group-hover:scale-105 transition-smooth"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = magazineCover;
                      }}
                    />
                    <div className="absolute top-2 right-2 sm:top-4 sm:right-4">
                      <Badge className="bg-primary text-primary-foreground text-xs sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1">
                        {magazine.est_read_time} min read
                      </Badge>
                    </div>
                    <div className="absolute left-2 bottom-2 sm:left-4 sm:bottom-4 bg-background/80 backdrop-blur-sm px-2 sm:px-3 py-1.5 sm:py-2 rounded-md max-w-[calc(100%-1rem)] sm:max-w-[calc(100%-2rem)]">
                      <div className="text-[10px] sm:text-xs text-muted-foreground">Latest Issue</div>
                      <div className="text-xs sm:text-sm font-semibold text-primary truncate">{magazine.title}</div>
                    </div>
                  </div>

                  <CardContent className="p-4 sm:p-5 md:p-6 flex-1 flex flex-col justify-between">
                    <div className="magazine-meta mb-2 sm:mb-3 text-xs sm:text-sm">
                      <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span>{formatDate(magazine.createdAt)}</span>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 line-clamp-2">{magazine.subtitle}</p>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 mt-auto">
                      <Button
                        className="mag-button-primary flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm w-full sm:w-auto justify-center"
                        onClick={() => navigate(`/magazines/${magazine._id}`)}
                      >
                        <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        View Online
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination Controls - Mobile optimized */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-2 mt-8 sm:mt-12">
                {/* Previous/Next for mobile, full pagination for larger screens */}
                <div className="flex items-center gap-2 sm:gap-1 w-full sm:w-auto justify-between sm:justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="hidden xs:inline sm:inline">Previous</span>
                    <span className="xs:hidden sm:hidden">Prev</span>
                  </Button>

                  {/* Page numbers - hidden on very small screens, show current/total instead */}
                  <div className="flex items-center gap-1">
                    {/* Mobile: show current page / total */}
                    <span className="sm:hidden text-sm text-muted-foreground px-3">
                      {currentPage} / {totalPages}
                    </span>

                    {/* Desktop: show all page numbers */}
                    <div className="hidden sm:flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => goToPage(page)}
                          className="min-w-[32px] sm:min-w-[40px] text-xs sm:text-sm"
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3"
                  >
                    <span className="hidden xs:inline sm:inline">Next</span>
                    <span className="xs:hidden sm:hidden">Next</span>
                    <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* About Magazine Section - Responsive */}
      <section className="gradient-subtle py-10 sm:py-12 md:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">About Research Ambit Magazine</h2>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground mb-4 sm:mb-6">
              Research Ambit Magazine is the official research publication of IIT Delhi,
              featuring in-depth articles, interviews with leading researchers, and
              comprehensive coverage of breakthrough discoveries across all disciplines.
            </p>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
              Each issue is carefully curated to bring you the most impactful research
              stories, making complex scientific concepts accessible to a broader audience.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Magazines;
