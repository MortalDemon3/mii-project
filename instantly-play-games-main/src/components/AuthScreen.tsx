import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogIn, UserPlus, Gamepad2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AuthScreenProps {
  onGuestPlay: (name: string) => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onSignup: (email: string, password: string, displayName: string) => Promise<void>;
}

export default function AuthScreen({ onGuestPlay, onLogin, onSignup }: AuthScreenProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'guest' | 'login' | 'signup'>('guest');
  const [guestName, setGuestName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'guest') {
        if (!guestName.trim()) { setError(t('auth.enterName')); setLoading(false); return; }
        onGuestPlay(guestName.trim());
      } else if (mode === 'login') {
        await onLogin(email, password);
      } else {
        if (!displayName.trim()) { setError(t('auth.enterDisplayName')); setLoading(false); return; }
        await onSignup(email, password, displayName.trim());
      }
    } catch (err: any) {
      setError(err.message || t('auth.error'));
    } finally {
      setLoading(false);
    }
  };

  const modeLabels = { guest: t('auth.guest'), login: t('auth.login'), signup: t('auth.signup') };

  return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto">
        <div className="card-game rounded-2xl p-8">
          <div className="flex gap-1 mb-6 bg-muted rounded-xl p-1">
            {(['guest', 'login', 'signup'] as const).map(m => (
                <button key={m} onClick={() => { setMode(m); setError(''); }} className={`flex-1 py-2 px-3 rounded-lg text-sm font-display font-medium transition-all ${mode === m ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                  {modeLabels[m]}
                </button>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'guest' && (
                <Input placeholder={t('auth.guestPlaceholder')} value={guestName} onChange={(e) => setGuestName(e.target.value)} className="bg-muted border-border text-foreground placeholder:text-muted-foreground text-center font-display text-lg" maxLength={20} autoFocus />
            )}
            {(mode === 'login' || mode === 'signup') && (
                <>
                  {mode === 'signup' && <Input placeholder={t('auth.displayName')} value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="bg-muted border-border text-foreground placeholder:text-muted-foreground" maxLength={20} />}
                  <Input type="email" placeholder={t('auth.email')} value={email} onChange={(e) => setEmail(e.target.value)} className="bg-muted border-border text-foreground placeholder:text-muted-foreground" />
                  <Input type="password" placeholder={t('auth.password')} value={password} onChange={(e) => setPassword(e.target.value)} className="bg-muted border-border text-foreground placeholder:text-muted-foreground" />
                </>
            )}
            {error && <p className="text-destructive text-sm text-center">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full btn-play" size="lg">
              {mode === 'guest' && <><Gamepad2 size={18} className="mr-2" /> {t('auth.playAsGuest')}</>}
              {mode === 'login' && <><LogIn size={18} className="mr-2" /> {t('auth.logIn')}</>}
              {mode === 'signup' && <><UserPlus size={18} className="mr-2" /> {t('auth.createAccount')}</>}
            </Button>
          </form>
          {mode === 'guest' && <p className="text-xs text-muted-foreground text-center mt-4">{t('auth.guestNote')}</p>}
        </div>
      </motion.div>
  );
}
