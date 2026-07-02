// Product image gallery with clickable thumbnails.
//
// This is a Client Component ("use client") because it holds interactive state:
// which image is currently enlarged. It receives already-serializable data
// (plain image URLs + alt text) from the server, so no database types cross the
// server/client boundary.

"use client";

import { useState } from "react";
import Image from "next/image";

type GalleryImage = { url: string; alt: string | null };

const FALLBACK = "https://placehold.co/800x800/f1f5f9/94a3b8?text=No+Image";

export default function ProductGallery({
  images,
  name,
}: {
  images: GalleryImage[];
  name: string;
}) {
  // Guarantee at least one image so the layout never collapses.
  const gallery: GalleryImage[] =
    images.length > 0 ? images : [{ url: FALLBACK, alt: name }];

  const [active, setActive] = useState(0);
  const current = gallery[active] ?? gallery[0];

  return (
    <div>
      {/* Main image */}
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
        <Image
          src={current.url}
          alt={current.alt ?? name}
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
        />
      </div>

      {/* Thumbnails — only shown when there's more than one image */}
      {gallery.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {gallery.map((image, index) => (
            <button
              key={image.url}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`View image ${index + 1}`}
              aria-current={index === active}
              className={`relative aspect-square overflow-hidden rounded-lg border transition ${
                index === active
                  ? "border-blue-600 ring-2 ring-blue-100"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <Image
                src={image.url}
                alt={image.alt ?? `${name} thumbnail ${index + 1}`}
                fill
                sizes="20vw"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
