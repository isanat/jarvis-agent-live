/**
 * useProactiveFeed — Flyisa é viva.
 *
 * Escaneia o contexto do usuário (viagem ativa, horário, localização) e
 * gera cards proativos e mensagens autônomas da Flyisa — sem o usuário pedir.
 */

import { useState, useEffect, useCallback } from "react";

// ── Tipos ──────────────────────────────────────────────────────────────────

export interface ProactiveCard {
  id: string;
  type:
    | "flight_imminent"
    | "departure_day"
    | "arrived"
    | "hotel_checkin"
    | "hotel_checkout"
    | "restaurant_evening"
    | "trip_end"
    | "ask_hotel"
    | "ask_return_flight"
    | "weather"
    | "transport_timing"
    | "transfer_arrival"
    | "return_transport"
    | "general";
  priority: number;       // 1 = mais urgente
  icon: string;
  title: string;
  subtitle: string;
  accent: string;         // cor de fundo do card
  query?: string;         // texto a enviar ao chat ao tocar
}

export interface FlyisaGreeting {
  key: string;            // chave única para evitar repetição (localStorage)
  message: string;        // o que Flyisa quer dizer ao usuário
  urgent: boolean;        // true → abre o chat automaticamente
}

// ── Helpers ────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function hoursUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  try {
    const diff = new Date(dateStr).getTime() - Date.now();
    return isNaN(diff) ? null : diff / 3_600_000;
  } catch {
    return null;
  }
}

function currentHour(): number {
  return new Date().getHours();
}

function greetingKey(userId: string, tripId: string, trigger: string): string {
  return `flyisa_greeted_${userId}_${tripId}_${trigger}_${today()}`;
}

// localStorage wrappers — safe in all contexts (private mode, iOS restrictions, etc.)
function lsGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function lsSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* silently ignore */ }
}

// ── Hook principal ─────────────────────────────────────────────────────────

export function useProactiveFeed(
  userId: string | undefined,
  activeTrip: Record<string, any> | null,
) {
  const [cards, setCards] = useState<ProactiveCard[]>([]);
  const [greeting, setGreeting] = useState<FlyisaGreeting | null>(null);
  const [hasNewGreeting, setHasNewGreeting] = useState(false);

  // ── Gera cards e saudação proativa ──────────────────────────────────────
  useEffect(() => {
    try {
    const generated: ProactiveCard[] = [];
    let chosenGreeting: FlyisaGreeting | null = null;

    const tryGreeting = (key: string, message: string, urgent: boolean) => {
      if (!userId || !activeTrip) return;
      const full = greetingKey(userId, activeTrip.id ?? "notrip", key);
      if (lsGet(full)) return; // já mostrou hoje
      chosenGreeting = { key: full, message, urgent };
    };

    if (!activeTrip) {
      // Sem viagem ativa: nenhum card especial
      setCards([]);
      setGreeting(null);
      setHasNewGreeting(false);
      return;
    }

    const dest = activeTrip.destination ?? activeTrip.route ?? "seu destino";
    const tripId = activeTrip.id ?? "trip";
    const hour = currentHour();
    const flights: any[] = activeTrip.flights ?? [];
    const firstFlight = flights[0];
    const hotel = activeTrip.hotel;
    const returnDate: string | undefined = activeTrip.returnDate;
    const depDate: string | undefined =
      activeTrip.departureDate ?? firstFlight?.date;

    // 1 ── Viagem terminou (returnDate <= hoje) ──────────────────────────
    const returnHours = hoursUntil(returnDate ? `${returnDate}T23:59:00` : undefined);
    const tripEnded =
      returnDate && returnDate < today();

    if (tripEnded || (returnDate === today())) {
      generated.push({
        id: "trip_end",
        type: "trip_end",
        priority: 1,
        icon: "🏁",
        title: "Viagem concluída!",
        subtitle: `Como foi ${dest}? Posso arquivar e encerrar tudo.`,
        accent: "rgba(52,211,153,0.15)",
        query: `Minha viagem para ${dest} terminou. Pode concluir a viagem? Me pergunta como foi e se preciso de algo.`,
      });
      tryGreeting(
        "trip_end",
        `Sua viagem para ${dest} terminou! 🎉 Como foi? Precisa de algo mais — transporte para casa, comprovantes, alguma coisa? Posso concluir e arquivar tudo por você.`,
        true,
      );
    }

    // 2 ── Voo imminente (< 3h) ────────────────────────────────────────
    const flightDeparture = firstFlight?.depart
      ? `${firstFlight.date}T${firstFlight.depart}:00`
      : depDate;
    const hoursToFlight = hoursUntil(flightDeparture);

    if (hoursToFlight !== null && hoursToFlight > 0 && hoursToFlight <= 3) {
      const h = Math.floor(hoursToFlight);
      const m = Math.round((hoursToFlight - h) * 60);
      const label = h > 0 ? `${h}h${m > 0 ? m + "min" : ""}` : `${m}min`;
      generated.push({
        id: "flight_imminent",
        type: "flight_imminent",
        priority: 1,
        icon: "✈️",
        title: `Voo em ${label} — hora de sair!`,
        subtitle: `${firstFlight?.flight ?? "Seu voo"} · ${firstFlight?.from ?? "?"} → ${firstFlight?.to ?? dest}`,
        accent: "rgba(239,68,68,0.15)",
        query: `Meu voo ${firstFlight?.flight ?? ""} parte em ${label}. O que devo fazer agora?`,
      });
      tryGreeting(
        "flight_imminent",
        `⏰ Atenção! Seu voo ${firstFlight?.flight ?? ""} para ${dest} parte em ${label}. Está indo para o aeroporto? Posso te ajudar com documentos, gate ou rotas.`,
        true,
      );
    }

    // 2b ── Transporte para o aeroporto (4–8h antes do voo) ─────────────
    if (hoursToFlight !== null && hoursToFlight > 3 && hoursToFlight <= 8 && depDate === today()) {
      const depAirport = firstFlight?.from ?? "o aeroporto";
      generated.push({
        id: "transport_timing",
        type: "transport_timing",
        priority: 2,
        icon: "🚗",
        title: "Organize o transporte para o aeroporto",
        subtitle: `Voo às ${firstFlight?.depart ?? "—"}h · ${Math.floor(hoursToFlight)}h para embarcar`,
        accent: "rgba(59,130,246,0.15)",
        query: `Meu voo ${firstFlight?.flight ?? ""} parte às ${firstFlight?.depart ?? "—"}h do aeroporto ${depAirport}. Qual o horário ideal para sair agora considerando o trânsito? Também me diz as opções: Uber, taxi ou transporte público.`,
      });
      tryGreeting(
        "transport_timing",
        `🚗 Seu voo parte em ${Math.floor(hoursToFlight)}h. Já organizou o transporte para o aeroporto ${depAirport}? Posso calcular o horário ideal de saída com base no trânsito agora.`,
        false,
      );
    }

    // 3 ── Dia da partida ──────────────────────────────────────────────
    if (depDate === today() && (hoursToFlight === null || hoursToFlight > 3)) {
      generated.push({
        id: "departure_day",
        type: "departure_day",
        priority: 2,
        icon: "🌅",
        title: `Hoje é dia de viajar!`,
        subtitle: `${firstFlight?.flight ?? "Voo"} → ${dest}`,
        accent: "rgba(251,191,36,0.15)",
        query: `Hoje é meu dia de viagem para ${dest}. Preciso de algum lembrete ou checklist?`,
      });
      tryGreeting(
        "departure_day",
        `Bom dia! ☀️ Hoje você viaja para ${dest}! ${firstFlight?.flight ? `Voo ${firstFlight.flight} parte às ${firstFlight.depart ?? "horário no bilhete"}. ` : ""}Tudo pronto? Posso checar seu checklist ou status do voo.`,
        false,
      );
    }

    // 4 ── Chegou ao destino (primeiro dia, depois do horário de chegada) ─
    const tripIsActive = activeTrip.status === "active";
    const arrivalTime = firstFlight?.arrive;
    const arrivalPassed =
      arrivalTime && depDate === today()
        ? currentHour() >= parseInt(arrivalTime.split(":")[0], 10)
        : false;

    if (tripIsActive && (arrivalPassed || (depDate != null && depDate < today()))) {
      if (hotel?.name) {
        generated.push({
          id: "hotel_route",
          type: "arrived",
          priority: 2,
          icon: "🗺️",
          title: `Rota para ${hotel.name}`,
          subtitle: `${hotel.address ?? dest}`,
          accent: "rgba(59,130,246,0.15)",
          query: `Acabei de chegar em ${dest}. Como chego no hotel ${hotel.name}? ${hotel.address ? `Endereço: ${hotel.address}` : ""}`,
        });
        tryGreeting(
          "arrived_hotel",
          `Bem-vindo a ${dest}! 🎉 Posso te mostrar a rota para o ${hotel.name} ou sugerir onde comer perto do hotel. O que prefere?`,
          false,
        );
      }

      // Transfer do aeroporto (card separado para opções de transporte)
      const arrivalAirport = firstFlight?.to ?? "";
      generated.push({
        id: "transfer_airport",
        type: "transfer_arrival",
        priority: 2,
        icon: "🛬",
        title: "Transfer do aeroporto para o hotel",
        subtitle: `${hotel?.name ?? dest} — compare opções`,
        accent: "rgba(124,58,237,0.15)",
        query: `Acabei de pousar em ${dest}${arrivalAirport ? ` no aeroporto ${arrivalAirport}` : ""}. Quais são as opções de transporte até o hotel ${hotel?.name ?? dest}? Compara Uber, taxi, metro e shuttle com preço estimado e tempo.`,
      });
    }

    // 5 ── Check-in hoje ───────────────────────────────────────────────
    if (hotel?.checkIn === today()) {
      generated.push({
        id: "hotel_checkin",
        type: "hotel_checkin",
        priority: 2,
        icon: "🏨",
        title: `Check-in hoje — ${hotel.name ?? "Hotel"}`,
        subtitle: `Confirmação: ${hotel.confirmation ?? "—"}`,
        accent: "rgba(167,139,250,0.15)",
        query: `Meu check-in no ${hotel.name} é hoje. Pode me lembrar dos detalhes e o que preciso ter em mãos?`,
      });
    }

    // 6 ── Checkout amanhã ─────────────────────────────────────────────
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    if (hotel?.checkOut === tomorrowStr) {
      generated.push({
        id: "hotel_checkout",
        type: "hotel_checkout",
        priority: 3,
        icon: "⏰",
        title: `Checkout amanhã — ${hotel.name ?? "Hotel"}`,
        subtitle: "Precisa de transporte ou tem próxima etapa?",
        accent: "rgba(251,191,36,0.12)",
        query: `Meu checkout no ${hotel.name} é amanhã. Tem alguma dica? Preciso de transporte para o aeroporto?`,
      });
      tryGreeting(
        "checkout_tomorrow",
        `Lembrete! ⏰ Seu checkout no ${hotel.name ?? "hotel"} é amanhã. Já tem transporte para o aeroporto ou precisa que eu ajude?`,
        false,
      );
    }

    // 6b ── Transporte de volta ao aeroporto (≤ 24h antes do voo de retorno) ─
    const returnFlight = flights.length > 1 ? flights[flights.length - 1] : null;
    const returnFlightDate = returnFlight?.date ?? returnDate;
    const hoursToReturn = hoursUntil(
      returnFlightDate
        ? `${returnFlightDate}T${returnFlight?.depart ?? "12:00"}:00`
        : undefined,
    );

    if (hoursToReturn !== null && hoursToReturn > 0 && hoursToReturn <= 24) {
      generated.push({
        id: "return_transport",
        type: "return_transport",
        priority: 3,
        icon: "🔄",
        title: "Transporte de volta ao aeroporto",
        subtitle: `Voo de retorno em ${hoursToReturn <= 12 ? "menos de 12h" : "menos de 24h"}`,
        accent: "rgba(251,191,36,0.12)",
        query: `Meu voo de retorno ${returnFlight?.flight ?? ""} parte às ${returnFlight?.depart ?? "—"}h${returnFlight?.from ? ` do aeroporto ${returnFlight.from}` : ""}. Estou no hotel ${hotel?.name ?? dest}. Como organizo o transporte? Qual horário devo sair?`,
      });
      tryGreeting(
        "return_transport",
        `↩️ Lembrete de retorno! Seu voo de volta ${returnFlight?.flight ? `(${returnFlight.flight})` : ""} parte em breve. Já organizou o transporte do ${hotel?.name ?? "hotel"} para o aeroporto?`,
        false,
      );
    }

    // 7 ── Noite: sugestão de restaurante (18h–22h em viagem ativa) ────
    if (tripIsActive && hour >= 18 && hour <= 22) {
      generated.push({
        id: "restaurant_evening",
        type: "restaurant_evening",
        priority: 3,
        icon: "🍽️",
        title: `São ${hour}h em ${dest}`,
        subtitle: "Ver restaurantes próximos agora?",
        accent: "rgba(239,68,68,0.12)",
        query: `São ${hour}h e estou em ${dest}. Pode sugerir restaurantes próximos de mim agora?`,
      });
    }

    // 8 ── Sem hotel cadastrado ─────────────────────────────────────────
    if (!hotel && tripIsActive) {
      generated.push({
        id: "ask_hotel",
        type: "ask_hotel",
        priority: 4,
        icon: "❓",
        title: `Ainda sem hotel para ${dest}`,
        subtitle: "Informe para eu poder te ajudar melhor",
        accent: "rgba(255,255,255,0.05)",
        query: `Qual é meu hotel em ${dest}? Vou te informar o nome e endereço.`,
      });
      tryGreeting(
        "ask_hotel",
        `Oi! 👋 Percebi que ainda não tenho o endereço do seu hotel em ${dest}. Pode me informar? Assim consigo te dar a rota, avisar sobre o check-in e muito mais.`,
        false,
      );
    }

    // 9 ── Sem voo de volta ────────────────────────────────────────────
    const hasReturn = flights.length > 1 || !!returnDate;
    if (!hasReturn && tripIsActive) {
      generated.push({
        id: "ask_return",
        type: "ask_return_flight",
        priority: 5,
        icon: "↩️",
        title: "Voo de volta não cadastrado",
        subtitle: "Informe para eu monitorar",
        accent: "rgba(255,255,255,0.04)",
        query: `Qual é meu voo de volta de ${dest}? Quero que você monitore.`,
      });
    }

    // 10 ── Clima sempre disponível em viagem ativa ────────────────────
    if (tripIsActive || depDate === today()) {
      generated.push({
        id: "weather",
        type: "weather",
        priority: 6,
        icon: "🌤️",
        title: `Clima em ${dest} hoje`,
        subtitle: "Toque para verificar",
        accent: "rgba(251,191,36,0.10)",
        query: `Como está o clima em ${dest} hoje e nos próximos dias?`,
      });
    }

    // Ordena por prioridade
    generated.sort((a, b) => a.priority - b.priority);
    setCards(generated);

    // Define saudação proativa
    if (chosenGreeting) {
      setGreeting(chosenGreeting);
      setHasNewGreeting(true);
    } else {
      setGreeting(null);
      setHasNewGreeting(false);
    }
    } catch (err) {
      // Nunca deve travar o app por causa do feed proativo
      console.warn('[useProactiveFeed]', err);
      setCards([]);
    }
  }, [activeTrip, userId]);

  // Marca a saudação como lida (persiste no localStorage)
  const markGreetingRead = useCallback(() => {
    if (!greeting) return;
    lsSet(greeting.key, "1");
    setHasNewGreeting(false);
  }, [greeting]);

  return { cards, greeting, hasNewGreeting, markGreetingRead };
}
