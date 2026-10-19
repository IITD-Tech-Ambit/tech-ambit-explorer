import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import Cropper, { type Area } from "react-easy-crop";
import {
    AlertCircle, AlertTriangle, ArrowLeft, Check, FileImage, HardDrive, ImageUp, Loader2,
    Maximize2, RotateCcw, RotateCw, UserSquare2, ZoomIn, ZoomOut,
} from "lucide-react";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { cropToSquareJpeg, loadImage } from "@/lib/cropImage";
import { uploadFacultyImage } from "@/lib/api/services/directoryService";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 8 * 1024 * 1024;
const MIN_DIMENSION = 200;
const RECOMMENDED_DIMENSION = 400;
const OUTPUT_SIZE = 800;
const MAX_ZOOM = 3;

type Step = "choose" | "crop" | "review";

const STEPS: { id: Step; label: string }[] = [
    { id: "choose", label: "Choose" },
    { id: "crop", label: "Crop" },
    { id: "review", label: "Review" },
];

const GUIDELINES = [
    { icon: FileImage, title: "Format", detail: "JPG, PNG or WebP" },
    { icon: HardDrive, title: "File size", detail: "Up to 8 MB" },
    { icon: Maximize2, title: "Resolution", detail: `At least ${RECOMMENDED_DIMENSION} × ${RECOMMENDED_DIMENSION} px` },
    { icon: UserSquare2, title: "Framing", detail: "Head and shoulders, face centred, plain background" },
];

const formatBytes = (bytes: number) =>
    bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

interface Source {
    url: string;
    name: string;
    width: number;
    height: number;
}

interface Result {
    blob: Blob;
    url: string;
}

interface ProfilePhotoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    kerberos: string;
    name: string;
    initials: string;
    currentImageUrl?: string | null;
    onUploaded: () => void | Promise<void>;
}

const ProfilePhotoDialog = ({
    open, onOpenChange, kerberos, name, initials, currentImageUrl, onUploaded,
}: ProfilePhotoDialogProps) => {
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [step, setStep] = useState<Step>("choose");
    const [source, setSource] = useState<Source | null>(null);
    const [result, setResult] = useState<Result | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [cropPixels, setCropPixels] = useState<Area | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [reading, setReading] = useState(false);
    const [preparing, setPreparing] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => () => { if (source) URL.revokeObjectURL(source.url); }, [source]);
    useEffect(() => () => { if (result) URL.revokeObjectURL(result.url); }, [result]);

    const resetCrop = () => {
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setRotation(0);
    };

    useEffect(() => {
        if (open) return;
        setStep("choose");
        setSource(null);
        setResult(null);
        setCropPixels(null);
        setError(null);
        setIsDragging(false);
        resetCrop();
    }, [open]);

    const acceptFile = async (file: File) => {
        if (!ACCEPTED_TYPES.includes(file.type)) {
            setError("This file type isn't supported. Please choose a JPG, PNG or WebP image.");
            return;
        }
        if (file.size > MAX_BYTES) {
            setError(`This file is ${formatBytes(file.size)}. Please choose an image under 8 MB.`);
            return;
        }
        setError(null);
        setReading(true);
        const url = URL.createObjectURL(file);
        try {
            const img = await loadImage(url);
            if (Math.min(img.naturalWidth, img.naturalHeight) < MIN_DIMENSION) {
                URL.revokeObjectURL(url);
                setError(
                    `This image is only ${img.naturalWidth} × ${img.naturalHeight} px. ` +
                    `Please use one at least ${RECOMMENDED_DIMENSION} × ${RECOMMENDED_DIMENSION} px.`,
                );
                return;
            }
            setSource({ url, name: file.name, width: img.naturalWidth, height: img.naturalHeight });
            setResult(null);
            resetCrop();
            setStep("crop");
        } catch {
            URL.revokeObjectURL(url);
            setError("We couldn't read this image. It may be corrupted; please try another file.");
        } finally {
            setReading(false);
        }
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (file) void acceptFile(file);
    };

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) void acceptFile(file);
    };

    const onCropComplete = useCallback((_: Area, pixels: Area) => setCropPixels(pixels), []);

    const goToReview = async () => {
        if (!source || !cropPixels) return;
        setPreparing(true);
        setError(null);
        try {
            const blob = await cropToSquareJpeg(source.url, cropPixels, rotation, OUTPUT_SIZE);
            setResult({ blob, url: URL.createObjectURL(blob) });
            setStep("review");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not prepare the cropped photo.");
        } finally {
            setPreparing(false);
        }
    };

    const handleSave = async () => {
        if (!result) return;
        setUploading(true);
        setError(null);
        try {
            const file = new File([result.blob], `${kerberos}-profile.jpg`, { type: "image/jpeg" });
            await uploadFacultyImage(kerberos, file);
            await onUploaded();
            toast({ title: "Profile photo updated", description: "Your new photo is now live on your profile and in the directory." });
            onOpenChange(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    const handleOpenChange = (next: boolean) => {
        if (!next && uploading) return;
        onOpenChange(next);
    };

    const stepIndex = STEPS.findIndex((s) => s.id === step);
    const outputSize = cropPixels ? Math.min(OUTPUT_SIZE, Math.round(cropPixels.width)) : null;
    const lowResolution = outputSize !== null && outputSize < RECOMMENDED_DIMENSION;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent
                className="max-w-xl max-h-[92vh] overflow-y-auto sm:rounded-2xl"
                onInteractOutside={(e) => { if (uploading) e.preventDefault(); }}
            >
                <DialogHeader>
                    <DialogTitle>Update profile photo</DialogTitle>
                    <DialogDescription>
                        {step === "choose" && "Pick a clear, recent headshot. You'll crop it to a square next."}
                        {step === "crop" && "Drag to reposition and use the slider to zoom. Everything inside the square will be shown."}
                        {step === "review" && "This is how your photo will appear on your profile and in the faculty directory."}
                    </DialogDescription>
                </DialogHeader>

                <ol className="flex items-center gap-2" aria-label="Progress">
                    {STEPS.map((s, i) => {
                        const done = i < stepIndex;
                        const current = i === stepIndex;
                        return (
                            <li key={s.id} className="flex items-center gap-2 flex-1 last:flex-none">
                                <span
                                    className={cn(
                                        "flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-semibold shrink-0 transition-colors",
                                        done && "bg-primary text-primary-foreground",
                                        current && "bg-primary/15 text-primary ring-2 ring-primary",
                                        !done && !current && "bg-muted text-muted-foreground",
                                    )}
                                    aria-current={current ? "step" : undefined}
                                >
                                    {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
                                </span>
                                <span className={cn("text-xs font-medium", current ? "text-foreground" : "text-muted-foreground")}>
                                    {s.label}
                                </span>
                                {i < STEPS.length - 1 && (
                                    <span className={cn("h-px flex-1 min-w-4", done ? "bg-primary" : "bg-border")} />
                                )}
                            </li>
                        );
                    })}
                </ol>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_TYPES.join(",")}
                    className="hidden"
                    onChange={handleInputChange}
                />

                {step === "choose" && (
                    <div className="space-y-4">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            disabled={reading}
                            className={cn(
                                "w-full rounded-xl border-2 border-dashed px-6 py-8 flex flex-col items-center gap-3 text-center transition-colors",
                                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/40",
                            )}
                        >
                            {currentImageUrl ? (
                                <img src={currentImageUrl} alt="" className="w-16 h-16 rounded-2xl object-cover shadow-md opacity-90" />
                            ) : (
                                <span className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                                    <ImageUp className="w-7 h-7" />
                                </span>
                            )}
                            {reading ? (
                                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Reading image…
                                </span>
                            ) : (
                                <span className="space-y-1">
                                    <span className="block text-sm font-medium">
                                        {isDragging ? "Drop your photo here" : (
                                            <>Drag a photo here, or <span className="text-primary underline underline-offset-2">browse</span></>
                                        )}
                                    </span>
                                    <span className="block text-xs text-muted-foreground">JPG, PNG or WebP · max 8 MB</span>
                                </span>
                            )}
                        </button>

                        <div className="rounded-xl bg-muted/40 border p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Photo requirements</p>
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {GUIDELINES.map(({ icon: Icon, title, detail }) => (
                                    <li key={title} className="flex items-start gap-2.5">
                                        <Icon className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                                        <span className="text-sm leading-snug">
                                            <span className="font-medium">{title}</span>
                                            <span className="block text-xs text-muted-foreground">{detail}</span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                {step === "crop" && source && (
                    <div className="space-y-4">
                        <div className="relative h-72 sm:h-80 rounded-xl overflow-hidden bg-neutral-900">
                            <Cropper
                                image={source.url}
                                crop={crop}
                                zoom={zoom}
                                rotation={rotation}
                                aspect={1}
                                maxZoom={MAX_ZOOM}
                                showGrid
                                objectFit="contain"
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={onCropComplete}
                                style={{ cropAreaStyle: { borderRadius: 24, border: "2px solid rgba(255,255,255,0.85)" } }}
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <ZoomOut className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
                            <Slider
                                value={[zoom]}
                                min={1}
                                max={MAX_ZOOM}
                                step={0.01}
                                onValueChange={([z]) => setZoom(z)}
                                aria-label="Zoom"
                            />
                            <ZoomIn className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => setRotation((r) => (r + 90) % 360)}>
                                    <RotateCw className="w-4 h-4 mr-1.5" /> Rotate
                                </Button>
                                <Button type="button" variant="ghost" size="sm" onClick={resetCrop}>
                                    <RotateCcw className="w-4 h-4 mr-1.5" /> Reset
                                </Button>
                            </div>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="text-xs font-medium text-primary hover:underline underline-offset-2"
                            >
                                Choose a different photo
                            </button>
                        </div>

                        <p className="text-xs text-muted-foreground">
                            {source.name} · original {source.width} × {source.height} px
                            {outputSize !== null && <> · saved at {outputSize} × {outputSize} px</>}
                        </p>

                        {lowResolution && (
                            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
                                <span>
                                    This crop is only {outputSize} px wide and may look blurry. Zoom out, or use a larger photo
                                    (at least {RECOMMENDED_DIMENSION} × {RECOMMENDED_DIMENSION} px).
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {step === "review" && result && (
                    <div className="space-y-4">
                        <div className="rounded-xl border bg-muted/30 p-5 flex flex-col sm:flex-row items-center justify-center gap-8">
                            <figure className="flex flex-col items-center gap-2">
                                <img src={result.url} alt="New profile photo" className="w-36 h-36 rounded-3xl object-cover shadow-xl border-2 border-white/50 dark:border-white/10" />
                                <figcaption className="text-xs text-muted-foreground">Profile page</figcaption>
                            </figure>
                            <figure className="flex flex-col items-center gap-2">
                                <div className="flex items-center gap-3 rounded-xl border bg-background p-3 shadow-sm">
                                    <img src={result.url} alt="" className="w-16 h-16 rounded-2xl object-cover shadow-md" />
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold truncate max-w-[11rem]">{name}</p>
                                        <p className="text-xs text-muted-foreground">Faculty</p>
                                    </div>
                                </div>
                                <figcaption className="text-xs text-muted-foreground">Directory card</figcaption>
                            </figure>
                            <figure className="flex flex-col items-center gap-2">
                                {currentImageUrl ? (
                                    <img src={currentImageUrl} alt="Current profile photo" className="w-16 h-16 rounded-2xl object-cover opacity-60 grayscale" />
                                ) : (
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/50 to-accent/40 flex items-center justify-center text-lg font-bold text-white opacity-60">
                                        {initials}
                                    </div>
                                )}
                                <figcaption className="text-xs text-muted-foreground">Current</figcaption>
                            </figure>
                        </div>
                        <p className="text-xs text-muted-foreground text-center">
                            {outputSize} × {outputSize} px JPG · {formatBytes(result.blob.size)} · visible to everyone once saved
                        </p>
                    </div>
                )}

                {error && (
                    <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                    {step !== "choose" && (
                        <Button
                            type="button"
                            variant="ghost"
                            className="sm:mr-auto"
                            disabled={uploading || preparing}
                            onClick={() => { setError(null); setStep(step === "review" ? "crop" : "choose"); }}
                        >
                            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                        </Button>
                    )}
                    <Button type="button" variant="outline" disabled={uploading} onClick={() => handleOpenChange(false)}>
                        Cancel
                    </Button>
                    {step === "choose" && (
                        <Button type="button" disabled={reading} onClick={() => fileInputRef.current?.click()}>
                            <ImageUp className="w-4 h-4 mr-1.5" /> Select photo
                        </Button>
                    )}
                    {step === "crop" && (
                        <Button type="button" disabled={!cropPixels || preparing} onClick={goToReview}>
                            {preparing ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
                            Continue
                        </Button>
                    )}
                    {step === "review" && (
                        <Button type="button" disabled={uploading} onClick={handleSave}>
                            {uploading ? (
                                <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Saving…</>
                            ) : (
                                <><Check className="w-4 h-4 mr-1.5" /> Save photo</>
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ProfilePhotoDialog;
