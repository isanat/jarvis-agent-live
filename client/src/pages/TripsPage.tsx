import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plane, Hotel, Clock, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

interface TripFlight {
  flight: string;
  from: string;
  to: string;
  date: string;
  depart?: string;
  arrive?: string;
  seat?: string;
  pnr?: string;
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

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  upcoming: { label: "Próxima",   className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  active:   { label: "Em andamento", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  past:     { label: "Concluída", className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  cancelled:{ label: "Cancelada", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
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
      orderBy("departureDate", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setTrips(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Trip, "id">) })));
      setLoading(false);
    });

    return () => unsub();
  }, [user?.uid]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950">
      <header className="border-b border-border bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center gap-3 h-16">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Minhas Viagens</h1>
        </div>
      </header>

      <main className="container py-6 max-w-3xl mx-auto space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground space-y-3">
            <Plane className="w-12 h-12 mx-auto opacity-30" />
            <p>Nenhuma viagem cadastrada</p>
            <p className="text-xs">Envie documentos de viagem para o Jarvis para começar</p>
          </div>
        ) : (
          trips.map((trip) => {
            const primary = trip.flights?.[0];
            const fs = trip.flightStatus;
            const delay = fs?.departure?.delay || 0;
            const statusInfo = STATUS_BADGE[trip.status || "upcoming"] ?? STATUS_BADGE.upcoming;
            const hasAlert = delay >= 15 || fs?.status === "cancelled";

            return (
              <Card
                key={trip.id}
                className={`cursor-pointer transition-shadow hover:shadow-lg ${hasAlert ? "border-orange-300 dark:border-orange-700" : ""}`}
                onClick={() => setLocation(`/trips/${trip.id}`)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-lg truncate">
                          {trip.destination || trip.route || (primary ? `${primary.from} → ${primary.to}` : "Viagem")}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.className}`}>
                          {statusInfo.label}
                        </span>
                      </div>

                      {primary && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Plane className="w-3.5 h-3.5" />
                          <span>{primary.flight}</span>
                          <span>·</span>
                          <span>{primary.from} → {primary.to}</span>
                          {primary.date && <><span>·</span><span>{primary.date}</span></>}
                        </div>
                      )}

                      {(trip.gate || fs?.departure?.gate) && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            Portão {trip.gate || fs?.departure?.gate}
                            {(trip.terminal || fs?.departure?.terminal) && ` · Terminal ${trip.terminal || fs?.departure?.terminal}`}
                          </span>
                        </div>
                      )}

                      {trip.hotel?.name && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                          <Hotel className="w-3 h-3" />
                          <span>{trip.hotel.name}</span>
                          {trip.hotel.checkIn && <><span>·</span><span>Check-in: {trip.hotel.checkIn}</span></>}
                        </div>
                      )}
                    </div>

                    <div className="shrink-0">
                      {fs?.status === "cancelled" ? (
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                      ) : delay >= 15 ? (
                        <div className="text-right">
                          <AlertTriangle className="w-5 h-5 text-orange-500 mx-auto" />
                          <span className="text-xs text-orange-600 dark:text-orange-400">+{delay}min</span>
                        </div>
                      ) : fs?.status === "active" || fs?.status === "en-route" ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </main>
    </div>
  );
}
