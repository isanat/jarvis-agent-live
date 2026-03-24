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
import { Loader2, Star, MapPin, Clock, ChevronRight, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";

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

// ─── Place card ───────────────────────────────────────────────────────────────

function PlaceCard({ place }: { place: Place }) {
  const openInMaps = () => {
    const q = place.name + (place.address ? `, ${place.address}` : "");
    window.open(`https://maps.google.com/?q=${encodeURIComponent(q)}`, "_blank");
  };

  const stars = Math.round(place.rating || 0);
  const distLabel = place.distance
    ? place.distance < 1000
      ? `${Math.round(place.distance)} m`
      : `${(place.distance / 1000).toFixed(1)} km`
    : null;

  return (
    <div
      className="rounded-2xl overflow-hidden flex-shrink-0 cursor-pointer transition-all active:scale-95"
      style={{
        width: 200,
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
      onClick={openInMaps}
    >
      {/* Photo / placeholder */}
      <div
        className="relative w-full h-28 bg-white/5 flex items-center justify-center"
        style={{
          backgroundImage: place.photoUrl ? `url(${place.photoUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {!place.photoUrl && <MapPin className="w-8 h-8 text-white/10" />}
        {/* Open/closed badge */}
        {place.openNow !== undefined && (
          <span
            className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{
              background: place.openNow ? "rgba(52,211,153,0.2)" : "rgba(239,68,68,0.2)",
              color: place.openNow ? "#34d399" : "#ef4444",
              border: `1px solid ${place.openNow ? "rgba(52,211,153,0.4)" : "rgba(239,68,68,0.4)"}`,
            }}
          >
            {place.openNow ? "Open Now" : "Fechado"}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-white font-semibold text-sm leading-snug line-clamp-1">{place.name}</p>
        {place.address && (
          <p className="text-white/40 text-[11px] leading-snug mt-0.5 line-clamp-1">{place.address}</p>
        )}

        {/* Rating */}
        {place.rating ? (
          <div className="flex items-center gap-1 mt-1.5">
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn("w-3 h-3", i < stars ? "text-amber-400 fill-amber-400" : "text-white/20")}
                />
              ))}
            </div>
            <span className="text-amber-400 text-[11px] font-bold">{place.rating.toFixed(1)}</span>
            {place.totalRatings && (
              <span className="text-white/30 text-[10px]">({place.totalRatings})</span>
            )}
          </div>
        ) : null}

        {/* Distance + walk time */}
        <div className="flex items-center gap-3 mt-1.5">
          {distLabel && (
            <span className="flex items-center gap-0.5 text-[11px] text-white/40">
              <Navigation className="w-3 h-3" />
              {distLabel}
            </span>
          )}
          {place.walkMinutes && (
            <span className="flex items-center gap-0.5 text-[11px] text-white/40">
              <Clock className="w-3 h-3" />
              {place.walkMinutes} min
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Section with horizontal scroll ──────────────────────────────────────────

function PlacesSection({
  emoji,
  label,
  places,
  loading,
}: {
  emoji: string;
  label: string;
  places: Place[];
  loading: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between px-4 mb-3">
        <p className="text-white font-bold text-base">
          {emoji} {label}
        </p>
        <ChevronRight className="w-4 h-4 text-white/30" />
      </div>

      {loading ? (
        <div className="px-4 flex items-center gap-2 text-white/40 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Buscando...
        </div>
      ) : places.length === 0 ? (
        <p className="px-4 text-white/30 text-sm">Nenhum lugar encontrado</p>
      ) : (
        <div
          className="flex gap-3 overflow-x-auto pl-4 pr-4 pb-1"
          style={{ scrollbarWidth: "none" }}
        >
          {places.map((p, i) => (
            <PlaceCard key={p.placeId || p.name + i} place={p} />
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
        <p className="text-white font-extrabold text-xl">Curadoria de Experiências</p>
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
