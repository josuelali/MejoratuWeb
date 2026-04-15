import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { Button } from "./ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Globe, LogOut, Rocket } from "lucide-react";

export default function Header() {
  const { user, login, logout } = useAuth();
  const { lang, toggleLang, t } = useLanguage();

  return (
    <header
      className="fixed top-0 w-full z-50 backdrop-blur-xl bg-[#0A0A12]/60 border-b border-white/[0.06]"
      data-testid="header"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Rocket className="w-6 h-6 text-[#00E5FF]" />
          <span
            className="text-xl font-black tracking-tight text-white"
            style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
          >
            Mejora Tu <span className="text-[#00E5FF]">WEB</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleLang}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-zinc-400 hover:text-white hover:border-[#00E5FF]/30 transition-all duration-200"
            data-testid="language-toggle"
          >
            <Globe className="w-4 h-4" />
            {lang.toUpperCase()}
          </button>

          {user ? (
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8 border border-white/20">
                <AvatarImage src={user.picture} />
                <AvatarFallback className="bg-[#9D4CDD]/20 text-[#9D4CDD] text-sm">
                  {user.name?.[0] || "?"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-zinc-300 hidden sm:block">{user.name}</span>
              <button
                onClick={logout}
                className="p-2 rounded-full hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
                data-testid="logout-btn"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Button
              onClick={login}
              className="bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white rounded-full px-4 h-8 text-xs transition-all duration-200"
              data-testid="login-btn"
            >
              {t("login")}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
