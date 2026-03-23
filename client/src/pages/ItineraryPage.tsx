/**
 * ItineraryPage — Resumo e Itinerário
 * Tela de itinerário dia-a-dia baseada nos dados da viagem.
 * Fiel à tela "Resumo e Itinerário" da imagem de referência.
 *
 * Route: /trips/:id/itinerary
 */

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plane, Hotel, Utensils, Luggage, Star, Clock, MapPin, MessageCircle, Loader2, Calendar } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TripData {
  userId?: string;
  destination?: string;
  route?: string;
  status?: string;
  departureDate?: string;
  returnDate?: string;
  flights?: Array<{
    flight: string; from: string; to: string;
    date: string; depart?: string; arrive?: string; airline?: string; seat?: string; pnr?: string;
  }>;
  hotel?: { name?: string; address?: string; checkIn?: string; checkOut?: string; confirmation?: string; stars?: number };
  passengers?: string[];
  baggage?: Array<{ type?: string; weight?: string }>;
  insurance?: { provider?: string; policyNumber?: string };
  itinerary?: Array<{
    day: number;
    date?: string;
    title?: string;
    items: Array<{ type: string; title: string; detail?: string; time?: string; photo?: string; confirmed?: boolean }>;
  }>;
  notes?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDate(s?: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function fmtDate(s?: string): string {
  const d = parseDate(s);
  if (!d) return s || "—";
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" });
}

/** Build a day-by-day structure from raw trip data */
function buildItinerary(trip: TripData): Array<{
  day: number;
  dateStr: string;
  label: string;
  items: Array<{ icon: React.ReactNode; title: string; detail?: string; time?: string; confirmed?: boolean; accent: string }>;
}> {
  const days: ReturnType<typeof buildItinerary> = [];

  // If trip already has a stored itinerary, use it
  if (trip.itinerary && trip.itinerary.length > 0) {
    return trip.itinerary.map((d) => ({
      day: d.day,
      dateStr: fmtDate(d.date),
      label: d.title || `Dia ${d.day}`,
      items: d.items.map((item) => {
        const icon =
          item.type === "flight" ? <Plane className="w-3.5 h-3.5" /> :
          item.type === "hotel" ? <Hotel className="w-3.5 h-3.5" /> :
          item.type === "meal" ? <Utensils className="w-3.5 h-3.5" /> :
          <MapPin className="w-3.5 h-3.5" />;
        const accent =
          item.type === "flight" ? "#60a5fa" :
          item.type === "hotel" ? "#a78bfa" :
          item.type === "meal" ? "#f59e0b" : "#34d399";
        return { icon, title: item.title, detail: item.detail, time: item.time, confirmed: item.confirmed, accent };
      }),
    }));
  }

  // Otherwise build from flights + hotel
  const depDate = parseDate(trip.flights?.[0]?.date || trip.departureDate);
  const retDate = parseDate(trip.returnDate);

  if (!depDate) return [];

  const totalDays = retDate
    ? Math.max(1, Math.round((retDate.getTime() - depDate.getTime()) / 86400000) + 1)
    : trip.flights?.length || 1;

  for (let i = 0; i < Math.min(totalDays, 10); i++) {
    const date = new Date(depDate.getTime() + i * 86400000);
    const dateStr = date.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" });

    const items: (typeof days)[0]["items"] = [];
    const isFirst = i === 0;
    const isLast = i === totalDays - 1;

    // Departure flight on day 1
    const depFlight = trip.flights?.find((f) => {
      const fd = parseDate(f.date);
      return fd && fd.toDateString() === date.toDateString();
    });

    if (depFlight) {
      items.push({
        icon: <Plane className="w-3.5 h-3.5" />,
        title: `Voo ${depFlight.flight} · ${depFlight.from} → ${depFlight.to}`,
        detail: depFlight.pnr ? `PNR: ${depFlight.pnr}` : undefined,
        time: depFlight.depart,
        confirmed: !!depFlight.pnr,
        accent: "#60a5fa",
      });
    }

    // Hotel check-in on day 1 (or when checkIn date matches)
    if (trip.hotel?.name && isFirst) {
      items.push({
        icon: <Hotel className="w-3.5 h-3.5" />,
        title: trip.hotel.name,
        detail: `Check-in: ${trip.hotel.checkIn || "—"} · Conf: ${trip.hotel.confirmation || "—"}`,
        time: trip.hotel.checkIn,
        confirmed: !!trip.hotel.confirmation,
        accent: "#a78bfa",
      });
    }

    // Hotel check-out on last day
    if (trip.hotel?.name && isLast && totalDays > 1) {
      items.push({
        icon: <Hotel className="w-3.5 h-3.5" />,
        title: `Check-out · ${trip.hotel.name}`,
        detail: `Saída: ${trip.hotel.checkOut || "—"}`,
        time: trip.hotel.checkOut,
        confirmed: !!trip.hotel.confirmation,
        accent: "#a78bfa",
      });
    }

    // Placeholder for activities if no items were added
    if (items.length === 0) {
      items.push({
        icon: <MapPin className="w-3.5 h-3.5" />,
        title: "Dia livre em " + (trip.destination || "destino"),
        detail: "Peça ao Flyisa sugestões para hoje",
        confirmed: false,
        accent: "#34d399",
      });
    }

    days.push({
      day: i + 1,
      dateStr,
      label: isFirst ? "Partida" : isLast ? "Retorno" : `Dia ${i + 1} em ${trip.destination || "destino"}`,
      items,
    });
  }

  return days;
}

// ─── Components ───────────────────────────────────────────────────────────────

function TimelineItem({
  icon,
  title,
  detail,
  time,
  confirmed,
  accent,
  isLast,
}: {
  icon: React.ReactNode;
  title: string;
  detail?: string;
  time?: string;
  confirmed?: boolean;
  accent: string;
  isLast: boolean;
}) {
  return (
    <div className="flex gap-3">
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
          style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}44` }}
        >
          {icon}
        </div>
        {!isLast && <div className="w-px flex-1 mt-1" style={{ background: "rgba(255,255,255,0.08)" }} />}
      </div>

      {/* Content */}
      <div className={`pb-4 min-w-0 flex-1 ${isLast ? "" : "border-b border-white/5"}`}>
        <div className="flex items-start justify-between gap-2">
          <p className="text-white font-semibold text-sm leading-snug">{title}</p>
          {time && (
            <span className="text-white/40 text-[11px] flex items-center gap-0.5 shrink-0">
              <Clock className="w-3 h-3" />{time}
            </span>
          )}
        </div>
        {detail && <p className="text-white/40 text-xs mt-0.5 leading-relaxed">{detail}</p>}
        {confirmed !== undefined && (
          <span
            className="inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded"
            style={{
              background: confirmed ? "rgba(52,211,153,0.1)" : "rgba(255,255,255,0.05)",
              color: confirmed ? "#34d399" : "#ffffff50",
            }}
          >
            {confirmed ? "✔ Confirmado" : "Sem confirmação"}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ItineraryPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/trips/:id/itinerary");
  const tripId = params?.id;

  const [trip, setTrip] = useState<TripData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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
        <Button onClick={() => setLocation("/trips")}>Voltar</Button>
      </div>
    );
  }

  const itinerary = buildItinerary(trip);
  const title = trip.destination || trip.route || "Resumo da Viagem";
  const hotelStars = trip.hotel?.stars || 0;

  return (
    <div className="min-h-screen" style={{ background: "#060011" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-4 h-14"
        style={{ background: "rgba(6,0,17,0.95)", borderBottom: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(12px)" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocation(`/trips/${tripId}`)}
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <ArrowLeft className="w-4 h-4 text-white/60" />
          </button>
          <div>
            <p className="text-white font-bold text-base leading-none">Resumo da Viagem</p>
            <p className="text-white/40 text-[11px] mt-0.5">{title}</p>
          </div>
        </div>
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-violet-300"
          style={{ background: "rgba(124,58,237,0.15)" }}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Chat
        </button>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-5 pb-10">
        {/* Hotel summary card */}
        {trip.hotel?.name && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {/* Hotel "photo" placeholder */}
            <div
              className="h-28 w-full flex items-end p-3"
              style={{
                background: "linear-gradient(135deg, rgba(88,28,135,0.6), rgba(30,58,138,0.6))",
              }}
            >
              <div>
                <p className="text-white font-bold text-base">{trip.hotel.name}</p>
                {hotelStars > 0 && (
                  <div className="flex mt-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${i < hotelStars ? "text-amber-400 fill-amber-400" : "text-white/20"}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="p-3 space-y-1">
              {trip.hotel.address && (
                <div className="flex items-center gap-1.5 text-xs text-white/50">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  {trip.hotel.address}
                </div>
              )}
              <div className="flex gap-4 text-xs text-white/50">
                {trip.hotel.checkIn && (
                  <span>Check-in: <span className="text-white/70 font-medium">{trip.hotel.checkIn}</span></span>
                )}
                {trip.hotel.checkOut && (
                  <span>Check-out: <span className="text-white/70 font-medium">{trip.hotel.checkOut}</span></span>
                )}
              </div>
              {trip.hotel.confirmation && (
                <p className="text-[11px] text-emerald-400/70">
                  ✔ Detalhes da reserva confirmada
                </p>
              )}
            </div>
          </div>
        )}

        {/* Day-by-day itinerary */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-violet-400" />
            <p className="text-white font-bold text-base">Itinerário em {trip.destination || "destino"}</p>
          </div>

          {itinerary.length === 0 ? (
            <div
              className="rounded-2xl p-5 text-center"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <Calendar className="w-8 h-8 mx-auto mb-2 text-white/20" />
              <p className="text-white/50 text-sm">Nenhum itinerário ainda</p>
              <p className="text-white/30 text-xs mt-1">Peça ao Flyisa para criar um roteiro personalizado</p>
              <button
                onClick={() => setLocation("/")}
                className="mt-3 px-4 py-1.5 rounded-xl text-xs font-semibold text-violet-300"
                style={{ background: "rgba(124,58,237,0.15)" }}
              >
                Criar itinerário
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {itinerary.map((day) => (
                <div key={day.day}>
                  {/* Day header */}
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold text-violet-300 shrink-0"
                      style={{ background: "rgba(124,58,237,0.2)" }}
                    >
                      {day.day}
                    </div>
                    <div>
                      <p className="text-white/80 font-semibold text-sm leading-none">{day.label}</p>
                      <p className="text-white/30 text-[11px] mt-0.5">{day.dateStr}</p>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="pl-2">
                    {day.items.map((item, i) => (
                      <TimelineItem
                        key={i}
                        icon={item.icon}
                        title={item.title}
                        detail={item.detail}
                        time={item.time}
                        confirmed={item.confirmed}
                        accent={item.accent}
                        isLast={i === day.items.length - 1}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={() => setLocation("/")}
          className="w-full py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2"
          style={{
            background: "linear-gradient(135deg, rgba(124,58,237,0.5), rgba(37,99,235,0.5))",
            border: "1px solid rgba(99,102,241,0.3)",
          }}
        >
          <MessageCircle className="w-4 h-4" />
          VER ITINERÁRIO COMPLETO COM FLYISA
        </button>
      </main>
    </div>
  );
}
