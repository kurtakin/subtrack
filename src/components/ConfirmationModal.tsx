import React from 'react';
import { motion } from 'motion/react';
import { Trash2, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from '../context/LanguageContext';

export const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  variant = "danger"
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "info";
}) => {
  const { t } = useTranslation();
  if (!isOpen) return null;
  const resolvedConfirmText = confirmText || (variant === 'danger' ? t('delete') : t('confirm'));
  const resolvedCancelText = cancelText || t('cancel');
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 dark:border-gray-800"
      >
        <div className="p-6 text-center">
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
            variant === 'danger' ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
          )}>
            {variant === 'danger' ? <Trash2 className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
          </div>
          <h2 className="text-xl font-bold mb-2 dark:text-white">{title}</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
            {message}
          </p>
        </div>
        <div className="p-6 bg-gray-50 dark:bg-gray-800/50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 font-bold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
          >
            {resolvedCancelText}
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={cn(
              "flex-1 py-3 text-white rounded-xl font-bold transition-all shadow-lg cursor-pointer",
              variant === 'danger' ? "bg-red-600 hover:bg-red-700 shadow-red-200 dark:shadow-none" : "bg-blue-600 hover:bg-blue-700 shadow-blue-200 dark:shadow-none"
            )}
          >
            {resolvedConfirmText}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
