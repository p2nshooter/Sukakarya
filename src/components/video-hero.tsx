"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The autoplaying welcome video at the top of the homepage.
 *
 * A client component because two of its behaviours cannot be expressed in
 * markup or CSS:
 *
 *   - `prefers-reduced-motion` cannot stop a video. The attribute starts
 *     playback before any stylesheet applies, so a viewer who has asked their
 *     system for less movement gets it anyway unless something pauses the
 *     element. Here it is paused on mount and the poster frame stands in, with
 *     a play control for anyone who wants it after all.
 *
 *   - The clip carries narration, and browsers only permit autoplay while
 *     muted. Without a way back the audio would simply never be heard, so the
 *     sound control is part of the component rather than an afterthought.
 */
export function VideoHero({
  src,
  fallbackSrc,
  poster,
  label,
  description,
}: {
  src: string;
  /** WebM copy, offered after the MP4 for browsers built without H.264. */
  fallbackSrc?: string | null;
  poster: string | null;
  label: string;
  description: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.pause();
      setPlaying(false);
    }
  }, []);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  const toggleSound = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
    // Unmuting is a deliberate act, so start the clip if it was paused.
    if (!video.muted && video.paused) {
      void video.play();
      setPlaying(true);
    }
  };

  return (
    <section aria-label={label} className="relative bg-black">
      <video
        ref={videoRef}
        // eslint-disable-next-line jsx-a11y/media-has-caption -- the narration
        // is decorative; the same words are in the visually hidden summary
        // below and in the page heading underneath.
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster={poster ?? undefined}
        className="mx-auto block aspect-video w-full max-w-[1600px] object-cover"
      >
        {/* MP4 first: it is the one format every phone in the village will
            have. WebM only catches the browsers shipped without H.264. */}
        <source src={src} type="video/mp4" />
        {fallbackSrc ? <source src={fallbackSrc} type="video/webm" /> : null}
      </video>

      <p className="sr-only">{description}</p>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {!playing ? (
          <button
            type="button"
            onClick={toggle}
            className="pointer-events-auto grid h-16 w-16 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm transition hover:bg-black/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            aria-label="Putar video sambutan"
          >
            <svg viewBox="0 0 24 24" className="h-7 w-7 translate-x-0.5" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        ) : null}
      </div>

      <div className="absolute bottom-3 right-3 flex gap-2">
        <button
          type="button"
          onClick={toggle}
          className="grid h-10 w-10 place-items-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          aria-label={playing ? "Jeda video" : "Putar video"}
        >
          {playing ? (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
              <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5 translate-x-0.5" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={toggleSound}
          className="grid h-10 w-10 place-items-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          aria-label={muted ? "Nyalakan suara video" : "Matikan suara video"}
        >
          {muted ? (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
              <path d="M3.6 3.6 2.2 5l4.3 4.3H3v5.4h4l5 5v-6.7l4.2 4.2a6 6 0 0 1-1.9.9v2.1a8 8 0 0 0 3.4-1.5l2 2 1.4-1.4zM12 4 9.9 6.1 12 8.2z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
              <path d="M3 9.3v5.4h4l5 5V4.3l-5 5zm13.5 2.7a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4m-2.5-8.9v2.1a7 7 0 0 1 0 13.6v2.1a9 9 0 0 0 0-17.8" />
            </svg>
          )}
        </button>
      </div>
    </section>
  );
}
