import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { GameInfo } from '@/lib/gameTypes';

interface HowToPlayModalProps {
  game: GameInfo;
  open: boolean;
  onClose: () => void;
}

export default function HowToPlayModal({ game, open, onClose }: HowToPlayModalProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl flex items-center gap-3">
            <span className="text-3xl">{game.emoji}</span>
            {t('howToPlay.title', { name: game.name })}
          </DialogTitle>
        </DialogHeader>
        <ol className="space-y-3 mt-4">
          {game.howToPlay.map((step, i) => (
            <li key={i} className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 text-primary font-display font-bold text-sm flex items-center justify-center">{i + 1}</span>
              <span className="text-foreground/80 text-sm pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}
