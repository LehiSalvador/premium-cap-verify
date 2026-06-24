import InvitationStage from "./components/InvitationStage";

// Enlace de ubicacion del evento (abre en pestana nueva, solo desde el banner).
const MAPS_URL = "https://maps.app.goo.gl/zhxMEY4R3L6mgZc9A";

// Video final servido desde Vercel Blob (no se sube a GitHub por su peso ~103 MB).
// URL publica del Blob; no contiene secretos.
const VIDEO_URL =
  "https://qi9hwppeztvjguvu.public.blob.vercel-storage.com/mia-isabella/invitation-final-v2.mp4";

export default function Home() {
  return (
    <InvitationStage
      videoSrc={VIDEO_URL}
      posterSrc="/assets/poster/poster.jpg"
      bannerSrc="/assets/imagenes/banner-ubicacion.jpg"
      mapsUrl={MAPS_URL}
      ctaText="📍 Pulsa aquí para ver la ubicación"
      guestName="Mia Isabella Rangel Cárdenas"
      shortName="Mia Isabella"
    />
  );
}
