/**
 * Utility for client-side image compression
 * Resizes large photos and compresses them to modern WebP / JPEG format
 * to drastically reduce storage footprint in localStorage and Firestore databases.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  preferredFormat?: 'image/webp' | 'image/jpeg';
}

export interface CompressedImageResult {
  dataUrl: string;
  originalFileName: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  savedPercentage: number;
  dimensions: {
    width: number;
    height: number;
    originalWidth: number;
    originalHeight: number;
  };
  mimeType: string;
}

/**
 * Formats byte size into human readable string (e.g. "45.2 KB", "2.1 MB")
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Calculates byte size of a base64 Data URL
 */
export function calculateBase64Size(dataUrl: string): number {
  if (!dataUrl) return 0;
  const commaIdx = dataUrl.indexOf(',');
  const base64Str = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  const padding = (base64Str.match(/=/g) || []).length;
  return Math.max(0, Math.floor((base64Str.length * 3) / 4) - padding);
}

/**
 * Compresses an image File or Blob using HTML5 Canvas.
 * - Scales down high-resolution camera captures (preserving aspect ratio)
 * - Encodes as WebP (with fallback to JPEG)
 * - Returns base64 DataURL and detailed compression statistics
 */
export async function compressImageFile(
  file: File | Blob,
  fileName: string = 'image.webp',
  options: CompressionOptions = {}
): Promise<CompressedImageResult> {
  const {
    maxWidth = 720,
    maxHeight = 720,
    quality = 0.78,
    preferredFormat = 'image/webp',
  } = options;

  const originalSizeBytes = file.size;

  return new Promise((resolve, reject) => {
    // 1. Validate file type
    if (file.type && !file.type.startsWith('image/')) {
      return reject(new Error('Please upload a valid image file (JPEG, PNG, WebP, etc.).'));
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const originalWidth = img.naturalWidth || img.width;
      const originalHeight = img.naturalHeight || img.height;

      if (!originalWidth || !originalHeight) {
        return reject(new Error('Could not determine image dimensions.'));
      }

      // 2. Compute proportional scaled dimensions
      let targetWidth = originalWidth;
      let targetHeight = originalHeight;

      if (targetWidth > maxWidth || targetHeight > maxHeight) {
        const widthRatio = maxWidth / targetWidth;
        const heightRatio = maxHeight / targetHeight;
        const scale = Math.min(widthRatio, heightRatio);

        targetWidth = Math.round(targetWidth * scale);
        targetHeight = Math.round(targetHeight * scale);
      }

      // 3. Render onto HTML5 Canvas
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not initialize canvas context for compression.'));
      }

      // Optional high quality downscaling smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw image to canvas
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      // 4. Convert to compressed format
      let format = preferredFormat;
      let dataUrl = '';

      try {
        dataUrl = canvas.toDataURL(format, quality);
        // If browser doesn't support WebP export, it might return PNG
        if (format === 'image/webp' && !dataUrl.startsWith('data:image/webp')) {
          format = 'image/jpeg';
          dataUrl = canvas.toDataURL(format, quality);
        }
      } catch (err) {
        // Fallback to jpeg
        format = 'image/jpeg';
        dataUrl = canvas.toDataURL(format, quality);
      }

      const compressedSizeBytes = calculateBase64Size(dataUrl);
      const savedBytes = Math.max(0, originalSizeBytes - compressedSizeBytes);
      const savedPercentage = originalSizeBytes > 0
        ? Math.min(99.9, Math.max(0, Math.round((savedBytes / originalSizeBytes) * 100)))
        : 0;

      resolve({
        dataUrl,
        originalFileName: (file as File).name || fileName,
        originalSizeBytes,
        compressedSizeBytes,
        savedPercentage,
        dimensions: {
          width: targetWidth,
          height: targetHeight,
          originalWidth,
          originalHeight,
        },
        mimeType: format,
      });
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for compression.'));
    };

    img.src = objectUrl;
  });
}
