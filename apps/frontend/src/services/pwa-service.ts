/**
 * PWA Service - Progressive Web App functionality management
 * SemanticType: PWAService
 * ExtensibleByAI: true
 * AIUseCases: ["Service worker management", "Offline detection", "Install prompts", "Background sync"]
 */

export interface PWAInstallPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PWAUpdateAvailable {
  skipWaiting: () => void;
  addEventListener: (type: string, listener: () => void) => void;
}

export interface PWAServiceConfig {
  enableBackgroundSync?: boolean;
  enablePushNotifications?: boolean;
  updateCheckInterval?: number; // in milliseconds
  offlinePageUrl?: string;
}

/**
 * PWA Service for managing Progressive Web App features
 */
export class PWAService {
  private static instance: PWAService;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private installPromptEvent: PWAInstallPrompt | null = null;
  private isOnline = navigator.onLine;
  private updateAvailable = false;
  private config: PWAServiceConfig;
  private listeners = new Map<string, Set<Function>>();

  private constructor(config: PWAServiceConfig = {}) {
    this.config = {
      enableBackgroundSync: true,
      enablePushNotifications: true,
      updateCheckInterval: 60000, // 1 minute
      offlinePageUrl: '/offline',
      ...config
    };

    this.initializeEventListeners();
  }

  static getInstance(config?: PWAServiceConfig): PWAService {
    if (!PWAService.instance) {
      PWAService.instance = new PWAService(config);
    }
    return PWAService.instance;
  }

  /**
   * Initialize PWA service
   */
  async initialize(): Promise<void> {
    try {
      await this.registerServiceWorker();
      this.setupInstallPrompt();
      this.setupUpdateChecking();
      
      if (this.config.enablePushNotifications) {
        await this.setupPushNotifications();
      }

      console.log('PWA Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize PWA Service:', error);
    }
  }

  /**
   * Register service worker
   */
  private async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });

        console.log('Service Worker registered successfully');

        // Listen for service worker updates
        this.serviceWorkerRegistration.addEventListener('updatefound', () => {
          const newWorker = this.serviceWorkerRegistration!.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                this.updateAvailable = true;
                this.emit('updateAvailable', newWorker);
              }
            });
          }
        });

      } catch (error) {
        console.error('Service Worker registration failed:', error);
        throw error;
      }
    } else {
      throw new Error('Service Workers not supported');
    }
  }

  /**
   * Setup install prompt handling
   */
  private setupInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.installPromptEvent = event as any;
      this.emit('installAvailable', event);
    });

    window.addEventListener('appinstalled', () => {
      this.installPromptEvent = null;
      this.emit('appInstalled');
    });
  }

  /**
   * Setup automatic update checking
   */
  private setupUpdateChecking(): void {
    if (this.config.updateCheckInterval && this.serviceWorkerRegistration) {
      setInterval(() => {
        this.serviceWorkerRegistration!.update();
      }, this.config.updateCheckInterval);
    }
  }

  /**
   * Setup push notifications
   */
  private async setupPushNotifications(): Promise<void> {
    if ('Notification' in window && 'PushManager' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('Push notifications enabled');
        this.emit('pushNotificationsEnabled');
      }
    }
  }

  /**
   * Initialize event listeners
   */
  private initializeEventListeners(): void {
    // Online/offline detection
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.emit('online');
      this.triggerBackgroundSync();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.emit('offline');
    });

    // Visibility change for background sync
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isOnline) {
        this.triggerBackgroundSync();
      }
    });
  }

  /**
   * Trigger background sync
   */
  private async triggerBackgroundSync(): Promise<void> {
    if (this.config.enableBackgroundSync && this.serviceWorkerRegistration && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        await this.serviceWorkerRegistration.sync.register('background-sync-tasks');
        await this.serviceWorkerRegistration.sync.register('background-sync-lists');
        console.log('Background sync triggered');
      } catch (error) {
        console.error('Background sync failed:', error);
      }
    }
  }

  /**
   * Show install prompt
   */
  async showInstallPrompt(): Promise<boolean> {
    if (this.installPromptEvent) {
      try {
        await this.installPromptEvent.prompt();
        const choiceResult = await this.installPromptEvent.userChoice;
        this.installPromptEvent = null;
        return choiceResult.outcome === 'accepted';
      } catch (error) {
        console.error('Install prompt failed:', error);
        return false;
      }
    }
    return false;
  }

  /**
   * Apply service worker update
   */
  applyUpdate(): void {
    if (this.serviceWorkerRegistration && this.serviceWorkerRegistration.waiting) {
      this.serviceWorkerRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }

  /**
   * Check if app is installed
   */
  isAppInstalled(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  }

  /**
   * Get installation status
   */
  getInstallationStatus(): {
    isInstalled: boolean;
    canInstall: boolean;
    isOnline: boolean;
    updateAvailable: boolean;
  } {
    return {
      isInstalled: this.isAppInstalled(),
      canInstall: this.installPromptEvent !== null,
      isOnline: this.isOnline,
      updateAvailable: this.updateAvailable
    };
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPushNotifications(): Promise<PushSubscription | null> {
    if (!this.serviceWorkerRegistration) {
      throw new Error('Service Worker not registered');
    }

    try {
      const subscription = await this.serviceWorkerRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          process.env.VITE_VAPID_PUBLIC_KEY || ''
        )
      });

      console.log('Push subscription created:', subscription);
      return subscription;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return null;
    }
  }

  /**
   * Add offline data for background sync
   */
  async addOfflineData(type: 'task' | 'list', data: any): Promise<void> {
    // This would typically store data in IndexedDB for background sync
    // For now, we'll just trigger a sync attempt
    if (this.isOnline) {
      this.triggerBackgroundSync();
    } else {
      console.log('Data queued for background sync:', { type, data });
      this.emit('dataQueued', { type, data });
    }
  }

  /**
   * Event emitter functionality
   */
  on(event: string, listener: Function): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);

    return () => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(listener);
        if (eventListeners.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  private emit(event: string, data?: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => listener(data));
    }
  }

  /**
   * Utility function to convert VAPID key
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Get service worker registration
   */
  getServiceWorkerRegistration(): ServiceWorkerRegistration | null {
    return this.serviceWorkerRegistration;
  }

  /**
   * Check if service worker is supported
   */
  static isSupported(): boolean {
    return 'serviceWorker' in navigator;
  }
}

/**
 * Global PWA service instance
 */
export const pwaService = PWAService.getInstance();

/**
 * React hook for PWA functionality
 */
import { useState, useEffect } from 'react';

export function usePWA() {
  const [installationStatus, setInstallationStatus] = useState(pwaService.getInstallationStatus());
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const unsubscribeOnline = pwaService.on('online', () => setIsOnline(true));
    const unsubscribeOffline = pwaService.on('offline', () => setIsOnline(false));
    const unsubscribeInstall = pwaService.on('installAvailable', () => {
      setInstallationStatus(pwaService.getInstallationStatus());
    });
    const unsubscribeUpdate = pwaService.on('updateAvailable', () => {
      setInstallationStatus(pwaService.getInstallationStatus());
    });

    return () => {
      unsubscribeOnline();
      unsubscribeOffline();
      unsubscribeInstall();
      unsubscribeUpdate();
    };
  }, []);

  return {
    ...installationStatus,
    isOnline,
    showInstallPrompt: pwaService.showInstallPrompt.bind(pwaService),
    applyUpdate: pwaService.applyUpdate.bind(pwaService),
    subscribeToPushNotifications: pwaService.subscribeToPushNotifications.bind(pwaService),
    addOfflineData: pwaService.addOfflineData.bind(pwaService)
  };
}
