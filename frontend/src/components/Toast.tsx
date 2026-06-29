import { AnimatePresence, motion } from 'framer-motion';
import { useUiStore } from '../stores/uiStore';

export function Toast() {
  /** Displays the latest global toast message from the UI store. */
  const toast = useUiStore((state) => state.toast);
  const clearToast = useUiStore((state) => state.clearToast);

  return (
    <AnimatePresence>
      {toast && (
        <motion.button
          type="button"
          className={`legacy-toast ${toast.kind}`}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 14 }}
          onClick={clearToast}
        >
          {toast.message}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
