"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

type StageProps = {
  videoSrc: string;
  posterSrc: string;
  bannerSrc: string;
  mapsUrl: string;
  ctaText: string;
  guestName: string;
};

// Pausa entre reproducciones (no es loop continuo): el video corre una vez,
// termina, espera 3 s y vuelve a empezar.
const REPLAY_DELAY_MS = 3000;

export default function InvitationStage({
  videoSrc,
  posterSrc,
  bannerSrc,
  mapsUrl,
  ctaText,
  guestName,
}: StageProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const replayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [soundOn, setSoundOn] = useState(false);

  // Intenta activar el audio (los moviles bloquean autoplay con sonido).
  const enableSound = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    v.volume = 1;
    const p = v.play();
    if (p && typeof p.then === "function") {
      p.then(() => setSoundOn(true)).catch(() => setSoundOn(false));
    } else {
      setSoundOn(true);
    }
  }, []);

  // Al terminar: esperar 3 s y reiniciar desde el principio.
  const handleEnded = useCallback(() => {
    if (replayTimer.current) clearTimeout(replayTimer.current);
    replayTimer.current = setTimeout(() => {
      const v = videoRef.current;
      if (!v) return;
      v.currentTime = 0;
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    }, REPLAY_DELAY_MS);
  }, []);

  // Limpieza del timeout para evitar fugas de memoria.
  useEffect(() => {
    return () => {
      if (replayTimer.current) clearTimeout(replayTimer.current);
    };
  }, []);

  return (
    <main className="page">
      <h1 className="sr-only">Invitación a la fiesta de {guestName}</h1>

      <div className="composition">
        {/* ---------- Video (arriba) ---------- */}
        <div className="video-wrap">
          <video
            ref={videoRef}
            className={`video ${videoReady ? "is-ready" : ""}`}
            poster={posterSrc}
            playsInline
            muted
            autoPlay
            preload="metadata"
            onCanPlay={() => setVideoReady(true)}
            onEnded={handleEnded}
            onError={() => setVideoReady(false)}
          >
            <source src={videoSrc} type="video/mp4" />
          </video>

          {/* Placeholder elegante mientras no exista el video final */}
          <div
            className={`video-placeholder ${videoReady ? "is-hidden" : ""}`}
            aria-hidden="true"
          >
            <span className="orb" />
            <span className="ph-text">Video de invitación</span>
          </div>

          {/* Boton de sonido, sobre el video, sin estorbar al banner */}
          <button
            type="button"
            className={`sound-btn ${soundOn ? "is-on" : ""}`}
            onClick={enableSound}
            aria-label={soundOn ? "Sonido activado" : "Activar sonido"}
          >
            {soundOn ? "🔊" : "🔈"}
            <span className="sound-label">
              {soundOn ? "Sonido activado" : "Activar sonido"}
            </span>
          </button>
        </div>

        {/* ---------- Banner clickeable (abajo) ---------- */}
        <a
          className="banner-link"
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Ver la ubicación en Google Maps"
        >
          <span className="banner-cta">{ctaText}</span>
          <Image
            className="banner-img"
            src={bannerSrc}
            alt={`Invitación de ${guestName} — pulsa para ver la ubicación`}
            width={1600}
            height={800}
            sizes="(max-width: 520px) 100vw, 480px"
            priority
            style={{ width: "100%", height: "auto" }}
          />
        </a>
      </div>
    </main>
  );
}
