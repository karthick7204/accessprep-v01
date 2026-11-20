/**
 * ACCESSPREP-X — useAiTutor Hook
 */

import { useState, useCallback } from 'react';
import {
  sendTutorMessage,
  type TutorMessage
} from '../services/aiTutor.service.ts';

export function useAiTutor(userId?: string) {
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const askTutor = useCallback(
    async (text: string, subject: string, customApiKey?: string) => {
      setIsLoading(true);
      try {
        const res = await sendTutorMessage(
          { userId, message: text, subject },
          customApiKey
        );
        return res.reply;
      } finally {
        setIsLoading(false);
      }
    },
    [userId]
  );

  return {
    messages,
    setMessages,
    isLoading,
    askTutor
  };
}
