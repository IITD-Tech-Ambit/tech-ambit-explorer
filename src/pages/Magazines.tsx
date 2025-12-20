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
    return `${API_BASE_URL}${imageUrl}`;
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

      {/* Header / Hero */}
      <section className="pt-28 pb-10">
        <div className="container mx-auto px-4">
          <div className="magazine-hero">
            <div className="magazine-cover">
              <img src={magazineCover} alt="Tech Ambit" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-3">Tech Ambit Magazine</h1>
              <p className="text-lg text-muted-foreground mb-4 max-w-2xl">
                Our quarterly publication showcasing the latest research stories, breakthroughs, and innovations from across IIT Delhi's research ecosystem.
              </p>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-base px-4 py-2">Published Quarterly</Badge>
                <Button className="mag-button-primary">Subscribe</Button>
                <Button variant="ghost" className="mag-button-ghost">Contribute</Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Magazines Grid */}
      <section className="container mx-auto px-4 py-12">
        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-lg">Loading magazines...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-20">
            <p className="text-destructive text-lg mb-4">Failed to load magazines</p>
            <p className="text-muted-foreground">Please check your connection and try again.</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && magazines.length === 0 && (
          <div className="text-center py-20">
            <p className="text-lg text-muted-foreground">No magazines available at the moment.</p>
            <p className="text-muted-foreground">Check back soon for new publications!</p>
          </div>
        )}

        {/* Magazines Grid */}
        {!isLoading && !error && magazines.length > 0 && (
          <>
            {/* Results info */}
            <div className="mb-6 text-sm text-muted-foreground">
              Showing {(currentPage - 1) * MAGAZINES_PER_PAGE + 1}-{Math.min(currentPage * MAGAZINES_PER_PAGE, totalCount)} of {totalCount} magazines
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {magazines.map((magazine: Magazine) => (
                <Card key={magazine._id} className="magazine-card group flex flex-col h-full">
                  <div className="relative overflow-hidden">
                    <img
                      src={getImageUrl(magazine.image_url)}
                      alt={magazine.title}
                      className="w-full h-72 object-cover group-hover:scale-105 transition-smooth"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = magazineCover;
                      }}
                    />
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-primary text-primary-foreground">
                        {magazine.est_read_time} min read
                      </Badge>
                    </div>
                    <div className="absolute left-4 bottom-4 bg-background/80 backdrop-blur-sm px-3 py-2 rounded-md">
                      <div className="text-xs text-muted-foreground">Latest Issue</div>
                      <div className="text-sm font-semibold text-primary">{magazine.title}</div>
                    </div>
                  </div>

                  <CardContent className="p-6 flex-1 flex flex-col justify-between">
                    <div className="magazine-meta mb-3">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(magazine.createdAt)}</span>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-4">{magazine.subtitle}</p>
                    </div>

                    <div className="flex items-center gap-3 mt-auto">
                      <Button
                        className="mag-button-primary flex items-center gap-2"
                        onClick={() => navigate(`/magazines/${magazine._id}`)}
                      >
                        <Eye className="h-4 w-4" />
                        View Online
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-12">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(page)}
                      className="min-w-[40px]"
                    >
                      {page}
                    </Button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      {/* About Magazine Section */}
      <section className="gradient-subtle py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">About Tech Ambit Magazine</h2>
            <p className="text-lg text-muted-foreground mb-6">
              Tech Ambit Magazine is the official research publication of IIT Delhi,
              featuring in-depth articles, interviews with leading researchers, and
              comprehensive coverage of breakthrough discoveries across all disciplines.
            </p>
            <p className="text-lg text-muted-foreground">
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
