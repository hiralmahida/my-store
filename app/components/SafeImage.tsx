// next/image wrapper with a graceful fallback: if the image fails to load
// (bad URL, upstream 404/blocked), it swaps to a clean placeholder instead of
// showing a broken image. Used anywhere we render remote product photos.

"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

const DEFAULT_FALLBACK =
  "https://placehold.co/600x600/f1f5f9/94a3b8?text=No+Image";

export default function SafeImage({
  src,
  alt,
  fallbackSrc = DEFAULT_FALLBACK,
  ...rest
}: ImageProps & { fallbackSrc?: string }) {
  const [errored, setErrored] = useState(false);

  // Reset the error when the source changes (e.g. gallery thumbnail switching),
  // adjusting state during render rather than in an effect.
  const [prevSrc, setPrevSrc] = useState(src);
  if (src !== prevSrc) {
    setPrevSrc(src);
    setErrored(false);
  }

  return (
    <Image
      {...rest}
      // Load remote product images directly in the browser rather than through
      // the Next image optimizer. The optimizer can intermittently fail to fetch
      // from some remote hosts (rate limits / UA blocks), which showed up as
      // blank images; the browser fetches these hosts reliably. onError still
      // swaps to a placeholder if a specific URL is unreachable.
      unoptimized
      src={errored ? fallbackSrc : src}
      alt={alt}
      onError={() => setErrored(true)}
    />
  );
}
