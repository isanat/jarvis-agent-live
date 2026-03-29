import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { BottomNav } from "@/components/BottomNav";
import { Plane, Hotel, Clock, AlertTriangle, CheckCircle, Loader2, Plus, ChevronRight, History } from "lucide-react";

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

const todayStr = new Date().toISOString().slice(0, 10);

function isTripPast(trip: Trip): boolean {
  // A trip is past if its end date (returnDate or departureDate) is before today
  const end = trip.returnDate || trip.departureDate || "";
  return end !== "" && end < todayStr;
}

export default function TripsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

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

  const upcomingTrips = trips.filter((t) => !isTripPast(t));
  const pastTrips = trips.filter((t) => isTripPast(t));

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
            {loading ? "Carregando..." : `${upcomingTrips.length} próxima${upcomingTrips.length !== 1 ? "s" : ""}`}
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

        {!loading && upcomingTrips.length === 0 && (
          <div
            className="rounded-2xl p-8 flex flex-col items-center text-center gap-3 mt-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <Plane className="w-10 h-10 text-white/15" />
            <p className="text-white/60 font-semibold text-sm">Nenhuma viagem próxima</p>
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

        {upcomingTrips.map((trip) => {
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

        {/* ── Histórico de viagens passadas ── */}
        {!loading && pastTrips.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="flex items-center gap-2 w-full px-1 py-2 text-left"
            >
              <History className="w-3.5 h-3.5 text-white/30" />
              <span className="text-white/30 text-xs font-medium">
                Histórico ({pastTrips.length} viagem{pastTrips.length !== 1 ? "s" : ""} passada{pastTrips.length !== 1 ? "s" : ""})
              </span>
              <ChevronRight
                className="w-3.5 h-3.5 text-white/20 ml-auto transition-transform"
                style={{ transform: showHistory ? "rotate(90deg)" : "none" }}
              />
            </button>

            {showHistory && (
              <div className="flex flex-col gap-2.5 mt-1 opacity-60">
                {pastTrips.map((trip) => {
                  const primary = trip.flights?.[0];
                  const title = trip.destination || trip.route || (primary ? `${primary.from} → ${primary.to}` : "Viagem");
                  return (
                    <button
                      key={trip.id}
                      onClick={() => setLocation(`/trips/${trip.id}`)}
                      className="w-full rounded-2xl p-4 text-left transition-all active:scale-[0.98]"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-white/60 font-semibold text-[13px] truncate">{title}</p>
                          <p className="text-white/25 text-[11px] mt-0.5">
                            {trip.departureDate}{trip.returnDate && trip.returnDate !== trip.departureDate ? ` → ${trip.returnDate}` : ""}
                          </p>
                        </div>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0"
                          style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.35)" }}>
                          Concluída
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNav active="trips" />
    </div>
  );
}
