// frontend/src/services/toast.service.ts
import { toast, ToastOptions } from 'react-toastify';

// Default toast options
const defaultOptions: ToastOptions = {
  position: 'bottom-right', // Changed to bottom-right
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
};

class ToastService {
  // Success notification
  success(message: string, options?: ToastOptions) {
    return toast.success(message, {
      ...defaultOptions,
      ...options,
    });
  }

  // Error notification
  error(message: string, options?: ToastOptions) {
    return toast.error(message, {
      ...defaultOptions,
      ...options,
    });
  }

  // Warning notification
  warning(message: string, options?: ToastOptions) {
    return toast.warning(message, {
      ...defaultOptions,
      ...options,
    });
  }

  // Info notification
  info(message: string, options?: ToastOptions) {
    return toast.info(message, {
      ...defaultOptions,
      ...options,
    });
  }

  // Loading notification (returns toast ID to update later)
  loading(message: string = 'Loading...', options?: ToastOptions) {
    return toast.loading(message, {
      ...defaultOptions,
      ...options,
    });
  }

  // Update existing toast
  update(toastId: string | number, options: Partial<ToastOptions> & { render?: string; type?: 'success' | 'error' | 'info' | 'warning' }) {
    toast.update(toastId, {
      ...options,
      isLoading: false,
      autoClose: options.autoClose ?? 3000,
    });
  }

  // Dismiss toast
  dismiss(toastId?: string | number) {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss(); // Dismiss all toasts
    }
  }

  // Promise-based toast (shows loading -> success/error)
  promise<T>(
    promise: Promise<T>,
    messages: {
      pending?: string;
      success?: string;
      error?: string;
    }
  ): Promise<T> {
    return toast.promise(
      promise,
      {
        pending: messages.pending || 'Loading...',
        success: messages.success || 'Success!',
        error: messages.error || 'Something went wrong',
      }
    ) as Promise<T>;
  }
}

// Export singleton instance
export const toastService = new ToastService();
export default toastService;