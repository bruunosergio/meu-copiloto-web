import axios from 'axios';
import { useEffect, useState } from 'react';

export function estaOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const ligar = () => setOnline(true);
    const desligar = () => setOnline(false);
    window.addEventListener('online', ligar);
    window.addEventListener('offline', desligar);
    return () => {
      window.removeEventListener('online', ligar);
      window.removeEventListener('offline', desligar);
    };
  }, []);
  return online;
}

export function isNetworkError(error: unknown): boolean {
  if (estaOffline()) return true;
  if (!axios.isAxiosError(error)) return false;
  return !error.response && (error.code === 'ERR_NETWORK' || error.message === 'Network Error');
}
