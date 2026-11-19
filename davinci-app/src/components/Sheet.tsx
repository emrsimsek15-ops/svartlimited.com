import { AnimatePresence, m, type PanInfo } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { useIsPhone } from '../hooks/useMedia';
import { strings } from '../i18n';

/** Bottom sheet on phones, side panel on iPad/desktop. */
export function Sheet({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; wide?: boolean }) {
  const phone = useIsPhone();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 110 || info.velocity.y > 600) onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <m.div className="absolute inset-0 bg-black/55" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={onClose} />
          {phone ? (
            <m.div
              className="glass absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-[22px] border-t border-line/[0.1] shadow-2xl"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 420, damping: 40 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={onDragEnd}
            >
              <div className="flex justify-center pt-2.5" aria-hidden="true">
                <div className="h-1 w-10 rounded-full bg-line/20" />
              </div>
              <Header title={title} onClose={onClose} />
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(20px+var(--safe-bottom))]">{children}</div>
            </m.div>
          ) : (
            <m.div
              className={`glass absolute bottom-0 right-0 top-0 flex w-full flex-col border-l border-line/[0.1] shadow-2xl ${wide ? 'max-w-[560px]' : 'max-w-[460px]'}`}
              style={{ paddingTop: 'var(--safe-top)', paddingRight: 'var(--safe-right)' }}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 420, damping: 42 }}
            >
              <Header title={title} onClose={onClose} />
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8">{children}</div>
            </m.div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
}

function Header({ title, onClose }: { title: ReactNode; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-2 sm:px-5 sm:pt-4">
      <h2 className="min-w-0 truncate text-[17px] font-semibold">{title}</h2>
      <button className="icon-btn" onClick={onClose} aria-label={strings.common.close}>
        <X size={20} />
      </button>
    </div>
  );
}
