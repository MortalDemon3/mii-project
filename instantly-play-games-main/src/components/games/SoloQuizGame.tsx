import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { generateQuizQuestions, translateText, QuizQuestion } from '@/lib/generateQuestions';
import { Difficulty } from '@/components/DifficultySelector';
import { Languages } from 'lucide-react';

interface SoloQuizGameProps {
  playerId: string;
  playerName: string;
  difficulty: Difficulty;
  questionCount?: number;
  onGameEnd: (scores: Record<string, number>) => void;
}

const QUESTION_TIME = 15;

export default function SoloQuizGame({ playerId, playerName, difficulty, questionCount = 5, onGameEnd }: SoloQuizGameProps) {
  const { t, i18n } = useTranslation();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timer, setTimer] = useState(QUESTION_TIME);
  const [scores, setScores] = useState<Record<string, number>>({ [playerId]: 0 });
  const [showResult, setShowResult] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState<number | null>(null);
  const [questionOrder, setQuestionOrder] = useState<number[]>([]);
  const [answered, setAnswered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [translated, setTranslated] = useState(false);
  const [translatedQuestion, setTranslatedQuestion] = useState<QuizQuestion | null>(null);

  useEffect(() => {
    setLoading(true);
    generateQuizQuestions(i18n.language, Math.max(questionCount, 15)).then(generated => {
      setQuestions(generated);
      const shuffled = [...Array(generated.length).keys()]
          .sort(() => Math.random() - 0.5)
          .slice(0, questionCount);
      setQuestionOrder(shuffled);
      setCurrentQuestion(generated[shuffled[0]]);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    setTranslated(false);
    setTranslatedQuestion(null);
  }, [questionIndex]);

  useEffect(() => {
    if (!currentQuestion || showResult || loading) return;
    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) { clearInterval(interval); revealAnswer(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentQuestion, showResult, questionIndex, loading]);

  const handleTranslate = async () => {
    if (!currentQuestion || translating || translated) return;
    setTranslating(true);
    try {
      const [translatedQ, ...translatedOptions] = await Promise.all([
        translateText(currentQuestion.question),
        ...currentQuestion.options.map(o => translateText(o)),
      ]);
      setTranslatedQuestion({
        question: translatedQ,
        options: translatedOptions,
        answer: currentQuestion.answer,
      });
      setTranslated(true);
    } finally {
      setTranslating(false);
    }
  };

  const displayQuestion = translated && translatedQuestion ? translatedQuestion : currentQuestion;

  const revealAnswer = useCallback(() => {
    const qIdx = questionOrder[questionIndex];
    if (qIdx === undefined || questions.length === 0) return;
    const q = questions[qIdx];
    setCorrectAnswer(q.answer);
    setShowResult(true);

    setTimeout(() => {
      const nextIdx = questionIndex + 1;
      if (nextIdx >= questionCount || nextIdx >= questionOrder.length) {
        setScores(prev => { onGameEnd(prev); return prev; });
        return;
      }
      const nextQ = questions[questionOrder[nextIdx]];
      setQuestionIndex(nextIdx);
      setCurrentQuestion(nextQ);
      setSelectedAnswer(null);
      setShowResult(false);
      setCorrectAnswer(null);
      setAnswered(false);
      setTimer(QUESTION_TIME);
    }, 3000);
  }, [questionOrder, questionIndex, onGameEnd, questions, questionCount]);

  const handleAnswer = (answerIdx: number) => {
    if (answered || showResult) return;
    setSelectedAnswer(answerIdx);
    setAnswered(true);
    const qIdx = questionOrder[questionIndex];
    if (qIdx === undefined || questions.length === 0) return;
    const q = questions[qIdx];
    const correct = answerIdx === q.answer;
    if (correct) {
      const points = Math.max(50, timer * 10);
      setScores(prev => ({ ...prev, [playerId]: prev[playerId] + points }));
    }
  };

  const optionColors = [
    'bg-rose-500/20 border-rose-500/50',
    'bg-blue-500/20 border-blue-500/50',
    'bg-green-500/20 border-green-500/50',
    'bg-amber-500/20 border-amber-500/50',
  ];
  const optionLabels = ['A', 'B', 'C', 'D'];

  if (loading) {
    return (
        <div className="max-w-2xl mx-auto text-center py-20">
          <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="text-6xl mb-6 inline-block"
          >
            ❓
          </motion.div>
          <p className="font-display text-xl text-muted-foreground">
            {i18n.language === 'fr' ? 'Chargement des questions...' : 'Loading questions...'}
          </p>
        </div>
    );
  }

  return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <span className="font-display text-lg">Q{questionIndex + 1}/{questionCount}</span>
          <motion.div
              key={timer}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className={`font-display text-3xl font-bold ${timer <= 5 ? 'text-destructive' : 'text-accent'}`}
          >
            {timer}
          </motion.div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">{playerName}</div>
            <div className="font-display font-bold text-sm text-foreground">{scores[playerId]}</div>
          </div>
        </div>

        <motion.div
            key={questionIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-game rounded-2xl p-8 mb-4 relative"
        >
          <h2 className="font-display text-xl md:text-2xl font-bold text-center text-foreground">
            {displayQuestion?.question}
          </h2>

          {!translated && !showResult && (
              <button
                  onClick={handleTranslate}
                  disabled={translating}
                  className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground text-xs font-display transition-colors disabled:opacity-50"
              >
                <Languages size={14} />
                {translating ? '...' : '🇫🇷 Traduire'}
              </button>
          )}

          {translated && (
              <div className="absolute bottom-3 right-3 text-xs text-muted-foreground flex items-center gap-1">
                <Languages size={12} /> Traduit
              </div>
          )}
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AnimatePresence mode="wait">
            {displayQuestion?.options.map((option, i) => {
              let extraClass = '';
              if (showResult) {
                if (i === correctAnswer) extraClass = 'ring-2 ring-secondary bg-secondary/20';
                else if (i === selectedAnswer && i !== correctAnswer) extraClass = 'ring-2 ring-destructive bg-destructive/20 opacity-60';
                else extraClass = 'opacity-40';
              } else if (i === selectedAnswer) {
                extraClass = 'ring-2 ring-primary';
              }
              return (
                  <motion.button
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => handleAnswer(i)}
                      disabled={answered || showResult}
                      className={`${optionColors[i]} border rounded-xl p-4 text-left transition-all hover:scale-[1.02] disabled:cursor-default ${extraClass}`}
                  >
                    <span className="font-display font-bold text-foreground/50 mr-3">{optionLabels[i]}</span>
                    <span className="text-foreground font-medium">{option}</span>
                  </motion.button>
              );
            })}
          </AnimatePresence>
        </div>

        {showResult && correctAnswer !== null && (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mt-6"
            >
              {selectedAnswer === correctAnswer
                  ? <p className="font-display text-xl text-secondary">{t('games.quiz.correct')}</p>
                  : selectedAnswer !== null
                      ? <p className="font-display text-xl text-destructive">{t('games.quiz.wrong')}</p>
                      : <p className="font-display text-xl text-muted-foreground">{t('games.quiz.timesUp')}</p>
              }
            </motion.div>
        )}
      </div>
  );
}