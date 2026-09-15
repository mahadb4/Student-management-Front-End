// Turns a source image + a pixel crop rectangle (as reported by react-easy-crop)
// into a square JPEG Blob, entirely on the canvas - no server round-trip needed
// before upload.
export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("Failed to load image.")));
    image.crossOrigin = "anonymous";
    image.src = src;
  });
}

export async function getCroppedImageBlob(
  imageSrc: string,
  pixelCrop: PixelCrop,
  outputSize = 512,
): Promise<Blob> {
  const image = await loadImage(imageSrc);

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not process image.");
  }

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (blob) resolve(blob);
        else reject(new Error("Could not process image."));
      },
      "image/jpeg",
      0.9,
    );
  });
}
