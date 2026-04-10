import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GameType, Player, RoomState, generateRoomCode } from '@/lib/gameTypes';
import { RealtimeChannel } from '@supabase/supabase-js';

export function useRoom(playerId: string, playerName: string, playerAvatar?: string, isGuest: boolean = true) {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const joinChannel = useCallback((roomCode: string, isHost: boolean) => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase.channel(`room:${roomCode}`, {
      config: { presence: { key: playerId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const players: Player[] = Object.entries(presenceState).map(([key, data]: [string, any]) => {
          const p = data[0];
          return {
            id: key,
            name: p.name || 'Player',
            avatarUrl: p.avatarUrl,
            isHost: p.isHost || false,
            isGuest: p.isGuest !== false,
            score: p.score || 0,
            connected: true,
          };
        });

        setRoom(prev => prev ? { ...prev, players } : null);
      })
      .on('broadcast', { event: 'game_state' }, ({ payload }) => {
        setRoom(prev => prev ? { ...prev, gameState: payload } : null);
      })
      .on('broadcast', { event: 'game_status' }, ({ payload }) => {
        setRoom(prev => prev ? { ...prev, status: payload.status } : null);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            name: playerName,
            avatarUrl: playerAvatar,
            isHost,
            isGuest,
            score: 0,
          });
        }
      });

    channelRef.current = channel;
  }, [playerId, playerName, playerAvatar, isGuest]);

  const createRoom = useCallback(async (gameType: GameType) => {
    const code = generateRoomCode();
    
    const { error: dbError } = await supabase.from('rooms').insert({
      code,
      host_id: playerId,
      game_type: gameType,
      status: 'waiting',
    });

    if (dbError) {
      setError(dbError.message);
      return null;
    }

    const newRoom: RoomState = {
      code,
      hostId: playerId,
      gameType,
      status: 'waiting',
      players: [],
      gameState: null,
    };

    setRoom(newRoom);
    joinChannel(code, true);
    return code;
  }, [playerId, joinChannel]);

  const joinRoom = useCallback(async (code: string) => {
    const { data, error: dbError } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (dbError || !data) {
      setError('Room not found');
      return false;
    }

    if (data.status !== 'waiting') {
      setError('Game already in progress');
      return false;
    }

    const roomState: RoomState = {
      code: data.code,
      hostId: data.host_id,
      gameType: data.game_type as GameType,
      status: data.status as 'waiting' | 'playing' | 'finished',
      players: [],
      gameState: null,
    };

    setRoom(roomState);
    joinChannel(data.code, false);
    return true;
  }, [joinChannel]);

  const broadcast = useCallback((event: string, payload: any) => {
    channelRef.current?.send({
      type: 'broadcast',
      event,
      payload,
    });
  }, []);

  const updatePresence = useCallback(async (data: Record<string, any>) => {
    await channelRef.current?.track({
      name: playerName,
      avatarUrl: playerAvatar,
      isHost: room?.hostId === playerId,
      isGuest,
      ...data,
    });
  }, [playerName, playerAvatar, room?.hostId, playerId, isGuest]);

  const startGame = useCallback(async () => {
    if (!room) return;
    await supabase.from('rooms').update({ status: 'playing' }).eq('code', room.code);
    broadcast('game_status', { status: 'playing' });
    setRoom(prev => prev ? { ...prev, status: 'playing' } : null);
  }, [room, broadcast]);

  const leaveRoom = useCallback(async () => {
    if (channelRef.current) {
      await channelRef.current.untrack();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setRoom(null);
  }, []);

  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  return {
    room,
    error,
    setError,
    createRoom,
    joinRoom,
    broadcast,
    updatePresence,
    startGame,
    leaveRoom,
    setRoom,
  };
}
