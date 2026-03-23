/**
 * ArrivalPage — Acolhimento no Destino
 * Tela automática de chegada baseada na tela "Acolhimento no Destino" da imagem de referência.
 *
 * Mostra:
 *  - "Pousou em [destino]"
 *  - Informações de chegada (companhia aérea, gate)
 *  - Botão VER ROTA PARA HOTEL
 *  - Dica pro-ativa do concierge
 *  - Opções de transporte local (Uber, Táxi, Aluguel)
 *  - Lembrete check-in hotel
 *
 * Route: /trips/:id/arrival
 * Also accessible from TripDetailPage when flight status = "landed"
 */

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, useRoute } from "wouter";
import { MapView } from "@/components/Map";
import { ArrowLeft, Plane, Hotel, Car, Phone, Navigation, MessageCircle, Loader2, Star, ChevronRight, BellRing } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TripData {
  userId?: string;
  destination?: string;
  route?: string;
  flights?: Array<{ flight: string; from: string; to: string; date: string; airline?: string; depart?: string; arrive?: string }>;
  hotel?: { name?: string; address?: string; checkIn?: string; checkOut?: string; confirmation?: string };
  flightStatus?: {
    status?: string;
    arrival?: { gate?: string; terminal?: string; baggage?: string };
    departure?: { gate?: string; terminal?: string };
  };
  gate?: string;
  terminal?: string;
}

// ─── Transport option card ────────────────────────────────────────────────────

function TransportCard({
  icon,
  title,
  subtitle,
  cta,
  accent,
  href,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  cta?: string;
  accent: string;
  href?: string;
  onPress?: () => void;
}) {
  const handle = () => {
    if (href) window.open(href, "_blank");
    else onPress?.();
  };

  return (
    <div
      className="flex-1 flex flex-col items-center gap-2 p-3 rounded-2xl cursor-pointer transition-all active:scale-95 min-w-[80px]"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${accent}22`,
      }}
      onClick={handle}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: `${accent}18` }}
      >
        <span style={{ color: accent }}>{icon}</span>
      </div>
      <p className="text-white font-semibold text-xs text-center leading-snug">{title}</p>
      {subtitle && <p className="text-white/40 text-[10px] text-center">{subtitle}</p>}
      {cta && (
        <div className="flex items-center gap-0.5 mt-auto" style={{ color: accent }}>
          <Phone className="w-3 h-3" />
          <span className="text-[10px] font-semibold">{cta}</span>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ArrivalPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/trips/:id/arrival");
  const tripId = params?.id;

  const [trip, setTrip] = useState<TripData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    if (!tripId || !user?.uid) return;
    return onSnapshot(doc(db, "trips", tripId), (snap) => {
      if (!snap.exists()) { setNotFound(true); setLoading(false); return; }
      const data = snap.data() as TripData;
      if (data.userId !== user.uid) { setNotFound(true); setLoading(false); return; }
      setTrip(data);
      setLoading(false);
    });
  }, [tripId, user?.uid]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#060011" }}>
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
      </div>
    );
  }

  if (notFound || !trip) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "#060011" }}>
        <p className="text-white/40">Viagem não encontrada</p>
        <button onClick={() => setLocation("/trips")} className="text-violet-400 text-sm">Voltar</button>
      </div>
    );
  }

  const primary = trip.flights?.[0];
  const dest = trip.destination || primary?.to || "destino";
  const airportCode = primary?.to || dest;
  const airline = primary?.airline || "Companhia aérea";
  const arrGate = trip.flightStatus?.arrival?.gate || trip.gate;
  const arrTerminal = trip.flightStatus?.arrival?.terminal || trip.terminal;
  const baggage = trip.flightStatus?.arrival?.baggage;
  const flightSt = trip.flightStatus?.status;
  const isLanded = flightSt === "landed" || flightSt === "arrived";

  const openHotelRoute = () => {
    if (trip.hotel?.address) {
      window.open(
        `https://maps.google.com/maps?daddr=${encodeURIComponent(trip.hotel.address)}`,
        "_blank",
      );
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(ellipse at 60% 0%, rgba(37,99,235,0.20) 0%, transparent 55%), #060011",
      }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-4 h-14"
        style={{
          background: "rgba(6,0,17,0.9)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocation(`/trips/${tripId}`)}
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <ArrowLeft className="w-4 h-4 text-white/60" />
          </button>
          <p className="text-white font-bold text-base">Acolhimento no Destino</p>
        </div>
        <button
          onClick={() => setLocation("/")}
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(124,58,237,0.15)" }}
        >
          <MessageCircle className="w-4 h-4 text-violet-400" />
        </button>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4 pb-10">
        {/* Arrival banner */}
        <div
          className="rounded-2xl px-5 py-5 text-center"
          style={{
            background: "linear-gradient(135deg, rgba(30,58,138,0.5), rgba(88,28,135,0.4))",
            border: "1px solid rgba(99,102,241,0.3)",
          }}
        >
          <p className="text-4xl mb-2">
            {isLanded ? "🛬" : "✈️"}
          </p>
          <p className="text-white font-extrabold text-2xl">
            {isLanded ? `Pousou em ${dest}!` : `A caminho de ${dest}`}
          </p>
          {primary?.flight && (
            <p className="text-white/50 text-sm mt-1">{primary.flight} · {airline}</p>
          )}
          {isLanded && (
            <p className="text-emerald-400 text-xs font-semibold mt-2 animate-pulse">Voo aterrissado ✔</p>
          )}
        </div>

        {/* Arrival info */}
        <div
          className="rounded-2xl p-4 space-y-2"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Informações de Chegada</p>

          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "rgba(59,130,246,0.15)" }}
            >
              <Plane className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{airline}{primary?.flight ? ` · ${primary.flight}` : ""}</p>
              <p className="text-white/40 text-xs">
                {arrGate ? `Portão ${arrGate}` : "Portão — aguardar"}
                {arrTerminal ? ` · Terminal ${arrTerminal}` : ""}
              </p>
            </div>
          </div>

          {baggage && (
            <div className="flex items-center gap-2 text-xs text-white/50 pl-11">
              <span>🧳 Esteira de bagagem: <span className="text-white/70 font-semibold">{baggage}</span></span>
            </div>
          )}
        </div>

        {/* Route to hotel */}
        {trip.hotel?.name && (
          <>
            <button
              onClick={openHotelRoute}
              className="w-full py-4 rounded-2xl flex items-center justify-center gap-2.5 text-white font-bold transition-all active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, rgba(124,58,237,0.6), rgba(37,99,235,0.5))",
                border: "1px solid rgba(99,102,241,0.4)",
                boxShadow: "0 8px 24px rgba(124,58,237,0.25)",
              }}
            >
              <Navigation className="w-5 h-5" />
              VER ROTA PARA {(trip.hotel.name).toUpperCase()}
            </button>

            {/* Show map toggle */}
            <button
              onClick={() => setShowMap((v) => !v)}
              className="w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                color: "#ffffff60",
              }}
            >
              <Navigation className="w-3.5 h-3.5" />
              {showMap ? "Fechar mapa" : "Ver mapa embutido"}
            </button>

            {showMap && (
              <div className="rounded-2xl overflow-hidden">
                <MapView
                  className="w-full h-[220px]"
                  initialCenter={{ lat: -15.79, lng: -47.88 }}
                  initialZoom={12}
                  onMapReady={async (map) => {
                    if (!trip.hotel?.address || !window.google?.maps) return;
                    new window.google.maps.Geocoder().geocode(
                      { address: trip.hotel.address },
                      (results, status) => {
                        if (status === "OK" && results?.[0]) {
                          const loc = results[0].geometry.location;
                          map.setCenter(loc);
                          map.setZoom(15);
                          new window.google.maps.marker.AdvancedMarkerElement({
                            map,
                            position: loc,
                            title: `🏨 ${trip.hotel?.name}`,
                          });
                        }
                      },
                    );
                  }}
                />
              </div>
            )}
          </>
        )}

        {/* Pro-active concierge tip */}
        <div
          className="rounded-2xl p-4"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
        >
          <div className="flex items-start gap-2.5">
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: "rgba(245,158,11,0.15)" }}
            >
              <Star className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div>
              <p className="text-amber-400 text-[10px] font-bold uppercase tracking-widest mb-1">Pro-Active Tip</p>
              <p className="text-white/80 text-sm leading-relaxed">
                Bem-vindo a {dest}! Peça ao Flyisa sugestões personalizadas — restaurantes próximos, pontos turísticos, ou informações sobre o hotel.
              </p>
              <button
                onClick={() => setLocation("/")}
                className="flex items-center gap-1 text-amber-400 text-xs font-semibold mt-2"
              >
                Abrir chat <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Local transport */}
        <div>
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-3">
            Opções de Transporte Local
          </p>
          <div className="flex gap-2">
            <TransportCard
              icon={<Car className="w-4 h-4" />}
              title="Uber / Lyft"
              subtitle="App no celular"
              accent="#1a73e8"
              href="https://m.uber.com"
            />
            <TransportCard
              icon={<Phone className="w-4 h-4" />}
              title="Táxi"
              subtitle="Chamar no app"
              accent="#f59e0b"
              href="tel:1512"
            />
            <TransportCard
              icon={<Car className="w-4 h-4" />}
              title="Aluguel de Carro"
              subtitle="Locadoras"
              accent="#34d399"
              onPress={() => setLocation("/")}
            />
          </div>
        </div>

        {/* Check-in reminder */}
        {trip.hotel && (
          <div
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)" }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(167,139,250,0.15)" }}
            >
              <BellRing className="w-4 h-4 text-violet-400" />
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">Check-in reminder</p>
              <p className="text-white/50 text-xs">
                {trip.hotel.name}
                {trip.hotel.checkIn ? ` · Entrada a partir das ${trip.hotel.checkIn}` : ""}
                {trip.hotel.confirmation ? ` · Conf: ${trip.hotel.confirmation}` : ""}
              </p>
            </div>
            <button
              onClick={openHotelRoute}
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(167,139,250,0.15)" }}
            >
              <Hotel className="w-4 h-4 text-violet-400" />
            </button>
          </div>
        )}

        {/* Link to experiences */}
        <button
          onClick={() => setLocation("/experiences")}
          className="w-full py-3 rounded-xl text-white/70 text-sm font-semibold flex items-center justify-center gap-2"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <span>🌆</span> Explorar {dest}
          <ChevronRight className="w-4 h-4 text-white/30" />
        </button>
      </main>
    </div>
  );
}
