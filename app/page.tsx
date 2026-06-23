import InvitationStage from "./components/InvitationStage";

// Enlace de ubicacion del evento (abre en pestana nueva, solo desde el banner).
const MAPS_URL = "https://maps.app.goo.gl/zhxMEY4R3L6mgZc9A";

export default function Home() {
  return (
    <InvitationStage
      videoSrc="/assets/video/invitation.mp4"
      posterSrc="/assets/poster/poster.jpg"
      bannerSrc="/assets/imagenes/banner-ubicacion.jpg"
      mapsUrl={MAPS_URL}
      ctaText="📍 Pulsa aquí para ver la ubicación"
      guestName="Mia Isabella Rangel Cárdenas"
    />
  );
}
