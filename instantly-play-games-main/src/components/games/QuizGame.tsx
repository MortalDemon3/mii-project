import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player } from '@/lib/gameTypes';
import { generateQuizQuestions, QuizQuestion } from '@/lib/generateQuestions';
import { useTranslation } from 'react-i18next';

interface QuizGameProps {
  players: Player[];
  playerId: string;
  broadcast: (event: string, payload: any) => void;
  gameState: any;
  onGameEnd: (scores: Record<string, number>) => void;
}

const QUESTION_TIME = 15;
const TOTAL_QUESTIONS = 5;

export default function QuizGame({ players, playerId, broadcast, gameState, onGameEnd }: QuizGameProps) {
  const { i18n, t } = useTranslation();
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timer, setTimer] = useState(QUESTION_TIME);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [showResult, setShowResult] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState<number | null>(null);
  const [questionOrder, setQuestionOrder] = useState<number[]>([]);
  const [answered, setAnswered] = useState(false);
  const [loading, setLoading] = useState(true);

  const isHost = players.find(p => p.isHost)?.id === playerId;

  // Generate questions on mount
  useEffect(() => {
    const initialScores: Record<string, number> = {};
    players.forEach(p => initialScores[p.id] = 0);
    setScores(initialScores);

    if (isHost) {
      setLoading(true);
      generateQuizQuestions(i18n.language, 15).then(generatedQuestions => {
        setQuestions(generatedQuestions);
        setLoading(false);

        const shuffled = [...Array(generatedQuestions.length).keys()]
            .sort(() => Math.random() - 0.5)
            .slice(0, TOTAL_QUESTIONS);

        setQuestionOrder(shuffled);
        const q = generatedQuestions[shuffled[0]];
        setCurrentQuestion(q);

        broadcast('game_state', {
          type: 'quiz_init',
          questions: generatedQuestions,
          questionIndex: 0,
          question: q.question,
          options: q.options,
          questionOrder: shuffled,
          scores: initialScores,
        });
      });
    }
  }, []);

  // Listen for game state
  useEffect(() => {
    if (!gameState) return;

    if (gameState.type === 'quiz_init') {
      setQuestions(gameState.questions);
      setQuestionOrder(gameState.questionOrder);
      setQuestionIndex(gameState.questionIndex);
      setCurrentQuestion({ question: gameState.question, options: gameState.options, answer: -1 });
      setSelectedAnswer(null);
      setShowResult(false);
      setCorrectAnswer(null);
      setAnswered(false);
      setTimer(QUESTION_TIME);
      if (gameState.scores) setScores(gameState.scores);
      setLoading(false);
    }

    if (gameState.type === 'quiz_question') {
      setQuestionIndex(gameState.questionIndex);
      setCurrentQuestion({ question: gameState.question, options: gameState.options, answer: -1 });
      setSelectedAnswer(null);
      setShowResult(false);
      setCorrectAnswer(null);
      setAnswered(false);
      setTimer(QUESTION_TIME);
      if (gameState.scores) setScores(gameState.scores);
    }

    if (gameState.type === 'quiz_reveal') {
      setCorrectAnswer(gameState.correctAnswer);
      setShowResult(true);
      if (gameState.scores) setScores(gameState.scores);
    }

    if (gameState.type === 'quiz_answer') {
      if (gameState.correct) {
        setScores(prev => ({
          ...prev,
          [gameState.playerId]: (prev[gameState.playerId] || 0) + gameState.points,
        }));
      }
    }

    if (gameState.type === 'quiz_end') {
      onGameEnd(gameState.scores);
    }
  }, [gameState]);

  // Timer
  useEffect(() => {
    if (!currentQuestion || showResult || loading) return;
    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          if (isHost) revealAnswer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentQuestion, showResult, isHost, questionIndex, loading]);

  const revealAnswer = useCallback(() => {
    const qIdx = questionOrder[questionIndex];
    if (qIdx === undefined || questions.length === 0) return;
    const q = questions[qIdx];
    broadcast('game_state', {
      type: 'quiz_reveal',
      correctAnswer: q.answer,
      scores,
    });

    setTimeout(() => {
      const nextIdx = questionIndex + 1;
      if (nextIdx >= TOTAL_QUESTIONS || nextIdx >= questionOrder.length) {
        broadcast('game_state', { type: 'quiz_end', scores });
        return;
      }
      const nextQ = questions[questionOrder[nextIdx]];
      broadcast('game_state', {
        type: 'quiz_question',
        questionIndex: nextIdx,
        question: nextQ.question,
        options: nextQ.options,
        scores,
      });
    }, 3000);
  }, [questionOrder, questionIndex, scores, broadcast, questions]);

  const handleAnswer = (answerIdx: number) => {
    if (answered || showResult) return;
    setSelectedAnswer(answerIdx);
    setAnswered(true);

    const qIdx = questionOrder[questionIndex];
    if (qIdx === undefined || questions.length === 0) return;
    const q = questions[qIdx];
    const correct = answerIdx === q.answer;
    const points = correct ? Math.max(50, timer * 10) : 0;

    broadcast('game_state', {
      type: 'quiz_answer',
      playerId,
      correct,
      points,
    });

    if (correct) {
      setScores(prev => ({
        ...prev,
        [playerId]: (prev[playerId] || 0) + points,
      }));
    }
  };

  const optionColors = ['bg-rose-500/20 border-rose-500/50', 'bg-blue-500/20 border-blue-500/50', 'bg-green-500/20 border-green-500/50', 'bg-amber-500/20 border-amber-500/50'];
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
            {i18n.language === 'fr' ? 'Génération des questions...' : 'Generating questions...'}
          </p>
        </div>
    );
  }

  return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <span className="font-display text-lg">Q{questionIndex + 1}/{TOTAL_QUESTIONS}</span>
          <motion.div
              key={timer}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className={`font-display text-3xl font-bold ${timer <= 5 ? 'text-destructive' : 'text-accent'}`}
          >
            {timer}
          </motion.div>
          <div className="flex gap-3">
            {players.slice(0, 4).map(p => (
                <div key={p.id} className="text-center">
                  <div className="text-xs text-muted-foreground truncate max-w-[60px]">{p.name}</div>
                  <div className="font-display font-bold text-sm text-foreground">{scores[p.id] || 0}</div>
                </div>
            ))}
          </div>
        </div>

        <motion.div
            key={questionIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-game rounded-2xl p-8 mb-6"
        >
          <h2 className="font-display text-xl md:text-2xl font-bold text-center text-foreground">
            {currentQuestion?.question}
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AnimatePresence mode="wait">
            {currentQuestion?.options.map((option, i) => {
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
              {selectedAnswer === correctAnswer ? (
                  <p className="font-display text-xl text-secondary">{t('games.quiz.correct')}</p>
              ) : selectedAnswer !== null ? (
                  <p className="font-display text-xl text-destructive">{t('games.quiz.wrong')}</p>
              ) : (
                  <p className="font-display text-xl text-muted-foreground">{t('games.quiz.timesUp')}</p>
              )}
            </motion.div>
        )}
      </div>
  );
}