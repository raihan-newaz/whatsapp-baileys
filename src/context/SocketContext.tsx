'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { createClient } from '@/lib/supabase';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let s: Socket | null = null;
    
    const initSocket = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
        s = io(backendUrl);

        s.on('connect', () => {
          console.log('[Socket] Connected');
          setIsConnected(true);
          s?.emit('join', data.user.id);
        });

        s.on('disconnect', () => {
          console.log('[Socket] Disconnected');
          setIsConnected(false);
        });

        setSocket(s);
      }
    };

    initSocket();

    return () => {
      if (s) s.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
