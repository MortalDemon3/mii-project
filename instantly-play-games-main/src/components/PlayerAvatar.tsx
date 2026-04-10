import { Player } from '@/lib/gameTypes';

interface PlayerAvatarProps {
  player: Player;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
}

export default function PlayerAvatar({ player, size = 'md', showName = true }: PlayerAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-lg',
  };

  const initial = (player.name || 'P').charAt(0).toUpperCase();

  const colors = [
    'from-pink-500 to-rose-500',
    'from-purple-500 to-indigo-500',
    'from-blue-500 to-cyan-500',
    'from-green-500 to-emerald-500',
    'from-orange-500 to-amber-500',
    'from-red-500 to-pink-500',
    'from-teal-500 to-green-500',
    'from-violet-500 to-purple-500',
  ];

  const colorIndex = player.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        {player.avatarUrl ? (
          <img
            src={player.avatarUrl}
            alt={player.name}
            className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-border`}
          />
        ) : (
          <div
            className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${colors[colorIndex]} flex items-center justify-center font-display font-bold text-primary-foreground ring-2 ring-border`}
          >
            {initial}
          </div>
        )}
        {player.isHost && (
          <span className="absolute -top-1 -right-1 text-xs">👑</span>
        )}
        {!player.connected && (
          <div className="absolute inset-0 rounded-full bg-background/60 flex items-center justify-center">
            <span className="text-xs">💤</span>
          </div>
        )}
      </div>
      {showName && (
        <span className="text-xs text-muted-foreground truncate max-w-[80px] text-center">
          {player.name}
          {player.isGuest && <span className="opacity-50"> (guest)</span>}
        </span>
      )}
    </div>
  );
}
