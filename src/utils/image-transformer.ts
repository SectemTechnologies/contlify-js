export interface ImageTransformOptions {
  maxWidth?: string;
  height?: string;
  borderRadius?: string;
  margin?: string;
  display?: string;
  loading?: "lazy" | "eager";
  decoding?: "async" | "sync" | "auto";
  customStyle?: string;
}

/**
 * Transforms article HTML content by automatically injecting responsive image styles
 * and performance attributes (loading="lazy", decoding="async", max-width: 100%).
 *
 * @param html Raw article HTML string
 * @param options Styling and performance configuration options
 * @returns Optimized HTML string with responsive images
 */
export function optimizeContentImages(
  html: string,
  options: ImageTransformOptions = {}
): string {
  if (!html || typeof html !== "string") {
    return html;
  }

  const maxWidth = options.maxWidth ?? "100%";
  const height = options.height ?? "auto";
  const borderRadius = options.borderRadius ?? "8px";
  const margin = options.margin ?? "24px 0";
  const display = options.display ?? "block";
  const loading = options.loading ?? "lazy";
  const decoding = options.decoding ?? "async";
  const customStyle = options.customStyle ?? "";

  const baseStyle = `max-width: ${maxWidth}; height: ${height}; display: ${display}; border-radius: ${borderRadius}; margin: ${margin}; ${customStyle}`.trim();

  // Replace <img ...> tags with styled responsive images
  return html.replace(/<img\b([^>]*)>/gi, (_match, attributes: string) => {
    let attrs = attributes;

    // Inject or append style attribute
    if (/style=["'][^"']*["']/i.test(attrs)) {
      attrs = attrs.replace(/style=["']([^"']*)["']/i, (_, existingStyle: string) => {
        return `style="${baseStyle}; ${existingStyle}"`;
      });
    } else {
      attrs += ` style="${baseStyle}"`;
    }

    // Inject loading="lazy" if not present
    if (!/loading=["'][^"']*["']/i.test(attrs)) {
      attrs += ` loading="${loading}"`;
    }

    // Inject decoding="async" if not present
    if (!/decoding=["'][^"']*["']/i.test(attrs)) {
      attrs += ` decoding="${decoding}"`;
    }

    return `<img${attrs}>`;
  });
}
