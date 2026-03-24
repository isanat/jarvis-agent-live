import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { BottomNav } from "@/components/BottomNav";
import { Plane, Hotel, Clock, AlertTriangle, CheckCircle, Loader2, Plus, ChevronRight } from "lucide-react";

interface TripFlight {
  flight: string;
  from: string;
  to: string;
  date: string;
  depart?: string;
  arrive?: string;
}

interface Trip {
  id: string;
  destination?: string;
  route?: string;
  status?: string;
  departureDate?: string;
  returnDate?: string;
  flightStatus?: { status?: string; departure?: { gate?: string; terminal?: string; delay?: number } };
  flights?: TripFlight[];
  hotel?: { name?: string; checkIn?: string; checkOut?: string };
  gate?: string;
  terminal?: string;
}

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  upcoming:  { label: "Próxima",       color: "#60a5fa", bg: "rgba(59,130,246,0.15)"  },
  active:    { label: "Em andamento",  color: "#34d399", bg: "rgba(52,211,153,0.15)"  },
  past:      { label: "Concluída",     color: "#ffffff40", bg: "rgba(255,255,255,0.07)" },
  cancelled: { label: "Cancelada",     color: "#ef4444", bg: "rgba(239,68,68,0.15)"   },
};

export default function TripsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, "trips"),
      where("userId", "==", user.uid),
      orderBy("departureDate", "desc"),
    );
    return onSnapshot(q, (snap) => {
      setTrips(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Trip, "id">) })));
      setLoading(false);
    });
  }, [user?.uid]);

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 70% 10%, rgba(59,130,246,0.10) 0%,transparent 50%), radial-gradient(ellipse at 20% 90%, rgba(124,58,237,0.10) 0%,transparent 50%), #060011",
      }}
    >
      {/* Header */}
      <header
        className="pt-safe shrink-0 flex items-center justify-between px-4 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div>
          <p className="text-white font-extrabold text-xl">Minhas Viagens</p>
          <p className="text-white/40 text-xs mt-0.5">
            {loading ? "Carregando..." : `${trips.length} viagem${trips.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={() => setLocation("/documents")}
          className="w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90"
          style={{ background: "rgba(124,58,237,0.25)", border: "1px solid rgba(124,58,237,0.4)" }}
          title="Enviar documentos de viagem"
        >
          <Plus className="w-4 h-4 text-violet-300" />
        </button>
      </header>

      {/* List */}
      <div className="flex-1 overflow-y-auto pb-20 pt-3 space-y-2.5 px-4" style={{ scrollbarWidth: "none" }}>
        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-violet-400" />
          </div>
        )}

        {!loading && trips.length === 0 && (
          <div
            className="rounded-2xl p-8 flex flex-col items-center text-center gap-3 mt-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <Plane className="w-10 h-10 text-white/15" />
            <p className="text-white/60 font-semibold text-sm">Nenhuma viagem cadastrada</p>
            <p className="text-white/30 text-xs leading-relaxed">
              Envie um e-ticket ou itinerário para o chat e a Flyisa cadastra automaticamente
            </p>
            <button
              onClick={() => setLocation("/")}
              className="mt-1 px-5 py-2 rounded-xl text-sm font-semibold text-violet-300 transition-all active:scale-95"
              style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.3)" }}
            >
              Abrir chat
            </button>
          </div>
        )}

        {trips.map((trip) => {
          const primary = trip.flights?.[0];
          const fs = trip.flightStatus;
          const delay = fs?.departure?.delay || 0;
          const st = STATUS[trip.status || "upcoming"] ?? STATUS.upcoming;
          const hasAlert = delay >= 15 || fs?.status === "cancelled";
          const title = trip.destination || trip.route || (primary ? `${primary.from} → ${primary.to}` : "Viagem");

          return (
            <button
              key={trip.id}
              onClick={() => setLocation(`/trips/${trip.id}`)}
              className="w-full rounded-2xl p-4 text-left transition-all active:scale-[0.98]"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: hasAlert
                  ? "1px solid rgba(249,115,22,0.35)"
                  : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {/* Row 1: title + status + arrow */}
              <div className="flex items-start gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-[15px] leading-snug truncate">{title}</p>
                  {trip.departureDate && (
                    <p className="text-white/35 text-[11px] mt-0.5">{trip.departureDate}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: st.bg, color: st.color }}
                  >
                    {st.label}
                  </span>
                  {hasAlert ? (
                    <AlertTriangle className="w-4 h-4 text-orange-400" />
                  ) : fs?.status === "active" || fs?.status === "en-route" ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-white/20" />
                  )}
                </div>
              </div>

              {/* Row 2: details */}
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {primary && (
                  <span className="flex items-center gap-1 text-[11px] text-white/45">
                    <Plane className="w-3 h-3" />
                    {primary.flight} · {primary.from} → {primary.to}
                  </span>
                )}
                {(trip.gate || fs?.departure?.gate) && (
                  <span className="flex items-center gap-1 text-[11px] text-white/45">
                    <Clock className="w-3 h-3" />
                    Portão {trip.gate || fs?.departure?.gate}
                  </span>
                )}
                {trip.hotel?.name && (
                  <span className="flex items-center gap-1 text-[11px] text-white/45">
                    <Hotel className="w-3 h-3" />
                    {trip.hotel.name}
                  </span>
                )}
                {delay >= 15 && (
                  <span className="flex items-center gap-1 text-[11px] text-orange-400 font-semibold">
                    <AlertTriangle className="w-3 h-3" />
                    +{delay} min
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <BottomNav active="trips" />
    </div>
  );
}
