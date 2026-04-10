import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Gamepad2, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useGlobalAuth } from '@/context/AuthContext';
import { usePlayerIdentity } from '@/hooks/usePlayerIdentity';
import { useRoom } from '@/hooks/useRoom';
import { GameType, GAMES, Player } from '@/lib/gameTypes';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Components
import GamePicker from '@/components/GamePicker';
import AuthModal from '@/components/AuthModal';
import AuthScreen from '@/components/AuthScreen';
import JoinCreateRoom from '@/components/JoinCreateRoom';
import LobbyScreen from '@/components/LobbyScreen';
import Scoreboard from '@/components/Scoreboard';
import ProfilePage from '@/components/ProfilePage';
import DifficultySelector, { Difficulty } from '@/components/DifficultySelector';
import LanguageToggle from '@/components/LanguageToggle';

// Games
import PictionaryGame from '@/components/games/PictionaryGame';
import ReactionGame from '@/components/games/ReactionGame';
import QuizGame from '@/components/games/QuizGame';
import FroggerGame from '@/components/games/FroggerGame';
import TicTacToe from '@/components/games/TicTacToe';
import SoloReactionGame from '@/components/games/SoloReactionGame';
import SoloQuizGame from '@/components/games/SoloQuizGame';
import SoloPictionaryGame from '@/components/games/SoloPictionaryGame';
import Connect4Game from '@/components/games/Connect4Game';
import SoloTicTacToe from '@/components/games/SoloTicTacToe';
import SoloSnake from '@/components/games/SoloSnake';
import MemoryMatch from '@/components/games/MemoryMatch';
import SoloMemoryMatch from '@/components/games/SoloMemoryMatch';
import SoloDino from '@/components/games/SoloDino';

type Screen = 'home' | 'auth' | 'join' | 'lobby' | 'playing' | 'scoreboard' | 'profile' | 'difficulty';

export default function Index() {
  const { t } = useTranslation();
  const auth = useGlobalAuth();
  const player = usePlayerIdentity();

  const [screen, setScreen] = useState<Screen>('home');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [modalInitialView, setModalInitialView] = useState<"login" | "register" | "verify">("login");
  const [modalInitialEmail, setModalInitialEmail] = useState("");

  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const [gameMode, setGameMode] = useState<'solo' | 'multi'>('multi');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [finalScores, setFinalScores] = useState<Record<string, number>>({});
  const [finalPlayers, setFinalPlayers] = useState<Player[]>([]);

  const displayName = auth.isLoggedIn ? auth.user!.username : player.displayName;
  const playerId = auth.isLoggedIn ? auth.user!.id : player.id;

  const {
    room, error, setError, createRoom, joinRoom, broadcast, updatePresence, startGame, leaveRoom, setRoom,
  } = useRoom(playerId, displayName, player.avatarUrl, !auth.isLoggedIn && player.isGuest);

  useEffect(() => {
    if (room?.status === 'playing' && screen === 'lobby') {
      setScreen('playing');
    }
  }, [room?.status, screen]);

  // FIX #5 : retrait de `screen` des dépendances pour éviter les re-triggers intempestifs
  useEffect(() => {
    if (auth.isLoggedIn) {
      setScreen(prev => prev === 'auth' ? 'join' : prev);
      setShowAuthModal(false);
    }
  }, [auth.isLoggedIn]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const email = params.get('email');
    if (action === 'verify' && email) {
      setModalInitialEmail(email);
      setModalInitialView("verify");
      setShowAuthModal(true);
      window.history.replaceState({}, document.title, window.location.origin + window.location.pathname);
    }
  }, []);

  const handleLoginIntercept = async (email: string, pass: string) => {
    const res = await auth.login(email, pass);
    if (!res.success && res.needsVerification) {
      setModalInitialEmail(email);
      setModalInitialView("verify");
      setShowAuthModal(true);
      toast.info("Vérification requise. Entre le code reçu par mail.");
    }
  };

  const handleGameSelect = (gameType: GameType, mode: 'solo' | 'multi') => {
    const gameInfo = GAMES[gameType];
    setSelectedGame(gameType);
    setGameMode(mode);

    if (mode === 'solo') {
      if (gameInfo.minPlayers > 1) return;
      if (gameType === 'frogger' || gameType === 'dino') {
        setScreen('playing');
      } else {
        setScreen('difficulty');
      }
      return;
    }

    if (!auth.isLoggedIn && !player.displayName) {
      setScreen('auth');
    } else {
      setScreen('join');
    }
  };

  const handleDifficultySelect = (d: Difficulty, count?: number) => {
    setDifficulty(d);
    if (count) setQuestionCount(count);
    setScreen('playing');
  };

  const handleGuestPlay = (name: string) => {
    player.setGuestName(name);
    setScreen('join');
  };

  const handleCreateRoom = async () => {
    if (!selectedGame) return;
    const code = await createRoom(selectedGame);
    if (code) setScreen('lobby');
  };

  const handleJoinRoom = async (code: string) => {
    const success = await joinRoom(code);
    if (success) setScreen('lobby');
  };

  const handleStartGame = async () => {
    await startGame();
    setScreen('playing');
  };

  const handleGameEnd = useCallback(async (scores: Record<string, number>) => {
    const currentRoom = room;
    setFinalScores(scores);
    setFinalPlayers(currentRoom?.players || []);
    setScreen('scoreboard');
    leaveRoom();

    if (auth.isLoggedIn && currentRoom) {
      const myScore = scores[playerId] || 0;
      // FIX #2 : victoire seulement si le joueur a strictement le meilleur score (pas d'égalité)
      const otherScores = Object.entries(scores)
          .filter(([id]) => id !== playerId)
          .map(([, s]) => s);
      const won = myScore > 0 && otherScores.every(s => myScore > s);
      await supabase.from('game_stats').insert({
        user_id: playerId,
        game_type: currentRoom.gameType,
        score: myScore,
        won,
        room_code: currentRoom.code,
      });
    }
  }, [playerId, auth.isLoggedIn, room, leaveRoom]);

  // FIX #3 : sauvegarde en BDD pour les parties solo si l'utilisateur est connecté
  const handleSoloGameEnd = useCallback(async (scores: Record<string, number>) => {
    setFinalScores(scores);
    setScreen('scoreboard');

    if (auth.isLoggedIn && selectedGame) {
      const myScore = scores[playerId] || 0;
      await supabase.from('game_stats').insert({
        user_id: playerId,
        game_type: selectedGame,
        score: myScore,
        won: true, // en solo, toute partie terminée est une "victoire"
        room_code: null,
      });
    }
  }, [auth.isLoggedIn, playerId, selectedGame]);

  const handlePlayAgain = () => {
    if (gameMode === 'solo') {
      setScreen(selectedGame === 'frogger' || selectedGame === 'dino' ? 'playing' : 'difficulty');
      return;
    }
    setScreen('lobby');
    if (room) {
      setRoom(prev => prev ? { ...prev, status: 'waiting', gameState: null } : null);
    }
  };

  const handleHome = () => {
    leaveRoom();
    setSelectedGame(null);
    setScreen('home');
  };

  const renderSoloGame = () => {
    const name = displayName || 'Player';
    switch (selectedGame) {
      case 'reaction': return <SoloReactionGame playerId={playerId} playerName={name} difficulty={difficulty} onGameEnd={handleSoloGameEnd} />;
      case 'quiz': return <SoloQuizGame playerId={playerId} playerName={name} difficulty={difficulty} questionCount={questionCount} onGameEnd={handleSoloGameEnd} />;
      case 'pictionary': return <SoloPictionaryGame playerId={playerId} playerName={name} difficulty={difficulty} onGameEnd={handleSoloGameEnd} />;
        // FIX #4 : isGuest reflète l'état réel au lieu d'être hardcodé à true
      case 'frogger': return <FroggerGame players={[{ id: playerId, name, isHost: true, isGuest: !auth.isLoggedIn, score: 0, connected: true }]} playerId={playerId} broadcast={() => {}} gameState={null} onGameEnd={handleSoloGameEnd} />;
      case 'tictactoe': return <SoloTicTacToe playerName={name} difficulty={difficulty} onExit={handleHome} onGameEnd={(res) => handleSoloGameEnd({ [playerId]: res.wins, bot: res.losses })} />;
      case 'snake': return <SoloSnake playerName={name} difficulty={difficulty} onExit={handleHome} onGameEnd={(res) => handleSoloGameEnd({ [playerId]: res.score })} />;
      case 'memory': return <SoloMemoryMatch playerName={name} difficulty={difficulty} onExit={handleHome} onGameEnd={(res) => handleSoloGameEnd({ [playerId]: res.pairs })} />;
      case 'dino': return <SoloDino playerName={name} onExit={handleHome} onGameEnd={(res) => handleSoloGameEnd({ [playerId]: res.score })} />;
      default: return null;
    }
  };

  const renderMultiGame = () => {
    const playersInRoom = room?.players || [];
    const commonProps = {
      roomCode: room?.code || '',
      players: playersInRoom,
      playerId,
      broadcast,
      gameState: room?.gameState || null,
      onGameEnd: handleGameEnd,
    };
    switch (room?.gameType || selectedGame) {
      case 'pictionary': return <PictionaryGame {...commonProps} />;
      case 'reaction': return <ReactionGame {...commonProps} />;
      case 'quiz': return <QuizGame {...commonProps} />;
      case 'frogger': return <FroggerGame {...commonProps} />;
      case 'connect4': return <Connect4Game {...commonProps} />;
      case 'tictactoe': return <TicTacToe {...commonProps} onExit={handleHome} />;
      case 'memory':
        return (
            <MemoryMatch
                players={[playersInRoom[0]?.name || 'P1', playersInRoom[1]?.name || 'P2']}
                difficulty={difficulty}
                onExit={handleHome}
                onGameEnd={(res) => {
                  const scores: Record<string, number> = {};
                  if (playersInRoom[0]) scores[playersInRoom[0].id] = res.scores[0];
                  if (playersInRoom[1]) scores[playersInRoom[1].id] = res.scores[1];
                  handleGameEnd(scores);
                }}
            />
        );
      default: return null;
    }
  };

  const soloScoreboardPlayers = selectedGame ? [
    { id: playerId, name: displayName || 'Player', isHost: true, isGuest: !auth.isLoggedIn, score: 0, connected: true },
  ] : [];

  return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={handleHome} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Gamepad2 className="text-primary" size={28} />
                <h1 className="font-display text-2xl font-bold text-gradient">MiiProject</h1>
              </button>
              {auth.isLoggedIn && (
                  <button onClick={() => setScreen('profile')} className="ml-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors">
                    <User size={16} className="text-primary" />
                    <span className="text-sm font-display font-medium text-foreground">{auth.user!.username}</span>
                  </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <LanguageToggle />
              {!auth.isLoggedIn && (
                  <Button variant="outline" size="sm" onClick={() => { setModalInitialView("login"); setShowAuthModal(true); }} className="font-display">
                    <LogIn size={16} className="mr-2" /> {t('nav.loginSignup')}
                  </Button>
              )}
            </div>
          </div>
        </header>

        <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            initialView={modalInitialView}
            initialEmail={modalInitialEmail}
            onLogin={handleLoginIntercept}
            onRegister={auth.register}
            onVerify={auth.verify}
        />

        <main className="container mx-auto px-4 py-8">
          {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
                {error} <button onClick={() => setError(null)} className="ml-2 underline">{t('common.dismiss')}</button>
              </motion.div>
          )}

          <AnimatePresence mode="wait">
            {screen === 'home' && (
                <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="text-center mb-12">
                    <motion.h2 initial={{ y: -20 }} animate={{ y: 0 }} className="font-display text-4xl md:text-6xl font-bold text-gradient mb-4">{t('home.pickGame')}</motion.h2>
                    <p className="text-muted-foreground text-lg max-w-md mx-auto">{t('home.subtitle')}</p>
                  </div>
                  <GamePicker onSelect={handleGameSelect} />
                </motion.div>
            )}

            {screen === 'difficulty' && selectedGame && (
                <motion.div key="difficulty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <DifficultySelector
                      gameEmoji={GAMES[selectedGame].emoji}
                      gameName={GAMES[selectedGame].name}
                      onSelect={handleDifficultySelect}
                      onBack={handleHome}
                      showQuestionCount={selectedGame === 'quiz'}
                  />
                </motion.div>
            )}

            {screen === 'auth' && (
                <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h2 className="font-display text-2xl font-bold text-center text-foreground mb-6">{t('auth.title')}</h2>
                  <AuthScreen onGuestPlay={handleGuestPlay} onLogin={auth.login} onSignup={auth.register} />
                </motion.div>
            )}

            {screen === 'join' && selectedGame && (
                <motion.div key="join" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <JoinCreateRoom
                      gameType={selectedGame}
                      onCreateRoom={handleCreateRoom}
                      onJoinRoom={handleJoinRoom}
                      onBack={() => { setSelectedGame(null); setScreen('home'); }}
                  />
                </motion.div>
            )}

            {screen === 'lobby' && room && (
                <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <LobbyScreen room={room} playerId={playerId} onStart={handleStartGame} onLeave={handleHome} />
                </motion.div>
            )}

            {screen === 'playing' && (
                <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {gameMode === 'solo' ? renderSoloGame() : renderMultiGame()}
                </motion.div>
            )}

            {screen === 'scoreboard' && (
                <motion.div key="scoreboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Scoreboard
                      players={gameMode === 'solo' ? soloScoreboardPlayers : finalPlayers}
                      scores={finalScores}
                      onPlayAgain={handlePlayAgain}
                      onHome={handleHome}
                      isGuest={!auth.isLoggedIn}
                  />
                </motion.div>
            )}

            {screen === 'profile' && auth.isLoggedIn && auth.user && (
                <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <ProfilePage
                      user={auth.user}
                      onBack={() => setScreen('home')}
                      onLogout={() => { auth.logout(); setScreen('home'); }}
                      onUpdate={auth.updateProfile}
                      onDelete={async () => { await auth.deleteAccount(); setScreen('home'); }}
                  />
                </motion.div>
            )}
          </AnimatePresence>
        </main>

        <footer className="border-t border-border py-4 mt-auto">
          <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">{t('footer.tagline')}</div>
        </footer>
      </div>
  );
}