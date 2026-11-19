import { AnimatePresence, m } from 'framer-motion';
import { useEffect } from 'react';
import { useUI } from '../store/ui';

export function Toast() {
  const toast = useUI((s) => s.toast);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => useUI.setState({ toast: null }), 3200);
    return () => clearTimeout(t);
  }, [toast]);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--tabbar-h)+var(--safe-bottom)+12px)] z-[60] flex justify-center px-4 sm:bottom-6" aria-live="polite">
      <AnimatePresence>
        {toast && (
          <m.div key={toast.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.2 }} className={`glass pointer-events-auto max-w-md rounded-ctl border px-4 py-2.5 text-[14px] shadow-xl ${toast.tone === 'err' ? 'border-loss/30 text-loss' : 'border-line/10'}`}>
            {toast.text}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
