'use client';

import { toast as sonnerToast } from 'sonner';

type ToastAction = {
  label: string;
  onClick: () => void;
};

type ToastOptions = {
  description?: string;
  duration?: number;
  action?: ToastAction;
};

export const appToast = {
  success(message: string, options?: ToastOptions) {
    return sonnerToast.success(message, {
      description: options?.description,
      duration: options?.duration ?? 4000,
      action: options?.action
        ? { label: options.action.label, onClick: options.action.onClick }
        : undefined,
    });
  },

  error(message: string, options?: ToastOptions) {
    return sonnerToast.error(message, {
      description: options?.description,
      duration: options?.duration ?? 5000,
      action: options?.action
        ? { label: options.action.label, onClick: options.action.onClick }
        : undefined,
    });
  },

  warning(message: string, options?: ToastOptions) {
    return sonnerToast.warning(message, {
      description: options?.description,
      duration: options?.duration ?? 4500,
      action: options?.action
        ? { label: options.action.label, onClick: options.action.onClick }
        : undefined,
    });
  },

  loading(message: string, options?: Pick<ToastOptions, 'description'>) {
    return sonnerToast.loading(message, {
      description: options?.description,
    });
  },

  dismiss(id?: string | number) {
    sonnerToast.dismiss(id);
  },

  promise<T>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string },
  ) {
    return sonnerToast.promise(promise, messages);
  },

  undo(message: string, onUndo: () => void, options?: Pick<ToastOptions, 'description'>) {
    return sonnerToast(message, {
      description: options?.description,
      duration: 6000,
      action: {
        label: 'Undo',
        onClick: onUndo,
      },
    });
  },
};

export { sonnerToast as toast };
