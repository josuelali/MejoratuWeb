import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useLanguage } from "../contexts/LanguageContext";
import { Mail } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function EmailPopup() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem("email_popup_dismissed");
    if (dismissed) return;
    const timer = setTimeout(() => setOpen(true), 60000);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async () => {
    if (!email.trim()) return;
    try {
      await axios.post(`${API}/email/subscribe`, { email });
      setSubmitted(true);
      setTimeout(() => {
        setOpen(false);
        sessionStorage.setItem("email_popup_dismissed", "true");
      }, 2000);
    } catch {
      // silently fail
    }
  };

  const handleClose = () => {
    setOpen(false);
    sessionStorage.setItem("email_popup_dismissed", "true");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="bg-[#0A0A12]/95 backdrop-blur-2xl border border-white/10 text-white max-w-md"
        data-testid="email-popup"
      >
        <DialogHeader>
          <DialogTitle
            className="text-xl font-bold flex items-center gap-2 text-white"
            style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
          >
            <Mail className="w-5 h-5 text-[#00E5FF]" />
            {t("email_title")}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {t("email_desc")}
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <p className="text-[#39FF14] text-center py-4 text-sm" data-testid="email-success">
            {t("subscribed")}
          </p>
        ) : (
          <div className="flex gap-2 mt-2">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder={t("email_placeholder")}
              type="email"
              className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-[#00E5FF]"
              data-testid="email-input"
            />
            <Button
              onClick={handleSubmit}
              className="bg-gradient-to-r from-[#00E5FF] to-[#9D4CDD] text-black font-bold hover:opacity-90 shrink-0"
              data-testid="email-submit-btn"
            >
              {t("subscribe")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
