import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Lock, User, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: "login" | "register" | "verify";
  initialEmail?: string;
  onLogin: (email: string, pass: string) => Promise<any>;
  onRegister: (email: string, pass: string, user: string) => Promise<any>;
  onVerify: (email: string, code: string) => Promise<boolean>;
}

export default function AuthModal({
                                    isOpen,
                                    onClose,
                                    initialView = "login",
                                    initialEmail = "",
                                    ...props
                                  }: AuthModalProps) {
  // États internes
  const [view, setView] = useState<"login" | "register" | "verify">(initialView);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  // Synchronisation : Si on clique sur un lien mail ou qu'on change d'état
  useEffect(() => {
    if (isOpen) {
      setView(initialView);
      setEmail(initialEmail);
      // Reset des champs sensibles à l'ouverture
      setCode("");
      setPassword("");
    }
  }, [isOpen, initialView, initialEmail]);

  // --- ACTIONS ---

  const handleLogin = async () => {
    if (!email || !password) return toast.error("Remplis tous les champs !");
    setLoading(true);

    const result = await props.onLogin(email, password);

    setLoading(false);

    // Si la connexion est réussie, on ferme la popup
    if (result?.success) {
      onClose();
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !username) return toast.error("Tous les champs sont requis !");
    setLoading(true);
    const res = await props.onRegister(email, password, username);
    setLoading(false);
    if (res?.success) {
      setView("verify");
    }
  };

  const handleVerify = async () => {
    if (code.length < 6) return toast.error("Le code doit faire 6 chiffres.");
    setLoading(true);
    const success = await props.onVerify(email, code);
    setLoading(false);
    if (success) {
      setView("login");
      setCode("");
    }
  };

  return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md bg-card border-border shadow-2xl overflow-hidden border-t-4 border-t-primary">
          <DialogHeader>
            <DialogTitle className="text-center font-display text-3xl font-bold text-gradient pt-4">
              {view === "login" && "Bon retour !"}
              {view === "register" && "Créer un compte"}
              {view === "verify" && "Vérification"}
            </DialogTitle>
            <p className="text-center text-sm text-muted-foreground mt-2">
              {view === "login" && "Connecte-toi pour retrouver tes scores"}
              {view === "register" && "Rejoins la communauté MiiProject"}
              {view === "verify" && "Entre le code reçu par e-mail"}
            </p>
          </DialogHeader>

          <div className="space-y-4 py-6">
            {view !== "verify" ? (
                <>
                  {/* Inputs Connexion / Inscription */}
                  <div className="space-y-3">
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                          placeholder="Email"
                          type="email"
                          className="pl-10 bg-muted/30"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>

                    {view === "register" && (
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                              placeholder="Nom d'utilisateur"
                              className="pl-10 bg-muted/30"
                              value={username}
                              onChange={(e) => setUsername(e.target.value)}
                          />
                        </div>
                    )}

                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                          placeholder="Mot de passe"
                          type="password"
                          className="pl-10 bg-muted/30"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button
                      className="w-full font-display text-lg h-12 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                      onClick={view === "login" ? handleLogin : handleRegister}
                      disabled={loading}
                  >
                    {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                    {view === "login" ? "Entrer dans l'arène" : "Valider l'inscription"}
                  </Button>

                  <div className="flex flex-col gap-2">
                    <button
                        className="text-xs text-muted-foreground hover:text-primary transition-colors py-2 text-center"
                        onClick={() => setView(view === "login" ? "register" : "login")}
                    >
                      {view === "login" ? "Nouveau ici ? Créer un compte" : "Déjà membre ? Se connecter"}
                    </button>
                  </div>
                </>
            ) : (
                <>
                  {/* Vue de vérification du code */}
                  <div className="flex flex-col items-center space-y-6">
                    <div className="bg-primary/10 p-4 rounded-full animate-pulse">
                      <ShieldCheck className="h-10 w-10 text-primary" />
                    </div>

                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">
                        Code envoyé à :<br/>
                        <span className="text-foreground font-semibold underline decoration-primary/50">{email}</span>
                      </p>
                    </div>

                    <Input
                        placeholder="000000"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="text-center text-4xl tracking-[12px] font-black h-20 bg-muted/50 border-2 focus:border-primary transition-all"
                        maxLength={6}
                    />

                    <Button
                        className="w-full font-display text-lg h-12"
                        onClick={handleVerify}
                        disabled={loading || code.length < 6}
                    >
                      {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                      Vérifier maintenant
                    </Button>

                    <button
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setView("login")}
                    >
                      Retourner à la connexion
                    </button>
                  </div>
                </>
            )}
          </div>

          {/* Footer décoratif */}
          <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-40" />
        </DialogContent>
      </Dialog>
  );
}