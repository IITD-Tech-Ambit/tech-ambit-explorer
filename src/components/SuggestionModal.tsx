import { useState, useRef, useCallback } from "react";
import { X, Lightbulb, Loader2, CheckCircle2, ChevronDown, AlertCircle, ImagePlus, Trash2 } from "lucide-react";
import { submitSuggestion, SUGGESTION_CATEGORIES, type SuggestionCategory } from "@/lib/api/services/suggestionService";
import { useToast } from "@/hooks/use-toast";

interface SuggestionModalProps {
    open: boolean;
    onClose: () => void;
}

const EMPTY_FORM = {
    name: "",
    email: "",
    category: "" as SuggestionCategory | "",
    message: "",
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

const SuggestionModal = ({ open, onClose }: SuggestionModalProps) => {
    const { toast } = useToast();
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [errors, setErrors] = useState<{ category?: string; message?: string; email?: string; screenshot?: string }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [screenshot, setScreenshot] = useState<File | null>(null);
    const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const validate = () => {
        const e: typeof errors = {};
        if (!form.category) e.category = "Please select a category.";
        if (!form.message.trim()) {
            e.message = "Message is required.";
        } else if (form.message.trim().length < 10) {
            e.message = "Message must be at least 10 characters.";
        } else if (form.message.trim().length > 2000) {
            e.message = "Message must not exceed 2000 characters.";
        }
        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
            e.email = "Please enter a valid email address.";
        }
        return e;
    };

    const applyFile = (file: File) => {
        if (!ALLOWED_TYPES.includes(file.type)) {
            setErrors((p) => ({ ...p, screenshot: "Only JPG, PNG, GIF or WebP images are allowed." }));
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            setErrors((p) => ({ ...p, screenshot: "Image must be under 5 MB." }));
            return;
        }
        setErrors((p) => ({ ...p, screenshot: undefined }));
        setScreenshot(file);
        setScreenshotPreview(URL.createObjectURL(file));
    };

    const removeScreenshot = () => {
        if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
        setScreenshot(null);
        setScreenshotPreview(null);
        setErrors((p) => ({ ...p, screenshot: undefined }));
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // Clipboard paste (Ctrl+V anywhere in the modal)
    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith("image/"));
        if (!item) return;
        const file = item.getAsFile();
        if (file) applyFile(file);
    }, []);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) applyFile(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            toast({
                title: "Please fix the errors",
                description: Object.values(validationErrors)[0] as string,
                variant: "destructive",
            });
            return;
        }
        setErrors({});
        setIsSubmitting(true);
        try {
            await submitSuggestion(
                {
                    name: form.name.trim() || undefined,
                    email: form.email.trim() || undefined,
                    category: form.category as SuggestionCategory,
                    message: form.message.trim(),
                },
                screenshot
            );
            setSubmitted(true);
            toast({
                title: "Suggestion sent!",
                description: "Thank you for helping improve Research Ambit. Your suggestion has been sent to the team.",
            });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
            toast({ title: "Submission failed", description: msg, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (isSubmitting) return;
        setForm({ ...EMPTY_FORM });
        setErrors({});
        setSubmitted(false);
        removeScreenshot();
        onClose();
    };

    if (!open) return null;

    const charCount = form.message.length;

    return (
        <>
            <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm" onClick={handleClose} />

            <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
                <div
                    className="relative w-full max-w-lg bg-background rounded-2xl shadow-2xl border border-border/60 overflow-hidden pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                    onPaste={handlePaste}
                >
                    <div className="flex items-center gap-3 px-6 py-5 bg-gradient-to-r from-primary/10 to-accent/5 border-b border-border/50">
                        <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                            <Lightbulb className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-base font-bold text-foreground leading-tight">
                                Suggestions & Feedback
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Help us improve Research Ambit · IIT Delhi
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleClose}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors flex-shrink-0"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {submitted ? (
                        <div className="flex flex-col items-center justify-center px-6 py-14 gap-4 text-center">
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                                <CheckCircle2 className="w-8 h-8 text-primary" />
                            </div>
                            <div>
                                <p className="text-lg font-bold text-foreground mb-1">Thank you!</p>
                                <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                                    Your suggestion has been sent to the Research Ambit team. We appreciate your help.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleClose}
                                className="mt-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} noValidate>
                            <div className="px-6 py-5 space-y-4 max-h-[68vh] overflow-y-auto">

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <Field label="Name" optional>
                                        <input
                                            type="text"
                                            value={form.name}
                                            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                                            placeholder="Your name"
                                            maxLength={100}
                                            className={inputCls(false)}
                                        />
                                    </Field>
                                    <Field label="Email" optional error={errors.email}>
                                        <input
                                            type="email"
                                            value={form.email}
                                            onChange={(e) => {
                                                setForm((p) => ({ ...p, email: e.target.value }));
                                                setErrors((p) => ({ ...p, email: undefined }));
                                            }}
                                            placeholder="your@email.com"
                                            maxLength={200}
                                            className={inputCls(!!errors.email)}
                                        />
                                    </Field>
                                </div>

                                <Field label="Category" error={errors.category}>
                                    <div className="relative">
                                        <select
                                            value={form.category}
                                            onChange={(e) => {
                                                setForm((p) => ({ ...p, category: e.target.value as SuggestionCategory }));
                                                setErrors((p) => ({ ...p, category: undefined }));
                                            }}
                                            className={`${inputCls(!!errors.category)} appearance-none pr-9`}
                                        >
                                            <option value="">Select a category…</option>
                                            {SUGGESTION_CATEGORIES.map((c) => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                    </div>
                                </Field>

                                <Field label="Your Suggestion / Feedback" error={errors.message}>
                                    <textarea
                                        value={form.message}
                                        onChange={(e) => {
                                            setForm((p) => ({ ...p, message: e.target.value }));
                                            if (errors.message) setErrors((p) => ({ ...p, message: undefined }));
                                        }}
                                        placeholder="Describe your suggestion, feedback, or report in detail…"
                                        maxLength={2000}
                                        rows={4}
                                        className={`${inputCls(!!errors.message)} resize-none`}
                                    />
                                    <div className="flex justify-end mt-1">
                                        <span className={`text-[11px] ${charCount > 1800 ? "text-destructive" : "text-muted-foreground"}`}>
                                            {charCount} / 2000
                                        </span>
                                    </div>
                                </Field>

                                <Field label="Screenshot" optional error={errors.screenshot}>
                                    {screenshotPreview ? (
                                        <div className="relative rounded-xl overflow-hidden border border-border/60 bg-muted/20">
                                            <img
                                                src={screenshotPreview}
                                                alt="Preview"
                                                className="w-full max-h-48 object-contain"
                                            />
                                            <button
                                                type="button"
                                                onClick={removeScreenshot}
                                                className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/80 transition-colors shadow-md"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                            <div className="px-3 py-2 border-t border-border/40 bg-background/80">
                                                <p className="text-[11px] text-muted-foreground truncate">
                                                    {screenshot?.name} · {((screenshot?.size ?? 0) / 1024).toFixed(0)} KB
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                            onDragLeave={() => setIsDragging(false)}
                                            onDrop={handleDrop}
                                            className={`cursor-pointer rounded-xl border-2 border-dashed p-5 flex flex-col items-center gap-2 transition-colors ${
                                                isDragging
                                                    ? "border-primary/60 bg-primary/5"
                                                    : "border-border/60 bg-muted/20 hover:border-primary/40 hover:bg-primary/[0.03]"
                                            }`}
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                                <ImagePlus className="w-5 h-5 text-primary/70" />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-medium text-foreground/80">
                                                    Click to upload or drag & drop
                                                </p>
                                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                                    Or paste a screenshot with <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/60 font-mono text-[10px]">Ctrl+V</kbd>
                                                </p>
                                                <p className="text-[10px] text-muted-foreground mt-1">
                                                    PNG, JPG, GIF, WebP · max 5 MB
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/gif,image/webp"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) applyFile(file);
                                        }}
                                    />
                                </Field>
                            </div>

                            <div className="px-6 py-4 border-t border-border/50 bg-muted/20 flex items-center justify-between gap-3">
                                <p className="text-[11px] text-muted-foreground">
                                    * Category and message are required.
                                </p>
                                <div className="flex gap-2 flex-shrink-0">
                                    <button
                                        type="button"
                                        onClick={handleClose}
                                        className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Sending…
                                            </>
                                        ) : (
                                            <>
                                                <Lightbulb className="w-4 h-4" />
                                                Submit
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </>
    );
};

export default SuggestionModal;

/* ── Helpers ── */

const inputCls = (hasError: boolean) =>
    `w-full px-3 py-2.5 rounded-xl border text-sm bg-background text-foreground placeholder:text-muted-foreground/60 transition-colors outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 ${
        hasError ? "border-destructive/60 focus:ring-destructive/20" : "border-border/70 hover:border-border"
    }`;

const Field = ({
    label,
    optional,
    error,
    children,
}: {
    label: string;
    optional?: boolean;
    error?: string;
    children: React.ReactNode;
}) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
            {label}
            {optional && (
                <span className="text-[10px] font-normal text-muted-foreground bg-muted/60 rounded px-1.5 py-0.5">
                    Optional
                </span>
            )}
        </label>
        {children}
        {error && (
            <p className="text-[11px] text-destructive flex items-center gap-1 font-medium">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                {error}
            </p>
        )}
    </div>
);
