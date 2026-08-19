import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Role, User } from '../../domain';
import { useAuth } from './AuthContext';

/** Terminal compartilhado: depois disso sem interação, volta ao seletor de nomes (ver ADR-0007 do backend). */
const INATIVIDADE_LIMITE_MS = 2 * 60 * 1000;
const EVENTOS_DE_ATIVIDADE = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'] as const;

/**
 * So se aplica a VENDEDOR: ADMIN/COMPRADOR usam o painel de qualquer lugar,
 * sem terminal compartilhado, entao nao faz sentido deslogar por inatividade.
 */
export function useVendedorInactivityTimeout(user: User | null) {
  const { trocarVendedor } = useAuth();
  const navigate = useNavigate();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (user?.papel !== Role.VENDEDOR) {
      return;
    }

    function resetTimer() {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        trocarVendedor();
        navigate('/loja/vendedores', { replace: true });
      }, INATIVIDADE_LIMITE_MS);
    }

    resetTimer();
    EVENTOS_DE_ATIVIDADE.forEach((evento) => window.addEventListener(evento, resetTimer));

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      EVENTOS_DE_ATIVIDADE.forEach((evento) => window.removeEventListener(evento, resetTimer));
    };
  }, [user, trocarVendedor, navigate]);
}
