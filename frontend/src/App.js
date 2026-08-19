import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "./contexts/LanguageContext";
import LandingPage from "./pages/LandingPage";
import PaymentSuccess from "./pages/PaymentSuccess";
import LegalPage from "./pages/LegalPage";
import { Toaster } from "./components/ui/sonner";
import "./App.css";

function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/payment-success" element={<PaymentSuccess />} />
      <Route path="/legal/:type" element={<LegalPage />} />
      <Route path="*" element={<LandingPage />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <div className="noise-overlay">
          <AppRouter />
          <Toaster position="top-right" theme="dark" />
        </div>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;
