/**
 * FeedPage — Smart Travel Feed
 * Tela principal do tipo "Feed de Viagens Smart" da imagem de referência.
 *
 * Mostra em ordem:
 *  1. Cabeçalho "Jarvis, seu Concierge" + status do voo ativo
 *  2. Card de status do voo em tempo real (flight tracker)
 *  3. Alertas/notificações não lidas
 *  4. Sugestões proativas (janta, clima, rota hotel)
 *  5. Atalhos rápidos para todas as telas
 */

import { useEffect, useState, useCallback } from "react";
import { collection, query, where, orderBy, limit, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { BottomNav } from "@/components/BottomNav";
import { getFlightStatus, getWeather, weatherCodeLabel, type FlightStatusResult, type WeatherResult } from "@/lib/api";
import { Loader2, Plane, Hotel, AlertTriangle, Sparkles, Map, ChevronRight, CloudSun, Luggage, FileText, ArrowRight, BellRing, Info } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TripData {
  id: string;
  destination?: string;
  route?: string;
  status?: string;
  departureDate?: string;
  flights?: Array<{ flight: string; from: string; to: string; date: string; depart?: string; arrive?: string }>;
  hotel?: { name?: string; address?: string; checkIn?: string };
  flightStatus?: { status?: string; departure?: { gate?: string; terminal?: string; delay?: number } };
}

interface Notification {
  id: string;
  title: string;
  message: string;
  severity?: string;
  type?: string;
  read?: boolean;
  createdAt?: { seconds: number } | null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Pill({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: `${color}22`, color }}
    >
      {children}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold tracking-widest uppercase text-white/30 px-4 mb-1 mt-4">
      {children}
    </p>
  );
}

// Flight status card — the big card at top of feed
function FlightCard({
  trip,
  status,
  loading,
}: {
  trip: TripData;
  status: FlightStatusResult | null;
  loading: boolean;
}) {
  const [, setLocation] = useLocation();
  const primary = trip.flights?.[0];
  const flightNum = status?.flightNumber || primary?.flight || "—";
  const from = status?.origin || primary?.from || "—";
  const to = status?.destination || primary?.to || "—";
  const delay = status?.delay || trip.flightStatus?.departure?.delay || 0;
  const gate = status?.gate || trip.flightStatus?.departure?.gate;
  const flightSt = status?.status || trip.flightStatus?.status;
  const isCancelled = flightSt === "cancelled";
  const isDelayed = delay >= 15;

  const statusColor = isCancelled ? "#ef4444" : isDelayed ? "#f97316" : "#34d399";
  const statusLabel = isCancelled ? "Cancelado" : isDelayed ? `+${delay}min` : flightSt || "Agendado";

  return (
    <div
      className="mx-4 rounded-2xl p-4 cursor-pointer"
      style={{
        background: "linear-gradient(135deg, rgba(30,58,138,0.6) 0%, rgba(88,28,135,0.4) 100%)",
        border: "1px solid rgba(99,102,241,0.3)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
      }}
      onClick={() => setLocation(`/trips/${trip.id}`)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Plane className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold text-white/60 tracking-wider uppercase">Dashboard</span>
        </div>
        <Pill color={statusColor}>{statusLabel}</Pill>
      </div>

      {/* Flight row */}
      <div className="flex items-center gap-3 mb-3">
        {/* Airline logo placeholder */}
        <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
          <Plane className="w-4 h-4 text-blue-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-base">{flightNum}</p>
          <p className="text-white/50 text-xs">{status?.airline || "Companhia aérea"}</p>
        </div>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-white/30" />}
      </div>

      {/* Route */}
      <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
        <div className="text-center min-w-[40px]">
          <p className="text-white font-bold text-lg">{from}</p>
          <p className="text-white/40 text-[10px]">{primary?.depart || "—"}</p>
        </div>
        <div className="flex-1 flex flex-col items-center gap-0.5">
          <div className="w-full flex items-center gap-1">
            <div className="h-px flex-1 bg-white/20" />
            <Plane className="w-3 h-3 text-blue-400 rotate-90" style={{ transform: "rotate(0deg)" }} />
            <div className="h-px flex-1 bg-white/20" />
          </div>
          {status?.estimated && (
            <p className="text-[10px] text-amber-400 font-medium">ETA: {status.estimated}</p>
          )}
        </div>
        <div className="text-center min-w-[40px]">
          <p className="text-white font-bold text-lg">{to}</p>
          <p className="text-white/40 text-[10px]">{primary?.arrive || "—"}</p>
        </div>
      </div>

      {/* Gate/terminal info */}
      {(gate || status?.terminal) && (
        <div className="flex gap-3 mt-2">
          {gate && (
            <div className="flex items-center gap-1">
              <span className="text-white/40 text-[11px]">Portão</span>
              <span className="text-white font-bold text-[11px]">{gate}</span>
            </div>
          )}
          {status?.terminal && (
            <div className="flex items-center gap-1">
              <span className="text-white/40 text-[11px]">Terminal</span>
              <span className="text-white font-bold text-[11px]">{status.terminal}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Individual feed item card
function FeedItem({
  icon,
  accent,
  label,
  title,
  body,
  photoUrl,
  onClick,
}: {
  icon: React.ReactNode;
  accent: string;
  label: string;
  title: string;
  body?: string;
  photoUrl?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className="mx-4 rounded-2xl p-3 flex gap-3 cursor-pointer transition-all active:scale-[0.98]"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
      onClick={onClick}
    >
      {/* Icon column */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${accent}22` }}
      >
        <span style={{ color: accent }}>{icon}</span>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: `${accent}cc` }}>
          {label}
        </p>
        <p className="text-white font-semibold text-sm leading-snug">{title}</p>
        {body && <p className="text-white/50 text-xs leading-relaxed mt-0.5 line-clamp-2">{body}</p>}
      </div>

      {/* Optional photo */}
      {photoUrl && (
        <div
          className="w-14 h-14 rounded-xl shrink-0 bg-white/5"
          style={{ backgroundImage: `url(${photoUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}
        />
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FeedPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [activeTrip, setActiveTrip] = useState<TripData | null>(null);
  const [flightStatus, setFlightStatus] = useState<FlightStatusResult | null>(null);
  const [flightLoading, setFlightLoading] = useState(false);
  const [weather, setWeather] = useState<WeatherResult | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);

  // Get user location
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  // Load weather when location available
  useEffect(() => {
    if (!userLat || !userLng) return;
    getWeather(userLat, userLng).then(setWeather);
  }, [userLat, userLng]);

  // Active trip subscription
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, "trips"),
      where("userId", "==", user.uid),
      where("status", "in", ["active", "upcoming"]),
      orderBy("departureDate", "asc"),
      limit(1),
    );
    return onSnapshot(q, (snap) => {
      if (!snap.empty) setActiveTrip({ id: snap.docs[0].id, ...snap.docs[0].data() } as TripData);
      else setActiveTrip(null);
    });
  }, [user?.uid]);

  // Fetch live flight status when trip loads
  const fetchFlight = useCallback(async () => {
    const fn = activeTrip?.flights?.[0]?.flight;
    if (!fn) return;
    setFlightLoading(true);
    const result = await getFlightStatus(fn, activeTrip?.flights?.[0]?.date);
    setFlightStatus(result);
    setFlightLoading(false);
  }, [activeTrip]);

  useEffect(() => { fetchFlight(); }, [fetchFlight]);

  // Recent unread notifications
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(5),
    );
    getDocs(q).then((snap) => {
      setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification)));
    });
  }, [user?.uid]);

  if (!user) return null;

  const cw = weather?.weather?.current_weather;
  const { label: wxLabel, emoji: wxEmoji } = weatherCodeLabel(cw?.weathercode);
  const unread = notifications.filter((n) => !n.read);

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 80% 10%, rgba(124,58,237,0.18) 0%,transparent 55%), radial-gradient(ellipse at 20% 90%, rgba(37,99,235,0.12) 0%,transparent 55%), #060011",
      }}
    >
      {/* Header */}
      <header
        className="pt-safe shrink-0 flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div>
          <p className="text-white font-extrabold text-lg leading-none">Flyisa</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] text-emerald-400 font-medium">Concierge ativo</span>
          </div>
        </div>
        {activeTrip && (
          <div
            className="px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer"
            style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)" }}
            onClick={() => setLocation(`/trips/${activeTrip.id}`)}
          >
            <Plane className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-xs font-semibold text-indigo-300 max-w-[100px] truncate">
              {activeTrip.destination || activeTrip.route || "Viagem ativa"}
            </span>
          </div>
        )}
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-20 space-y-2 pt-3" style={{ scrollbarWidth: "none" }}>

        {/* Next step banner */}
        {activeTrip?.flights?.[0] && (
          <div
            className="mx-4 rounded-xl px-4 py-2 flex items-center gap-2"
            style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)" }}
          >
            <Plane className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <p className="text-xs font-bold text-indigo-300 tracking-wider uppercase">
              Próxima Etapa: VOO {activeTrip.flights[0].flight}
            </p>
          </div>
        )}

        {/* Flight card */}
        {activeTrip && (
          <FlightCard trip={activeTrip} status={flightStatus} loading={flightLoading} />
        )}

        {/* No active trip */}
        {!activeTrip && (
          <div className="mx-4 rounded-2xl p-5 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <Plane className="w-8 h-8 mx-auto mb-2 text-white/20" />
            <p className="text-white/60 text-sm font-medium">Nenhuma viagem ativa</p>
            <p className="text-white/30 text-xs mt-1">Peça ao Flyisa para criar ou ative uma viagem</p>
            <button
              onClick={() => setLocation("/")}
              className="mt-3 px-4 py-1.5 rounded-xl text-xs font-semibold text-violet-300"
              style={{ background: "rgba(124,58,237,0.2)" }}
            >
              Abrir chat
            </button>
          </div>
        )}

        {/* Alerts section */}
        {unread.length > 0 && (
          <>
            <SectionLabel>Alertas</SectionLabel>
            {unread.slice(0, 3).map((n) => {
              const isUrgent = n.severity === "critical" || n.severity === "urgent";
              return (
                <FeedItem
                  key={n.id}
                  icon={isUrgent ? <AlertTriangle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                  accent={isUrgent ? "#ef4444" : "#3b82f6"}
                  label={n.severity || "Info"}
                  title={n.title}
                  body={n.message}
                />
              );
            })}
          </>
        )}

        {/* Weather suggestion */}
        {cw && (
          <>
            <SectionLabel>Clima</SectionLabel>
            <FeedItem
              icon={<span className="text-base">{wxEmoji}</span>}
              accent="#f59e0b"
              label="Dica"
              title={`${wxEmoji} ${Math.round(cw.temperature)}°C — ${wxLabel}`}
              body={`Vento: ${Math.round(cw.windspeed)} km/h. ${cw.is_day ? "Agora é dia." : "Agora é noite."}`}
              onClick={() => activeTrip && setLocation(`/experiences?tripId=${activeTrip.id}`)}
            />
          </>
        )}

        {/* Suggestions */}
        <SectionLabel>Sugestões</SectionLabel>

        {activeTrip?.hotel && (
          <FeedItem
            icon={<Hotel className="w-4 h-4" />}
            accent="#a78bfa"
            label="Sugestão"
            title={`Rota para o ${activeTrip.hotel.name || "Hotel"}`}
            body="Ver direções do aeroporto até o hotel com tempo estimado."
            onClick={() => setLocation(`/trips/${activeTrip.id}`)}
          />
        )}

        <FeedItem
          icon={<Sparkles className="w-4 h-4" />}
          accent="#f59e0b"
          label="Sugestão de Jantar"
          title="Restaurantes próximos"
          body="Ver os melhores restaurantes com boa avaliação perto de você agora."
          onClick={() => setLocation("/experiences")}
        />

        <FeedItem
          icon={<Map className="w-4 h-4" />}
          accent="#34d399"
          label="Dica"
          title="Explorar o destino"
          body="Farmácias 24h, cafés, pontos turísticos e mais na sua região."
          onClick={() => setLocation("/experiences")}
        />

        {/* Shortcuts */}
        <SectionLabel>Acesso Rápido</SectionLabel>
        <div className="mx-4 grid grid-cols-2 gap-2">
          {[
            { icon: <Luggage className="w-4 h-4" />, label: "Bagagem", path: activeTrip ? `/trips/${activeTrip.id}` : "/trips", color: "#60a5fa" },
            { icon: <FileText className="w-4 h-4" />, label: "Documentos", path: activeTrip ? `/trips/${activeTrip.id}/documents` : "/trips", color: "#34d399" },
            { icon: <Map className="w-4 h-4" />, label: "Mapa", path: "/map", color: "#f59e0b" },
            { icon: <BellRing className="w-4 h-4" />, label: "Alertas", path: "/", color: "#f97316" },
          ].map(({ icon, label, path, color }) => (
            <button
              key={label}
              onClick={() => setLocation(path)}
              className="flex items-center gap-2 p-3 rounded-xl transition-all active:scale-95"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <span style={{ color }}>{icon}</span>
              <span className="text-white/70 text-xs font-medium">{label}</span>
              <ArrowRight className="w-3 h-3 text-white/20 ml-auto" />
            </button>
          ))}
        </div>

      </div>

      <BottomNav active="feed" />
    </div>
  );
}
