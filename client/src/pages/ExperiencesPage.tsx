/**
 * ExperiencesPage — Curadoria de Experiências
 * Tela de descoberta de lugares próximos usando /api/nearby (Google Places + TomTom fallback).
 *
 * Categorias: restaurant, cafe, museum, pharmacy, bar, shopping, park
 * Carrossel de cards com foto, nome, avaliação, distância, status aberto/fechado.
 */

import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { BottomNav } from "@/components/BottomNav";
import { getNearby, type Place } from "@/lib/api";
import { Loader2, Star, MapPin, ChevronRight, Navigation } from "lucide-react";

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: "restaurant", label: "Restaurantes", emoji: "🍽️" },
  { key: "cafe",       label: "Cafés",         emoji: "☕" },
  { key: "bar",        label: "Bares",          emoji: "🍸" },
  { key: "museum",     label: "Museus",          emoji: "🏛️" },
  { key: "pharmacy",   label: "Farmácias",       emoji: "💊" },
  { key: "shopping",   label: "Compras",         emoji: "🛍️" },
  { key: "park",       label: "Parques",         emoji: "🌿" },
  { key: "hotel",      label: "Hotéis",          emoji: "🏨" },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];

// ─── Place row (compact list item) ───────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  restaurant: "rgba(251,146,60,0.25)",
  cafe:       "rgba(251,191,36,0.22)",
  bar:        "rgba(167,139,250,0.22)",
  museum:     "rgba(96,165,250,0.22)",
  pharmacy:   "rgba(52,211,153,0.22)",
  shopping:   "rgba(244,114,182,0.22)",
  park:       "rgba(34,197,94,0.22)",
  hotel:      "rgba(124,58,237,0.22)",
};

function PlaceRow({ place, categoryKey, emoji }: { place: Place; categoryKey: string; emoji: string }) {
  const openInMaps = () => {
    const q = place.name + (place.address ? `, ${place.address}` : "");
    window.open(`https://maps.google.com/?q=${encodeURIComponent(q)}`, "_blank");
  };

  const distLabel = place.distance
    ? place.distance < 1000
      ? `${Math.round(place.distance)} m`
      : `${(place.distance / 1000).toFixed(1)} km`
    : null;

  const iconBg = CATEGORY_COLORS[categoryKey] || "rgba(124,58,237,0.22)";

  return (
    <button
      onClick={openInMaps}
      className="w-full flex items-center gap-3 px-4 py-3 transition-all active:scale-[0.98] text-left"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
    >
      {/* Icon circle */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
        style={{ background: iconBg }}
      >
        {emoji}
      </div>

      {/* Name + address */}
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-[13px] leading-snug truncate">{place.name}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {place.rating ? (
            <span className="flex items-center gap-0.5 text-[11px] text-amber-400 font-semibold">
              <Star className="w-2.5 h-2.5 fill-amber-400" />
              {place.rating.toFixed(1)}
            </span>
          ) : null}
          {distLabel && (
            <span className="flex items-center gap-0.5 text-[11px] text-white/35">
              <Navigation className="w-2.5 h-2.5" />
              {distLabel}
              {place.walkMinutes ? ` · ${place.walkMinutes} min` : ""}
            </span>
          )}
        </div>
      </div>

      {/* Open/closed pill */}
      {place.openNow !== undefined && (
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
          style={{
            background: place.openNow ? "rgba(52,211,153,0.15)" : "rgba(239,68,68,0.15)",
            color: place.openNow ? "#34d399" : "#ef4444",
          }}
        >
          {place.openNow ? "Aberto" : "Fechado"}
        </span>
      )}

      <ChevronRight className="w-3.5 h-3.5 text-white/20 shrink-0" />
    </button>
  );
}

// ─── Section with vertical list ──────────────────────────────────────────────

function PlacesSection({
  emoji,
  label,
  places,
  loading,
  categoryKey,
}: {
  emoji: string;
  label: string;
  places: Place[];
  loading: boolean;
  categoryKey: string;
}) {
  return (
    <div
      className="mx-4 rounded-2xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      {/* Section header */}
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="text-base">{emoji}</span>
        <p className="text-white font-bold text-sm flex-1">{label}</p>
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-white/30" />}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 gap-2 text-white/30 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Buscando...
        </div>
      ) : places.length === 0 ? (
        <p className="px-4 py-6 text-white/25 text-sm text-center">Nenhum lugar encontrado</p>
      ) : (
        <div>
          {places.map((p, i) => (
            <PlaceRow key={p.placeId || p.name + i} place={p} categoryKey={categoryKey} emoji={emoji} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ExperiencesPage() {
  const [, setLocation] = useLocation();
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locLoading, setLocLoading] = useState(true);
  const [locError, setLocError] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("restaurant");
  const [placesByCategory, setPlacesByCategory] = useState<Partial<Record<CategoryKey, Place[]>>>({});
  const [loadingCategory, setLoadingCategory] = useState<Set<CategoryKey>>(new Set());

  // Get location
  useEffect(() => {
    if (!navigator.geolocation) { setLocError(true); setLocLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocLoading(false);
      },
      () => { setLocError(true); setLocLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  // Fetch places for a category
  const fetchCategory = useCallback(
    async (cat: CategoryKey) => {
      if (!lat || !lng) return;
      if (placesByCategory[cat] !== undefined) return; // already loaded
      setLoadingCategory((prev) => new Set(prev).add(cat));
      const result = await getNearby(lat, lng, cat, 2000);
      setPlacesByCategory((prev) => ({ ...prev, [cat]: result.places }));
      setLoadingCategory((prev) => { const s = new Set(prev); s.delete(cat); return s; });
    },
    [lat, lng, placesByCategory],
  );

  // Auto-fetch when location ready
  useEffect(() => {
    if (lat && lng) fetchCategory(activeCategory);
  }, [lat, lng, activeCategory, fetchCategory]);

  // Also pre-load restaurant, cafe, pharmacy on mount
  useEffect(() => {
    if (!lat || !lng) return;
    (["restaurant", "cafe", "pharmacy"] as CategoryKey[]).forEach((c) => fetchCategory(c));
  }, [lat, lng, fetchCategory]);

  const handleCategoryChange = (cat: CategoryKey) => {
    setActiveCategory(cat);
    fetchCategory(cat);
  };

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 70% 10%, rgba(16,185,129,0.10) 0%,transparent 50%), radial-gradient(ellipse at 20% 90%, rgba(37,99,235,0.10) 0%,transparent 50%), #060011",
      }}
    >
      {/* Header */}
      <header
        className="pt-safe shrink-0 px-4 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <p className="text-white font-extrabold text-xl">Explorar</p>
        <p className="text-white/40 text-xs mt-0.5">
          {locLoading
            ? "Detectando localização..."
            : locError
            ? "Localização não disponível — use o GPS"
            : "Baseado na sua localização atual"}
        </p>
      </header>

      {/* Category chips */}
      <div
        className="flex gap-2 overflow-x-auto px-4 py-3 shrink-0"
        style={{ scrollbarWidth: "none" }}
      >
        {CATEGORIES.map(({ key, label, emoji }) => (
          <button
            key={key}
            onClick={() => handleCategoryChange(key as CategoryKey)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all"
            style={{
              background: activeCategory === key ? "rgba(124,58,237,0.4)" : "rgba(255,255,255,0.06)",
              border: `1px solid ${activeCategory === key ? "rgba(167,139,250,0.5)" : "rgba(255,255,255,0.08)"}`,
              color: activeCategory === key ? "#c4b5fd" : "#ffffff80",
            }}
          >
            <span>{emoji}</span>
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20 space-y-6 pt-4" style={{ scrollbarWidth: "none" }}>
        {locLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
            <p className="text-white/40 text-sm">Obtendo localização...</p>
          </div>
        )}

        {locError && (
          <div className="mx-4 p-5 rounded-2xl text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <MapPin className="w-8 h-8 mx-auto mb-2 text-white/20" />
            <p className="text-white/60 font-medium text-sm">Localização necessária</p>
            <p className="text-white/30 text-xs mt-1">Permita acesso ao GPS para ver lugares próximos</p>
          </div>
        )}

        {!locLoading && !locError && (
          <>
            {/* Show only active category */}
            {CATEGORIES.filter((c) => c.key === activeCategory).map(({ key, label, emoji }) => (
              <PlacesSection
                key={key}
                emoji={emoji}
                label={label}
                categoryKey={key}
                places={placesByCategory[key as CategoryKey] || []}
                loading={loadingCategory.has(key as CategoryKey)}
              />
            ))}

            {/* Concierge tip */}
            <div
              className="mx-4 rounded-2xl p-4"
              style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.2)" }}
            >
              <p className="text-violet-300 text-[11px] font-bold uppercase tracking-widest mb-1">
                💡 Dica do Concierge
              </p>
              <p className="text-white/70 text-sm leading-relaxed">
                Peça ao Flyisa sugestões personalizadas para hoje — "O que posso fazer agora em [cidade]?" e receba um roteiro completo.
              </p>
              <button
                onClick={() => setLocation("/")}
                className="mt-3 flex items-center gap-1 text-violet-400 text-xs font-semibold"
              >
                Abrir chat <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </>
        )}
      </div>

      <BottomNav active="suggestions" />
    </div>
  );
}
