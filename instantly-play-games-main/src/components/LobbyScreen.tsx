import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Play, ArrowLeft, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import PlayerAvatar from '@/components/PlayerAvatar';
import { RoomState, GAMES } from '@/lib/gameTypes';

interface LobbyScreenProps {
  room: RoomState;
  playerId: string;
  onStart: () => void;
  onLeave: () => void;
}

export default function LobbyScreen({ room, playerId, onStart, onLeave }: LobbyScreenProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const isHost = room.hostId === playerId;
  const game = GAMES[room.gameType];
  const canStart = room.players.length >= (game?.minPlayers || 2);

  const copyCode = () => {
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-lg mx-auto text-center">
      <Button variant="ghost" onClick={onLeave} className="mb-6 text-muted-foreground">
        <ArrowLeft size={16} className="mr-2" /> {t('room.leaveLobby')}
      </Button>

      <div className="mb-6">
        <span className="text-4xl">{game?.emoji}</span>
        <h2 className="font-display text-2xl font-bold text-foreground mt-2">{game?.name}</h2>
      </div>

      <div className="card-game rounded-2xl p-6 mb-6">
        <p className="text-sm text-muted-foreground mb-2">{t('room.roomCode')}</p>
        <button onClick={copyCode} className="room-code text-gradient inline-flex items-center gap-3 hover:opacity-80 transition-opacity">
          {room.code}
          {copied ? <Check size={20} className="text-secondary" /> : <Copy size={20} className="text-muted-foreground" />}
        </button>
        <p className="text-xs text-muted-foreground mt-2">{t('room.shareCode')}</p>
      </div>

      <div className="card-game rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Users size={18} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{room.players.length} / {game?.maxPlayers || 8} {t('common.players')}</span>
        </div>
        <div className="flex flex-wrap justify-center gap-4">
          {room.players.map((player, i) => (
            <motion.div key={player.id} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}>
              <PlayerAvatar player={player} size="lg" />
            </motion.div>
          ))}
          {room.players.length === 0 && (
            <div className="py-8">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground/30 mx-auto mb-3 lobby-pulse" />
              <p className="text-sm text-muted-foreground">{t('room.waitingPlayers')}</p>
            </div>
          )}
        </div>
      </div>

      {isHost ? (
        <Button onClick={onStart} disabled={!canStart} className="btn-play text-lg px-8 py-3 disabled:opacity-50" size="lg">
          <Play size={20} className="mr-2" />
          {canStart ? t('room.startGame') : t('room.needMore', { count: (game?.minPlayers || 2) - room.players.length })}
        </Button>
      ) : (
        <div className="card-game rounded-xl p-4">
          <div className="animate-float text-3xl mb-2">⏳</div>
          <p className="text-muted-foreground text-sm">{t('room.waitingHost')}</p>
        </div>
      )}
    </motion.div>
  );
}
