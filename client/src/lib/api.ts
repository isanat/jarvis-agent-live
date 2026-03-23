/**
 * Typed helpers for all JarvisTravel backend API calls.
 * Base URL: VITE_BACKEND_URL (https://travelconcierge.site in production)
 */

const BASE = import.meta.env.VITE_BACKEND_URL || "";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FlightStatusResult {
  success: boolean;
  flightNumber?: string;
  status?: string;
  airline?: string;
  origin?: string;
  destination?: string;
  scheduled?: string;
  estimated?: string;
  actual?: string;
  gate?: string;
  terminal?: string;
  delay?: number;
  baggage?: string;
  aircraft?: string;
  raw?: unknown;
  error?: string;
}

export interface Place {
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  rating?: number;
  totalRatings?: number;
  priceLevel?: number;
  openNow?: boolean;
  photoUrl?: string;
  placeId?: string;
  distance?: number;   // metres
  walkMinutes?: number;
  types?: string[];
}

export interface NearbyResult {
  success: boolean;
  places: Place[];
  source?: "google" | "tomtom";
  warning?: string;
}

export interface WeatherDay {
  date?: string;
  maxTemp?: number;
  minTemp?: number;
  precipitationProbability?: number;
}

export interface WeatherResult {
  success: boolean;
  weather?: {
    current_weather?: {
      temperature: number;
      windspeed: number;
      weathercode: number;
      is_day: number;
    };
    daily?: {
      time: string[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      precipitation_probability_max: number[];
    };
  };
  error?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export async function getFlightStatus(
  flightNumber: string,
  date?: string,
): Promise<FlightStatusResult> {
  try {
    const res = await fetch(`${BASE}/api/flight/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flightNumber, date }),
    });
    return await res.json();
  } catch {
    return { success: false, error: "Erro ao buscar status do voo" };
  }
}

export async function getNearby(
  lat: number,
  lng: number,
  type = "restaurant",
  radius = 1500,
): Promise<NearbyResult> {
  try {
    const res = await fetch(`${BASE}/api/nearby`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lng, type, radius }),
    });
    return await res.json();
  } catch {
    return { success: false, places: [] };
  }
}

export async function getWeather(lat: number, lng: number): Promise<WeatherResult> {
  try {
    const res = await fetch(`${BASE}/api/weather`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lng }),
    });
    return await res.json();
  } catch {
    return { success: false, error: "Clima indisponível" };
  }
}

/** WMO weather code → human description + emoji */
export function weatherCodeLabel(code?: number): { label: string; emoji: string } {
  if (code === undefined) return { label: "Desconhecido", emoji: "🌡️" };
  if (code === 0) return { label: "Céu limpo", emoji: "☀️" };
  if (code <= 2) return { label: "Parcialmente nublado", emoji: "⛅" };
  if (code <= 3) return { label: "Nublado", emoji: "☁️" };
  if (code <= 49) return { label: "Névoa", emoji: "🌫️" };
  if (code <= 59) return { label: "Garoa", emoji: "🌦️" };
  if (code <= 69) return { label: "Chuva", emoji: "🌧️" };
  if (code <= 79) return { label: "Neve", emoji: "❄️" };
  if (code <= 82) return { label: "Pancadas de chuva", emoji: "🌧️" };
  if (code <= 99) return { label: "Tempestade", emoji: "⛈️" };
  return { label: "Desconhecido", emoji: "🌡️" };
}
