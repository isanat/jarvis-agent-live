import { useLocation } from "wouter";
import { Zap, Rss, Sparkles, Plane, User } from "lucide-react";
import { cn } from "@/lib/utils";

export type NavTab = "chat" | "feed" | "suggestions" | "trips" | "profile";

const NAV_ITEMS: { key: NavTab; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; label: string; path: string }[] = [
  { key: "chat",        icon: Zap,      label: "Início",    path: "/" },
  { key: "feed",        icon: Rss,      label: "Feed",      path: "/feed" },
  { key: "trips",       icon: Plane,    label: "Viagens",   path: "/trips" },
  { key: "suggestions", icon: Sparkles, label: "Sugestões", path: "/experiences" },
  { key: "profile",     icon: User,     label: "Perfil",    path: "/?tab=profile" },
];

interface BottomNavProps {
  active: NavTab;
}

export function BottomNav({ active }: BottomNavProps) {
  const [location, setLocation] = useLocation();

  return (
    <nav
      className="shrink-0 flex items-center justify-around pb-safe"
      style={{
        background: "rgba(6,0,17,0.96)",
        backdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        minHeight: 60,
        paddingTop: 8,
        paddingBottom: 10,
      }}
    >
      {NAV_ITEMS.map(({ key, icon: Icon, label, path }) => {
        const isActive = key === active;
        return (
          <button
            key={key}
            onClick={() => setLocation(path)}
            className="relative flex flex-col items-center gap-[3px] px-3 transition-all active:scale-95"
            style={{ minWidth: 52 }}
          >
            <Icon
              className={cn("w-[22px] h-[22px] transition-colors")}
              style={{ color: isActive ? "#ffffff" : "rgba(255,255,255,0.35)" }}
            />
            <span
              className="text-[10px] font-medium leading-none tracking-wide"
              style={{ color: isActive ? "#ffffff" : "rgba(255,255,255,0.35)" }}
            >
              {label}
            </span>
            {/* Active underline */}
            {isActive && (
              <span
                className="absolute -bottom-[10px] left-1/2 -translate-x-1/2 h-[2px] rounded-full"
                style={{ width: 28, background: "#fff" }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
