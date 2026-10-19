export interface PixelArea {
    x: number;
    y: number;
    width: number;
    height: number;
}

export const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Could not read this image."));
        img.src = src;
    });

const rotatedSize = (width: number, height: number, degrees: number) => {
    const rad = (degrees * Math.PI) / 180;
    return {
        width: Math.abs(Math.cos(rad) * width) + Math.abs(Math.sin(rad) * height),
        height: Math.abs(Math.sin(rad) * width) + Math.abs(Math.cos(rad) * height),
    };
};

/**
 * Renders the selected square of `src` (after `rotation` degrees) to a JPEG no
 * larger than `maxSize`×`maxSize`. Transparent pixels are flattened onto white.
 */
export async function cropToSquareJpeg(
    src: string,
    area: PixelArea,
    rotation = 0,
    maxSize = 800,
    quality = 0.9,
): Promise<Blob> {
    const image = await loadImage(src);

    let source: CanvasImageSource = image;
    if (rotation % 360 !== 0) {
        const { width, height } = rotatedSize(image.naturalWidth, image.naturalHeight, rotation);
        const rotated = document.createElement("canvas");
        rotated.width = Math.round(width);
        rotated.height = Math.round(height);
        const rctx = rotated.getContext("2d");
        if (!rctx) throw new Error("Your browser could not process this image.");
        rctx.translate(rotated.width / 2, rotated.height / 2);
        rctx.rotate((rotation * Math.PI) / 180);
        rctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
        source = rotated;
    }

    const size = Math.max(1, Math.min(maxSize, Math.round(area.width)));
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser could not process this image.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, area.x, area.y, area.width, area.height, 0, 0, size, size);

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error("Could not prepare the cropped photo."))),
            "image/jpeg",
            quality,
        );
    });
}
