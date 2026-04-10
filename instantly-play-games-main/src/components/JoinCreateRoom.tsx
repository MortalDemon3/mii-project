import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, LogIn as JoinIcon } from 'lucide-react';
import { GameType } from '@/lib/gameTypes';
import { useTranslation } from 'react-i18next';

interface JoinCreateRoomProps {
  gameType: GameType;
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  onBack: () => void;
}

export default function JoinCreateRoom({ gameType, onCreateRoom, onJoinRoom, onBack }: JoinCreateRoomProps) {
  const { t } = useTranslation();
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');

  const handleJoin = () => {
    if (roomCode.trim().length < 4) { setError(t('room.invalidCode')); return; }
    onJoinRoom(roomCode.trim().toUpperCase());
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto">
      <div className="card-game rounded-2xl p-8 space-y-6">
        <Button onClick={onCreateRoom} className="w-full btn-play text-lg py-6" size="lg">
          <Plus size={22} className="mr-2" /> {t('room.createRoom')}
        </Button>
        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-4 text-muted-foreground font-display">{t('room.orJoin')}</span></div>
        </div>
        <div className="space-y-3">
          <Input placeholder={t('room.roomCodePlaceholder')} value={roomCode} onChange={(e) => { setRoomCode(e.target.value.toUpperCase()); setError(''); }} className="bg-muted border-border text-foreground placeholder:text-muted-foreground text-center font-display text-xl tracking-widest uppercase" maxLength={6} />
          {error && <p className="text-destructive text-sm text-center">{error}</p>}
          <Button onClick={handleJoin} variant="outline" className="w-full border-border text-foreground hover:bg-muted" size="lg">
            <JoinIcon size={18} className="mr-2" /> {t('room.joinRoom')}
          </Button>
        </div>
        <Button variant="ghost" onClick={onBack} className="w-full text-muted-foreground">{t('room.pickDifferent')}</Button>
      </div>
    </motion.div>
  );
}
