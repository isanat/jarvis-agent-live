import { useLocation } from "wouter";
import { Rss, Map, Sparkles, CalendarDays, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type NavTab = "feed" | "map" | "suggestions" | "trips" | "chat";

const NAV_ITEMS: { key: NavTab; icon: React.ComponentType<{ className?: string }>; label: string; path: string }[] = [
  { key: "feed",        icon: Rss,          label: "Feed",       path: "/" },
  { key: "map",         icon: Map,          label: "Mapa",       path: "/map" },
  { key: "suggestions", icon: Sparkles,     label: "Sugestões",  path: "/experiences" },
  { key: "trips",       icon: CalendarDays, label: "Reservas",   path: "/trips" },
  { key: "chat",        icon: MessageCircle,label: "Chat",       path: "/chat" },
];

interface BottomNavProps {
  active: NavTab;
}

export function BottomNav({ active }: BottomNavProps) {
  const [, setLocation] = useLocation();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 flex items-center justify-around pb-safe"
      style={{
        background: "rgba(6,0,17,0.92)",
        backdropFilter: "blur(16px)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        height: 64,
      }}
    >
      {NAV_ITEMS.map(({ key, icon: Icon, label, path }) => {
        const isActive = key === active;
        return (
          <button
            key={key}
            onClick={() => setLocation(path)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-xl transition-all",
              isActive ? "text-violet-400" : "text-white/40 hover:text-white/60",
            )}
          >
            <Icon
              className={cn(
                "w-5 h-5 transition-transform",
                isActive && "scale-110",
              )}
            />
            <span className={cn("text-[10px] font-medium leading-none", isActive && "text-violet-400")}>
              {label}
            </span>
            {isActive && (
              <span
                className="absolute -bottom-0 w-8 h-0.5 rounded-full"
                style={{ background: "rgba(167,139,250,0.8)" }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
