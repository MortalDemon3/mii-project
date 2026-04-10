import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

export type Difficulty = 'easy' | 'medium' | 'hard';

interface DifficultySelectorProps {
    gameEmoji: string;
    gameName: string;
    onSelect: (d: Difficulty, questionCount?: number) => void;
    onBack: () => void;
    showQuestionCount?: boolean;
}

const DIFFICULTIES: { key: Difficulty; color: string }[] = [
    { key: 'easy', color: 'from-green-400 to-emerald-500' },
    { key: 'medium', color: 'from-amber-400 to-orange-500' },
    { key: 'hard', color: 'from-red-500 to-rose-600' },
];

const QUESTION_COUNTS = [5, 10, 25];

export default function DifficultySelector({ gameEmoji, gameName, onSelect, onBack, showQuestionCount = false }: DifficultySelectorProps) {
    const { t } = useTranslation();
    const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
    const [selectedCount, setSelectedCount] = useState<number>(5);

    const handleDifficultyClick = (key: Difficulty) => {
        if (!showQuestionCount) {
            onSelect(key);
            return;
        }
        setSelectedDifficulty(key);
    };

    const handleStart = () => {
        if (!selectedDifficulty) return;
        onSelect(selectedDifficulty, selectedCount);
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto text-center">
            <div className="text-5xl mb-3">{gameEmoji}</div>
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">{gameName}</h2>
            <p className="text-muted-foreground mb-6">{t('difficulty.title')}</p>

            <div className="space-y-3 mb-6">
                {DIFFICULTIES.map(({ key, color }) => (
                    <motion.button
                        key={key}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleDifficultyClick(key)}
                        className={`w-full card-game rounded-xl p-4 flex items-center gap-4 text-left relative overflow-hidden group ${showQuestionCount && selectedDifficulty === key ? 'ring-2 ring-primary' : ''}`}
                    >
                        <div className={`absolute inset-0 bg-gradient-to-r ${color} opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none`} />
                        <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${color}`} />
                        <div>
                            <div className="font-display font-bold text-foreground">{t(`difficulty.${key}`)}</div>
                            <div className="text-xs text-muted-foreground">{t(`difficulty.${key}Desc`)}</div>
                        </div>
                    </motion.button>
                ))}
            </div>

            {showQuestionCount && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
                    <p className="text-muted-foreground text-sm mb-3">
                        {t('difficulty.questionCount')}
                    </p>
                    <div className="flex gap-3 justify-center">
                        {QUESTION_COUNTS.map(count => (
                            <motion.button
                                key={count}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setSelectedCount(count)}
                                className={`w-16 h-16 rounded-xl font-display font-bold text-lg transition-all ${selectedCount === count ? 'bg-primary text-primary-foreground ring-2 ring-primary' : 'card-game text-foreground'}`}
                            >
                                {count}
                            </motion.button>
                        ))}
                    </div>
                </motion.div>
            )}

            {showQuestionCount && selectedDifficulty && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4">
                    <Button onClick={handleStart} className="btn-play w-full">
                        {t('difficulty.start')}
                    </Button>
                </motion.div>
            )}

            <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
                {t('room.pickDifferent')}
            </Button>
        </motion.div>
    );
}