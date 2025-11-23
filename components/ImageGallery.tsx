import React, { useEffect, useMemo, useRef, useState } from "react";
import { getStorage, ref as storageRef, listAll, getDownloadURL } from "firebase/storage";
import type { FirebaseApp } from "firebase/app";

// USAGE NOTE: This component expects you to initialize Firebase elsewhere and pass the Firebase app
// into window.__firebaseApp or import it and call getStorage(firebaseApp). Example init (not included):
// import { initializeApp } from 'firebase/app';
// const firebaseApp = initializeApp(firebaseConfig);
// window.__firebaseApp = firebaseApp;


interface ImageGalleryProps {
  productName: string;
  firebaseApp?: FirebaseApp; // optional: if not provided, will try window.__firebaseApp
  initialUrls?: string[];
  selectedImage?: string;
  onSelect?: (url: string) => void;
  autoPlayInterval?: number; // ms
  cacheTTLms?: number; // cache TTL
  fallbackImage?: string;
}

const CACHE_KEY = "image_gallery_cache_v1";

const defaultFallback =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'><rect fill='%23F3F4F6' width='100%' height='100%'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23999' font-family='Arial' font-size='20'>Image not available</text></svg>";

export default function ImageGallery({
  productName,
  firebaseApp,
  initialUrls = [],
  selectedImage,
  onSelect,
  autoPlayInterval = 5000,
  cacheTTLms = 1000 * 60 * 60 * 24, // 24 hours
  fallbackImage = defaultFallback,
}: ImageGalleryProps) {
  const [images, setImages] = useState<string[]>(initialUrls || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const mountedRef = useRef(true);
  const autoplayRef = useRef<number | null>(null);

  const resolvedApp = firebaseApp || (window as any).__firebaseApp || null;
  const storage = useMemo(() => (resolvedApp ? getStorage(resolvedApp) : null), [resolvedApp]);

  // Sync selectedImage prop -> currentIndex when provided
  useEffect(() => {
    if (!selectedImage) return;
    const idx = images.indexOf(selectedImage);
    if (idx >= 0) setCurrentIndex(idx);
  }, [selectedImage, images]);

  // Cleanup
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (autoplayRef.current) window.clearInterval(autoplayRef.current);
    };
  }, []);

  // Load images from cache or Firebase storage (option 1: folder with multiple images)
  useEffect(() => {
    if (initialUrls && initialUrls.length > 0) {
      setImages(initialUrls);
      setError(null);
      return;
    }

    let cancelled = false;
    const fetchFromFirebase = async () => {
      setLoading(true);
      setError(null);
      try {
        // Check cache first
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            const entry = parsed[productName];
            if (entry && Date.now() - entry.ts < cacheTTLms) {
              setImages(entry.urls);
              if (onSelect && entry.urls.length > 0) onSelect(entry.urls[0]);
              setLoading(false);
              return;
            }
          } catch (e) {
            // ignore parse error and continue to fetch
          }
        }

        if (!storage) throw new Error("Firebase storage not initialized (pass firebaseApp prop or set window.__firebaseApp)");

        const folderRef = storageRef(storage, `products/${productName}`);
        const listResult = await listAll(folderRef);
        // Get download URLs in parallel
        const urls = await Promise.all(
          listResult.items.map(async (itemRef) => {
            try {
              return await getDownloadURL(itemRef);
            } catch (e) {
              return null;
            }
          })
        );
        const filtered = urls.filter(Boolean) as string[];
        if (cancelled) return;
        setImages(filtered);
        if (filtered.length > 0 && onSelect) onSelect(filtered[0]);

        // Cache the urls
        try {
          const raw2 = localStorage.getItem(CACHE_KEY);
          const parsed2 = raw2 ? JSON.parse(raw2) : {};
          parsed2[productName] = { urls: filtered, ts: Date.now() };
          localStorage.setItem(CACHE_KEY, JSON.stringify(parsed2));
        } catch (e) {
          // ignore localStorage failures
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load images from Firebase");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchFromFirebase();

    return () => {
      cancelled = true;
    };
  }, [productName, initialUrls, storage, onSelect, cacheTTLms]);

  // Auto-play handler
  useEffect(() => {
    if (!isPlaying || images.length <= 1) return;
    autoplayRef.current = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, autoPlayInterval);
    return () => {
      if (autoplayRef.current) window.clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    };
  }, [isPlaying, images, autoPlayInterval]);

  // Preload neighbor images for smoother transitions
  useEffect(() => {
    if (!images || images.length === 0) return;
    const next = images[(currentIndex + 1) % images.length];
    const prev = images[(currentIndex - 1 + images.length) % images.length];
    [next, prev].forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [currentIndex, images]);

  const selectIndex = (idx: number) => {
    if (idx < 0 || idx >= images.length) return;
    setCurrentIndex(idx);
    setIsPlaying(false);
    if (onSelect) onSelect(images[idx]);
  };

  const next = () => selectIndex((currentIndex + 1) % images.length);
  const prev = () => selectIndex((currentIndex - 1 + images.length) % images.length);

  const handleImageError = (ev: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const el = ev.currentTarget;
    if (el.dataset.failed) return; // already failed once
    el.dataset.failed = "1";
    el.src = fallbackImage;
  };

  const current = images[currentIndex] || selectedImage || "";

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="relative bg-white rounded-2xl shadow-lg overflow-hidden border">
        {/* MAIN IMAGE AREA */}
        <div className="relative w-full h-96 flex items-center justify-center bg-gray-50">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center p-6">
              {/* Skeleton loader */}
              <div className="w-full h-full flex items-center justify-center gap-4 animate-pulse">
                <div className="w-4/5 h-64 bg-gray-200 rounded"></div>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="p-6 text-center text-sm text-red-500">{error}</div>
          )}

          {!loading && !error && current && (
            <>
              <img
                src={current}
                alt={`${productName} image`}
                className="max-h-96 w-full object-contain cursor-zoom-in select-none"
                loading="eager"
                decoding="async"
                onClick={() => setZoomOpen(true)}
                onError={handleImageError}
                style={{ transition: "transform .2s ease" }}
              />

              {/* prev / next arrows */}
              {images.length > 1 && (
                <>
                  <button
                    aria-label="previous"
                    onClick={prev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur rounded-full p-2 shadow hover:scale-105"
                    style={{ zIndex: 10 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <button
                    aria-label="next"
                    onClick={next}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur rounded-full p-2 shadow hover:scale-105"
                    style={{ zIndex: 10 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}

              {/* Play / Pause */}
              <div className="absolute right-4 bottom-4 bg-white/90 rounded-full p-2 shadow flex items-center gap-2">
                <button
                  aria-label={isPlaying ? "pause slideshow" : "play slideshow"}
                  onClick={() => setIsPlaying((s) => !s)}
                  className="p-1">
                  {isPlaying ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v18l15-9L5 3z" />
                    </svg>
                  )}
                </button>
              </div>
            </>
          )}

          {!loading && !error && !current && (
            <div className="p-8 text-center text-gray-400">No images available</div>
          )}
        </div>

        {/* THUMBNAILS */}
        {images.length > 1 && (
          <div className="px-4 py-3 border-t bg-white">
            <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide py-1">
              {images.map((url, i) => (
                <button
                  key={url + i}
                  onClick={() => selectIndex(i)}
                  className={`flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 transition-transform ${
                    i === currentIndex ? "border-brand-blue scale-105" : "border-transparent hover:scale-105"
                  }`}>
                  <img
                    src={url}
                    alt={`${productName} thumbnail ${i + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                    onError={handleImageError}
                    style={{ minWidth: 0 }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ZOOM MODAL */}
      {zoomOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={() => setZoomOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setZoomOpen(false);
          }}>
          <div className="max-w-5xl w-full max-h-[90vh] overflow-auto">
            <img
              src={current}
              alt={`${productName} zoomed`}
              className="w-full h-auto object-contain rounded-lg shadow-2xl"
              onError={handleImageError}
            />
          </div>
        </div>
      )}
    </div>
  );
}
