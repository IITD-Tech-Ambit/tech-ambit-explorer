import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Calendar, Clock, User, Loader2, ThumbsUp, MessageCircle, Send, ChevronUp } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import magazineCover from "@/assets/magazine-cover-1.jpg";
import {
    useMagazine,
    useLikeMagazine,
    useDislikeMagazine,
    useAddComment,
    BASE_URL,
    type Comment,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// API base URL for images (use centralized config)
const API_BASE_URL = BASE_URL.replace('/api', ''); // Remove /api suffix for image URLs

const MagazineDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [commentText, setCommentText] = useState("");
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [comments, setComments] = useState<Comment[]>([]);
    const [showScrollTop, setShowScrollTop] = useState(false);

    // Fetch magazine using custom hook
    const { data: magazine, isLoading, error } = useMagazine(id!);

    // Track scroll position for scroll-to-top button
    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 400);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Scroll to top handler
    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Initialize likes and comments from fetched magazine data
    useEffect(() => {
        if (magazine) {
            setLikeCount(magazine.likesCount || 0);
            setComments(magazine.comments || []);
            // You can also check if user has liked (requires user tracking implementation)
            // For now, we'll keep isLiked as false initially
        }
    }, [magazine]);

    // Like mutation using custom hook
    const likeMutation = useLikeMagazine({
        onSuccess: (data) => {
            setIsLiked(true);
            setLikeCount(data.likes.length);
            setComments(data.comments);
            toast({
                title: "Liked!",
                description: "You liked this magazine.",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to like. You may have already liked this.",
                variant: "destructive",
            });
        },
    });

    // Dislike mutation using custom hook
    const dislikeMutation = useDislikeMagazine({
        onSuccess: (data) => {
            setIsLiked(false);
            setLikeCount(data.likes.length);
            setComments(data.comments);
            toast({
                title: "Removed",
                description: "You removed your like.",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to remove like.",
                variant: "destructive",
            });
        },
    });

    // Comment mutation using custom hook
    const commentMutation = useAddComment({
        onSuccess: (newComment) => {
            setComments((prev) => [...prev, newComment]);
            setCommentText("");
            toast({
                title: "Comment Added!",
                description: "Your comment has been posted.",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to add comment. You may have already commented.",
                variant: "destructive",
            });
        },
    });

    // Helper to get the full image URL
    const getImageUrl = (imageUrl: string) => {
        if (!imageUrl) return magazineCover;
        if (imageUrl.startsWith('http')) return imageUrl;
        return `${API_BASE_URL}${imageUrl}`;
    };

    // Format date from ISO string
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const handleLike = () => {
        if (isLiked) {
            dislikeMutation.mutate(id!);
        } else {
            likeMutation.mutate(id!);
        }
    };

    const handleSubmitComment = () => {
        if (commentText.trim()) {
            commentMutation.mutate({
                contentId: id!,
                body: commentText.trim(),
            });
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen">
                <Navigation />
                <div className="flex justify-center items-center py-40">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <span className="ml-4 text-xl">Loading magazine...</span>
                </div>
                <Footer />
            </div>
        );
    }

    if (error || !magazine) {
        return (
            <div className="min-h-screen">
                <Navigation />
                <div className="container mx-auto px-4 py-40 text-center">
                    <h1 className="text-3xl font-bold mb-4">Magazine Not Found</h1>
                    <p className="text-muted-foreground mb-8">
                        The magazine you're looking for doesn't exist or has been removed.
                    </p>
                    <Button onClick={() => navigate('/magazines')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Magazines
                    </Button>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <Navigation />

            {/* Hero Section with Magazine Cover - Responsive */}
            <section className="pt-24 sm:pt-28 pb-8 sm:pb-10">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Back Button */}
                    <Button
                        variant="ghost"
                        className="mb-4 sm:mb-6 text-sm sm:text-base"
                        onClick={() => navigate('/magazines')}
                    >
                        <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                        Back to Magazines
                    </Button>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
                        {/* Magazine Cover Image - Responsive sidebar */}
                        <div className="lg:col-span-1">
                            {/* On mobile: inline, on lg: sticky sidebar */}
                            <div className="lg:sticky lg:top-28">
                                <img
                                    src={getImageUrl(magazine.image_url)}
                                    alt={magazine.title}
                                    className="w-full max-w-xs sm:max-w-sm mx-auto lg:max-w-none rounded-lg sm:rounded-xl shadow-2xl"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = magazineCover;
                                    }}
                                />
                                <div className="mt-4 sm:mt-6 flex flex-wrap justify-center lg:justify-start gap-2 sm:gap-3">
                                    <Badge variant="secondary" className="text-xs sm:text-sm px-2.5 sm:px-4 py-1 sm:py-2">
                                        <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                                        {magazine.est_read_time} min read
                                    </Badge>
                                    <Badge
                                        className={`text-xs sm:text-sm px-2.5 sm:px-4 py-1 sm:py-2 ${magazine.status === 'online'
                                            ? 'bg-green-500 text-white'
                                            : 'bg-yellow-500 text-black'
                                            }`}
                                    >
                                        {magazine.status.charAt(0).toUpperCase() + magazine.status.slice(1)}
                                    </Badge>
                                </div>

                                {/* Like/Dislike Section */}
                                <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-muted rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs sm:text-sm font-medium">
                                            {likeCount} {likeCount === 1 ? 'like' : 'likes'}
                                        </span>
                                        <div className="flex gap-2">
                                            <Button
                                                variant={isLiked ? "default" : "outline"}
                                                size="sm"
                                                onClick={handleLike}
                                                disabled={likeMutation.isPending || dislikeMutation.isPending}
                                                className="text-xs sm:text-sm"
                                            >
                                                {likeMutation.isPending || dislikeMutation.isPending ? (
                                                    <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <ThumbsUp className={`h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 ${isLiked ? 'fill-current' : ''}`} />
                                                        {isLiked ? 'Liked' : 'Like'}
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Magazine Content - Responsive typography */}
                        <div className="lg:col-span-2">
                            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4">
                                {magazine.title}
                            </h1>

                            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-4 sm:mb-6">
                                {magazine.subtitle}
                            </p>

                            <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 sm:gap-6 mb-6 sm:mb-8 pb-6 sm:pb-8 border-b">
                                <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground text-sm sm:text-base">
                                    <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    <span>Published on {formatDate(magazine.createdAt)}</span>
                                </div>
                                <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground text-sm sm:text-base">
                                    <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    <span>{magazine.created_by?.name}</span>
                                </div>
                            </div>

                            {/* Magazine Body Content */}
                            <article className="prose prose-sm sm:prose-base md:prose-lg dark:prose-invert max-w-none">
                                <div className="magazine-content markdown-body">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        rehypePlugins={[rehypeRaw, rehypeSanitize]}
                                        components={{
                                            // Custom styling for images to make them responsive
                                            img: ({ node, ...props }) => (
                                                <img
                                                    {...props}
                                                    className="max-w-full h-auto rounded-lg my-4"
                                                    loading="lazy"
                                                />
                                            ),
                                            // Custom styling for tables to make them responsive
                                            table: ({ node, ...props }) => (
                                                <div className="overflow-x-auto my-6">
                                                    <table {...props} className="min-w-full divide-y divide-gray-300 dark:divide-gray-700" />
                                                </div>
                                            ),
                                            // Custom styling for code blocks
                                            code: ({ node, inline, className, children, ...props }: any) => (
                                                inline ? (
                                                    <code {...props} className="bg-muted px-1 sm:px-1.5 py-0.5 rounded text-xs sm:text-sm">
                                                        {children}
                                                    </code>
                                                ) : (
                                                    <code {...props} className="block bg-muted p-3 sm:p-4 rounded-lg overflow-x-auto text-xs sm:text-sm">
                                                        {children}
                                                    </code>
                                                )
                                            ),
                                            // Custom styling for blockquotes
                                            blockquote: ({ node, ...props }) => (
                                                <blockquote {...props} className="border-l-4 border-primary pl-3 sm:pl-4 italic my-4 text-sm sm:text-base" />
                                            ),
                                        }}
                                    >
                                        {magazine.body}
                                    </ReactMarkdown>
                                </div>
                            </article>

                            {/* Comments Section - Responsive */}
                            <Card className="mt-8 sm:mt-12">
                                <CardHeader className="p-4 sm:p-6">
                                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                                        <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                                        Comments ({comments.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                                    {/* Add Comment Form */}
                                    <div className="mb-4 sm:mb-6">
                                        <Textarea
                                            placeholder="Write your comment..."
                                            value={commentText}
                                            onChange={(e) => setCommentText(e.target.value)}
                                            className="mb-2 sm:mb-3 text-sm sm:text-base"
                                            rows={3}
                                        />
                                        <Button
                                            onClick={handleSubmitComment}
                                            disabled={!commentText.trim() || commentMutation.isPending}
                                            className="w-full sm:w-auto text-sm sm:text-base"
                                        >
                                            {commentMutation.isPending ? (
                                                <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin" />
                                            ) : (
                                                <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                                            )}
                                            Post Comment
                                        </Button>
                                    </div>

                                    {/* Comments List */}
                                    {comments.length === 0 ? (
                                        <p className="text-muted-foreground text-center py-6 sm:py-8 text-sm sm:text-base">
                                            No comments yet. Be the first to comment!
                                        </p>
                                    ) : (
                                        <div className="space-y-3 sm:space-y-4">
                                            {comments.map((comment) => (
                                                <div
                                                    key={comment._id}
                                                    className="p-3 sm:p-4 bg-muted rounded-lg"
                                                >
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                            <User className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <span className="font-medium text-xs sm:text-sm">
                                                                {comment.created_by ? 'User' : 'Anonymous'}
                                                            </span>
                                                            <span className="text-[10px] sm:text-xs text-muted-foreground ml-1.5 sm:ml-2">
                                                                {formatDate(comment.createdAt)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs sm:text-sm">{comment.body}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </section>

            {/* Scroll to Top Button */}
            {showScrollTop && (
                <button
                    onClick={scrollToTop}
                    className="fixed bottom-16 right-4 sm:bottom-12 sm:right-6 z-50 p-3 sm:p-4 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 animate-fade-in"
                    aria-label="Scroll to top"
                >
                    <ChevronUp className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
            )}

            <Footer />
        </div>
    );
};

export default MagazineDetail;

