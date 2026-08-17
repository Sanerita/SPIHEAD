export type ToastType = 'success' | 'info' | 'error' | 'warning';

export interface ToastMessage {
  id: string;
  text: string;
  type: ToastType;
}

type ToastListener = (toast: ToastMessage | null) => void;

class ToastService {
  private listeners: ToastListener[] = [];
  private currentToast: ToastMessage | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  public subscribe(listener: ToastListener): () => void {
    this.listeners.push(listener);
    // Immediately inform subscriber of current state
    listener(this.currentToast);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public showToast(text: string, type: ToastType = 'success', duration = 5000): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    const toast: ToastMessage = {
      id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text,
      type,
    };
    this.currentToast = toast;
    this.notify();

    this.timer = setTimeout(() => {
      this.currentToast = null;
      this.notify();
    }, duration);
  }

  public hideToast(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.currentToast = null;
    this.notify();
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentToast);
      } catch (err) {
        console.error('Toast listener error:', err);
      }
    });
  }
}

export const toastService = new ToastService();
