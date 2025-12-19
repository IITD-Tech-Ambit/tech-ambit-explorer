import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Calendar, Clock, User, Loader2, ThumbsUp, MessageCircle, Send } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import magazineCover from "@/assets/magazine-cover-1.jpg";
import { fetchMagazineById, likeMagazine, dislikeMagazine, addComment, type Comment } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// API base URL for images
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://iitd-dev.vercel.app';

const MagazineDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const [commentText, setCommentText] = useState("");
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [comments, setComments] = useState<Comment[]>([]);

    const { data: magazine, isLoading, error } = useQuery({
        queryKey: ['magazine', id],
        queryFn: () => fetchMagazineById(id!),
        enabled: !!id,
    });

    // Like mutation
    const likeMutation = useMutation({
        mutationFn: () => likeMagazine(id!),
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

    // Dislike (remove like) mutation
    const dislikeMutation = useMutation({
        mutationFn: () => dislikeMagazine(id!),
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

    // Comment mutation
    const commentMutation = useMutation({
        mutationFn: (body: string) => addComment(id!, body),
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
            dislikeMutation.mutate();
        } else {
            likeMutation.mutate();
        }
    };

    const handleSubmitComment = () => {
        if (commentText.trim()) {
            commentMutation.mutate(commentText.trim());
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

            {/* Hero Section with Magazine Cover */}
            <section className="pt-28 pb-10">
                <div className="container mx-auto px-4">
                    {/* Back Button */}
                    <Button
                        variant="ghost"
                        className="mb-6"
                        onClick={() => navigate('/magazines')}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Magazines
                    </Button>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        {/* Magazine Cover Image */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-28">
                                <img
                                    src={getImageUrl(magazine.image_url)}
                                    alt={magazine.title}
                                    className="w-full rounded-lg shadow-2xl"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = magazineCover;
                                    }}
                                />
                                <div className="mt-6 flex flex-wrap gap-3">
                                    <Badge variant="secondary" className="text-sm px-4 py-2">
                                        <Clock className="h-3 w-3 mr-1" />
                                        {magazine.est_read_time} min read
                                    </Badge>
                                    <Badge
                                        className={`text-sm px-4 py-2 ${magazine.status === 'online'
                                            ? 'bg-green-500 text-white'
                                            : 'bg-yellow-500 text-black'
                                            }`}
                                    >
                                        {magazine.status.charAt(0).toUpperCase() + magazine.status.slice(1)}
                                    </Badge>
                                </div>

                                {/* Like/Dislike Section */}
                                <div className="mt-6 p-4 bg-muted rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">
                                            {likeCount} {likeCount === 1 ? 'like' : 'likes'}
                                        </span>
                                        <div className="flex gap-2">
                                            <Button
                                                variant={isLiked ? "default" : "outline"}
                                                size="sm"
                                                onClick={handleLike}
                                                disabled={likeMutation.isPending || dislikeMutation.isPending}
                                            >
                                                {likeMutation.isPending || dislikeMutation.isPending ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <ThumbsUp className={`h-4 w-4 mr-1 ${isLiked ? 'fill-current' : ''}`} />
                                                        {isLiked ? 'Liked' : 'Like'}
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Magazine Content */}
                        <div className="lg:col-span-2">
                            <h1 className="text-4xl md:text-5xl font-bold mb-4">
                                {magazine.title}
                            </h1>

                            <p className="text-xl text-muted-foreground mb-6">
                                {magazine.subtitle}
                            </p>

                            <div className="flex flex-wrap items-center gap-6 mb-8 pb-8 border-b">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Calendar className="h-4 w-4" />
                                    <span>Published on {formatDate(magazine.createdAt)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <User className="h-4 w-4" />
                                    <span>Tech Ambit Editorial Team</span>
                                </div>
                            </div>

                            {/* Magazine Body Content */}
                            <article className="prose prose-lg dark:prose-invert max-w-none">
                                <div
                                    dangerouslySetInnerHTML={{ __html: magazine.body }}
                                    className="magazine-content"
                                />
                            </article>

                            {/* Comments Section */}
                            <Card className="mt-12">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <MessageCircle className="h-5 w-5" />
                                        Comments ({comments.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {/* Add Comment Form */}
                                    <div className="mb-6">
                                        <Textarea
                                            placeholder="Write your comment..."
                                            value={commentText}
                                            onChange={(e) => setCommentText(e.target.value)}
                                            className="mb-3"
                                            rows={3}
                                        />
                                        <Button
                                            onClick={handleSubmitComment}
                                            disabled={!commentText.trim() || commentMutation.isPending}
                                        >
                                            {commentMutation.isPending ? (
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            ) : (
                                                <Send className="h-4 w-4 mr-2" />
                                            )}
                                            Post Comment
                                        </Button>
                                    </div>

                                    {/* Comments List */}
                                    {comments.length === 0 ? (
                                        <p className="text-muted-foreground text-center py-8">
                                            No comments yet. Be the first to comment!
                                        </p>
                                    ) : (
                                        <div className="space-y-4">
                                            {comments.map((comment) => (
                                                <div
                                                    key={comment._id}
                                                    className="p-4 bg-muted rounded-lg"
                                                >
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                            <User className="h-4 w-4 text-primary" />
                                                        </div>
                                                        <div>
                                                            <span className="font-medium text-sm">
                                                                {comment.created_by ? 'User' : 'Anonymous'}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground ml-2">
                                                                {formatDate(comment.createdAt)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm">{comment.body}</p>
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

            <Footer />
        </div>
    );
};

export default MagazineDetail;

