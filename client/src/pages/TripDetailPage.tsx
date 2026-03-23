import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft, Plane, Hotel, Users, Luggage, Shield, Clock,
  AlertTriangle, CheckCircle, Loader2, MapPin, MessageCircle,
} from "lucide-react";

interface TripData {
  userId?: string;
  destination?: string;
  route?: string;
  status?: string;
  departureDate?: string;
  returnDate?: string;
  flights?: Array<{
    flight: string; from: string; to: string; date: string;
    depart?: string; arrive?: string; seat?: string; pnr?: string;
  }>;
  passengers?: string[];
  hotel?: { name?: string; address?: string; checkIn?: string; checkOut?: string; confirmation?: string };
  baggage?: Array<{ type?: string; weight?: string; tag?: string; owner?: string }>;
  insurance?: { provider?: string; policyNumber?: string; coverage?: string; validityStart?: string; validityEnd?: string };
  flightStatus?: { status?: string; departure?: { gate?: string; terminal?: string; delay?: number }; arrival?: { gate?: string; terminal?: string } };
  gate?: string;
  terminal?: string;
  notes?: string;
}

function Section({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="w-4 h-4 text-blue-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between text-sm py-1 border-b last:border-0 border-border/40">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%] break-words">{value}</span>
    </div>
  );
}

export default function TripDetailPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/trips/:id");
  const tripId = params?.id;

  const [trip, setTrip] = useState<TripData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!tripId || !user?.uid) return;

    const unsub = onSnapshot(doc(db, "trips", tripId), (snap) => {
      if (!snap.exists()) { setNotFound(true); setLoading(false); return; }
      const data = snap.data() as TripData;
      if (data.userId !== user.uid) { setNotFound(true); setLoading(false); return; }
      setTrip(data);
      setLoading(false);
    });

    return () => unsub();
  }, [tripId, user?.uid]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (notFound || !trip) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Viagem não encontrada</p>
        <Button onClick={() => setLocation("/trips")}>Voltar</Button>
      </div>
    );
  }

  const primary = trip.flights?.[0];
  const fs = trip.flightStatus;
  const delay = fs?.departure?.delay || 0;
  const isDelayed = delay >= 15;
  const isCancelled = fs?.status === "cancelled";

  const title = trip.destination || trip.route || (primary ? `${primary.from} → ${primary.to}` : "Viagem");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950">
      <header className="border-b border-border bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center justify-between h-16 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/trips")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold truncate">{title}</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="flex items-center gap-1.5 shrink-0"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Perguntar ao Flyisa</span>
          </Button>
        </div>
      </header>

      <main className="container py-6 max-w-2xl mx-auto space-y-4">
        {/* Flight status banner */}
        {(isCancelled || isDelayed) && (
          <div className={`rounded-lg px-4 py-3 flex items-center gap-2 ${isCancelled ? "bg-red-50 dark:bg-red-950/40 border border-red-300" : "bg-orange-50 dark:bg-orange-950/40 border border-orange-300"}`}>
            <AlertTriangle className={`w-5 h-5 ${isCancelled ? "text-red-500" : "text-orange-500"}`} />
            <p className="text-sm font-medium">
              {isCancelled ? "Voo cancelado — contate a companhia aérea" : `Voo com atraso de ${delay} minutos`}
            </p>
          </div>
        )}

        {/* Flights */}
        {trip.flights && trip.flights.length > 0 && (
          <Section icon={Plane} title="Voos">
            {trip.flights.map((f, i) => (
              <div key={i} className={`${i > 0 ? "mt-4 pt-4 border-t border-border/40" : ""}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-base">{f.flight}</span>
                  {i === 0 && fs?.status && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      isCancelled ? "bg-red-100 text-red-700" :
                      isDelayed ? "bg-orange-100 text-orange-700" :
                      "bg-green-100 text-green-700"
                    }`}>
                      {isCancelled ? "Cancelado" : isDelayed ? `+${delay}min` : fs.status}
                    </span>
                  )}
                </div>
                <InfoRow label="Trecho" value={`${f.from} → ${f.to}`} />
                <InfoRow label="Data" value={f.date} />
                <InfoRow label="Saída" value={f.depart} />
                <InfoRow label="Chegada" value={f.arrive} />
                <InfoRow label="Assento" value={f.seat} />
                <InfoRow label="PNR" value={f.pnr} />
                {i === 0 && (
                  <>
                    <InfoRow label="Portão" value={trip.gate || fs?.departure?.gate} />
                    <InfoRow label="Terminal" value={trip.terminal || fs?.departure?.terminal} />
                  </>
                )}
              </div>
            ))}
          </Section>
        )}

        {/* Hotel */}
        {trip.hotel?.name && (
          <Section icon={Hotel} title="Hotel">
            <InfoRow label="Nome" value={trip.hotel.name} />
            <InfoRow label="Endereço" value={trip.hotel.address} />
            <InfoRow label="Check-in" value={trip.hotel.checkIn} />
            <InfoRow label="Check-out" value={trip.hotel.checkOut} />
            <InfoRow label="Confirmação" value={trip.hotel.confirmation} />
            {trip.hotel.address && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(trip.hotel?.address ?? "")}`, "_blank")}
              >
                <MapPin className="w-4 h-4 mr-1.5" />
                Ver no mapa
              </Button>
            )}
          </Section>
        )}

        {/* Passengers */}
        {trip.passengers && trip.passengers.length > 0 && (
          <Section icon={Users} title="Passageiros">
            <div className="space-y-1">
              {trip.passengers.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-sm py-1">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-medium text-blue-700 dark:text-blue-300">
                    {i + 1}
                  </div>
                  <span>{p}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Baggage */}
        {trip.baggage && trip.baggage.length > 0 && (
          <Section icon={Luggage} title="Bagagem">
            {trip.baggage.map((b, i) => (
              <div key={i} className={`${i > 0 ? "mt-3 pt-3 border-t border-border/40" : ""}`}>
                <InfoRow label="Tipo" value={b.type} />
                <InfoRow label="Peso" value={b.weight ? `${b.weight} kg` : null} />
                <InfoRow label="Tag" value={b.tag} />
                <InfoRow label="Responsável" value={b.owner} />
              </div>
            ))}
          </Section>
        )}

        {/* Insurance */}
        {trip.insurance?.provider && (
          <Section icon={Shield} title="Seguro Viagem">
            <InfoRow label="Seguradora" value={trip.insurance.provider} />
            <InfoRow label="Apólice" value={trip.insurance.policyNumber} />
            <InfoRow label="Cobertura" value={trip.insurance.coverage} />
            <InfoRow label="Validade" value={
              trip.insurance.validityStart && trip.insurance.validityEnd
                ? `${trip.insurance.validityStart} até ${trip.insurance.validityEnd}`
                : null
            } />
          </Section>
        )}

        {/* Notes */}
        {trip.notes && (
          <Section icon={Clock} title="Observações">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{trip.notes}</p>
          </Section>
        )}
      </main>
    </div>
  );
}
