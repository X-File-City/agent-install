export const sanitizeSubpath = (subpath: string): string => {
  const normalized = subpath.replace(/\\/g, "/");
  const segments = normalized.split("/");

  for (const segment of segments) {
    if (segment === "..") {
      throw new Error(
        `Unsafe subpath: "${subpath}" contains path traversal segments. ` +
          `Subpaths must not contain ".." components.`,
      );
    }
  }

  return subpath;
};
