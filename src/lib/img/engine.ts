import sharp from "sharp";

export type ImageFormat =
  | "svg"
  | "png"
  | "jpg"
  | "jpeg"
  | "webp"
  | "ico"
  | "gif"
  | "bmp"
  | "tiff";

export interface ImageConversionOptions {
  format: ImageFormat;
  width?: number;
  height?: number;
  quality?: number;
  backgroundColor?: string;
  lossless?: boolean;
  effort?: number;
  colors?: number;
}

export interface ImageConversionResult {
  buffer: Buffer;
  format: ImageFormat;
  width: number;
  height: number;
  size: number;
  processingTime: number;
}

/**
 * Convert raster image to SVG by embedding as base64 data URI
 * This creates a scalable SVG container with the embedded raster image
 */
async function convertRasterToSvg(
  inputBuffer: Buffer,
  fromFormat: ImageFormat,
  options: ImageConversionOptions
): Promise<ImageConversionResult> {
  const start = Date.now();
  
  // Get image metadata
  const metadata = await sharp(inputBuffer).metadata();
  let width = options.width || metadata.width || 100;
  let height = options.height || metadata.height || 100;
  
  // Resize if needed
  let processedBuffer = inputBuffer;
  if (options.width || options.height) {
    processedBuffer = await sharp(inputBuffer)
      .resize(options.width, options.height, { fit: 'inside', withoutEnlargement: true })
      .toBuffer();
    const newMeta = await sharp(processedBuffer).metadata();
    width = newMeta.width || width;
    height = newMeta.height || height;
  }
  
  // Convert to PNG for embedding (universal support)
  const pngBuffer = await sharp(processedBuffer).png().toBuffer();
  const base64 = pngBuffer.toString('base64');
  
  // Create SVG with embedded image
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
     width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <title>Converted from ${fromFormat.toUpperCase()}</title>
  <image width="${width}" height="${height}" 
         xlink:href="data:image/png;base64,${base64}" />
</svg>`;
  
  const buffer = Buffer.from(svg, 'utf-8');
  
  return {
    buffer,
    format: 'svg',
    width,
    height,
    size: buffer.length,
    processingTime: Date.now() - start,
  };
}

export async function convertImage(
  inputBuffer: Buffer,
  fromFormat: ImageFormat,
  options: ImageConversionOptions
): Promise<ImageConversionResult> {
  const start = Date.now();

  try {
    let pipeline = sharp(inputBuffer);

    // Resize if dimensions specified
    if (options.width || options.height) {
      pipeline = pipeline.resize(options.width, options.height, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    // Handle format conversion
    switch (options.format) {
      case "png":
        pipeline = pipeline.png({
          quality: options.quality || 100,
          compressionLevel: 9,
          palette: options.lossless === true,
        });
        if (fromFormat === "svg" && options.backgroundColor) {
          pipeline = pipeline.flatten({
            background: options.backgroundColor || "#ffffff",
          });
        }
        break;

      case "jpg":
      case "jpeg":
        pipeline = pipeline.jpeg({
          quality: options.quality || 95,
          mozjpeg: true,
          progressive: true,
          optimiseScans: true,
        });
        pipeline = pipeline.flatten({
          background: options.backgroundColor || "#ffffff",
        });
        break;

      case "webp":
        pipeline = pipeline.webp({
          quality: options.quality || 95,
          lossless: options.lossless || false,
          effort: options.effort || 6,
          smartSubsample: true,
        });
        break;

      case "ico":
        // Convert to PNG first, then to ICO format
        pipeline = pipeline.png();
        // ICO files typically need specific sizes (16x16, 32x32, 48x48, etc.)
        if (!options.width && !options.height) {
          pipeline = pipeline.resize(32, 32, { fit: "contain" });
        }
        break;

      case "gif":
        pipeline = pipeline.gif({
          colors: options.colors || 256,
          effort: options.effort || 7,
        });
        break;

      case "bmp":
        // Sharp doesn't directly support BMP output, convert to PNG
        pipeline = pipeline.png();
        break;

      case "tiff":
        pipeline = pipeline.tiff({
          quality: options.quality || 95,
          compression: "lzw",
        });
        break;

      case "svg":
        // For raster to SVG, embed the image as base64 data URI in an SVG wrapper
        // This preserves the original image in a vector container
        return await convertRasterToSvg(inputBuffer, fromFormat, options);

      default:
        throw new Error(`Unsupported output format: ${options.format}`);
    }

    const buffer = await pipeline.toBuffer();
    const outputMetadata = await sharp(buffer).metadata();

    return {
      buffer,
      format: options.format,
      width: outputMetadata.width || 0,
      height: outputMetadata.height || 0,
      size: buffer.length,
      processingTime: Date.now() - start,
    };
  } catch (error) {
    throw new Error(
      `Image conversion failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export function detectImageFormat(buffer: Buffer): ImageFormat | "unknown" {
  // Check file signatures (magic numbers)
  if (buffer.length < 4) return "unknown";

  // PNG signature
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "png";
  }

  // JPEG signature
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpg";
  }

  // WebP signature (RIFF....WEBP)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer.length >= 12 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "webp";
  }

  // GIF signature
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    return "gif";
  }

  // BMP signature
  if (buffer[0] === 0x42 && buffer[1] === 0x4d) {
    return "bmp";
  }

  // TIFF signature (little-endian and big-endian)
  if (
    (buffer[0] === 0x49 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x2a &&
      buffer[3] === 0x00) ||
    (buffer[0] === 0x4d &&
      buffer[1] === 0x4d &&
      buffer[2] === 0x00 &&
      buffer[3] === 0x2a)
  ) {
    return "tiff";
  }

  // ICO signature
  if (
    buffer[0] === 0x00 &&
    buffer[1] === 0x00 &&
    buffer[2] === 0x01 &&
    buffer[3] === 0x00
  ) {
    return "ico";
  }

  // SVG (check for XML/SVG tags)
  const text = buffer.toString("utf8", 0, Math.min(1000, buffer.length));
  if (text.includes("<svg") || text.includes("<?xml")) {
    return "svg";
  }

  return "unknown";
}

export function validateImageFormat(format: string): format is ImageFormat {
  return [
    "svg",
    "png",
    "jpg",
    "jpeg",
    "webp",
    "ico",
    "gif",
    "bmp",
    "tiff",
  ].includes(format);
}
