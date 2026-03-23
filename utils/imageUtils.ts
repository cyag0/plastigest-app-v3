export function resolveImageUri(image: any): string | null {
  if (!image) return null;

  if (typeof image === "string") {
    return image;
  }

  if (typeof image === "object") {
    if (typeof image.uri === "string" && image.uri) return image.uri;
    if (typeof image.url === "string" && image.url) return image.url;
    if (typeof image.path === "string" && image.path) return image.path;
  }

  return null;
}
