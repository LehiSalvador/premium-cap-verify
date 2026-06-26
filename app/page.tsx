import InvitationStage from "./components/InvitationStage";

// Enlace de ubicacion del evento (abre en pestana nueva, solo desde el banner).
const MAPS_URL = "https://maps.app.goo.gl/zhxMEY4R3L6mgZc9A";

// Video final servido desde Supabase Storage (bucket publico `invitations-public`).
// Fuente: VideoMiaIsabella.mp4 optimizado a 1080p/~14.5 MB, 30fps, faststart.
// Nombre versionado (v2) para invalidar cache; no se sube a GitHub por su peso.
// URLs publicas (no contienen secretos: el project ref aparece en toda URL publica de Supabase).
const SUPABASE_MEDIA =
  "https://tefprgoggrkqzwrpoctr.supabase.co/storage/v1/object/public/invitations-public/mia-isabella/video";
const VIDEO_URL = `${SUPABASE_MEDIA}/invitation-v2-1080p.mp4`;
const POSTER_URL = `${SUPABASE_MEDIA}/poster-v2.jpg`;

export default function Home() {
  return (
    <InvitationStage
      videoSrc={VIDEO_URL}
      posterSrc={POSTER_URL}
      bannerSrc="/assets/imagenes/banner-ubicacion.jpg"
      mapsUrl={MAPS_URL}
      ctaText="📍 Pulsa aquí para ver la ubicación"
      guestName="Mia Isabella Rangel Cárdenas"
      shortName="Mia Isabella"
    />
  );
}
