/**
 * PWA Status Component - Shows installation prompts and offline status
 * SemanticType: PWAStatusComponent
 * ExtensibleByAI: true
 * AIUseCases: ["PWA installation", "Offline status", "Update notifications"]
 */

import React, { useState } from 'react';
import { usePWA } from '../services/pwa-service';
import { useMCPTool, useMCPResource } from '../hooks';

const PWAStatus: React.FC = () => {
  const {
    isInstalled,
    canInstall,
    isOnline,
    updateAvailable,
    showInstallPrompt,
    applyUpdate
  } = usePWA();

  const [showInstallBanner, setShowInstallBanner] = useState(canInstall && !isInstalled);
  const [showUpdateBanner, setShowUpdateBanner] = useState(updateAvailable);
  const [isInstalling, setIsInstalling] = useState(false);

  // MCP Tool: Install PWA
  const installPWA = async () => {
    setIsInstalling(true);
    try {
      const installed = await showInstallPrompt();
      if (installed) {
        setShowInstallBanner(false);
      }
      return { success: installed };
    } catch (error) {
      return { success: false, error: 'Installation failed' };
    } finally {
      setIsInstalling(false);
    }
  };

  useMCPTool('installPWA', installPWA, {
    description: 'Install the PWA to the device',
    category: 'pwa_management'
  });

  // MCP Tool: Apply Update
  const updatePWA = async () => {
    try {
      applyUpdate();
      setShowUpdateBanner(false);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Update failed' };
    }
  };

  useMCPTool('updatePWA', updatePWA, {
    description: 'Apply available PWA update',
    category: 'pwa_management'
  });

  // MCP Resource: PWA Status
  useMCPResource('pwaStatus', {
    isInstalled,
    canInstall,
    isOnline,
    updateAvailable,
    showInstallBanner,
    showUpdateBanner
  }, {
    description: 'Current PWA installation and connection status',
    category: 'pwa_state'
  });

  return (
    <div className="fixed top-0 left-0 right-0 z-50 space-y-2">
      {/* Offline Status Banner */}
      {!isOnline && (
        <div className="bg-yellow-500 text-white px-4 py-2 text-center text-sm">
          <div className="flex items-center justify-center space-x-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>You're offline. Some features may be limited.</span>
          </div>
        </div>
      )}

      {/* Install Banner */}
      {showInstallBanner && (
        <div className="bg-blue-600 text-white px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <div>
                <div className="font-medium">Install AI ToDo MCP</div>
                <div className="text-sm opacity-90">
                  Install the app for a better experience with offline support
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={installPWA}
                disabled={isInstalling}
                className="bg-white text-blue-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
              >
                {isInstalling ? 'Installing...' : 'Install'}
              </button>
              <button
                type="button"
                onClick={() => setShowInstallBanner(false)}
                className="text-white hover:text-gray-200 p-1"
                aria-label="Dismiss install prompt"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Banner */}
      {showUpdateBanner && (
        <div className="bg-green-600 text-white px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              <div>
                <div className="font-medium">Update Available</div>
                <div className="text-sm opacity-90">
                  A new version of AI ToDo MCP is ready to install
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={updatePWA}
                className="bg-white text-green-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100"
              >
                Update Now
              </button>
              <button
                type="button"
                onClick={() => setShowUpdateBanner(false)}
                className="text-white hover:text-gray-200 p-1"
                aria-label="Dismiss update notification"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connection Status Indicator (small, bottom-right) */}
      <div className="fixed bottom-4 right-4 z-40">
        <div className={`flex items-center space-x-2 px-3 py-2 rounded-full text-sm ${
          isOnline 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            isOnline ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <span className="font-medium">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {/* PWA Installation Status (for installed apps) */}
      {isInstalled && (
        <div className="fixed bottom-4 left-4 z-40">
          <div className="flex items-center space-x-2 px-3 py-2 bg-blue-100 text-blue-800 rounded-full text-sm">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">PWA Installed</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PWAStatus;
