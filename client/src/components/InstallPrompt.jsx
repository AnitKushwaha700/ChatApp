import React, { useState, useEffect } from "react";
import { Download } from "lucide-react";

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      console.log("PWA was installed");
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-sm bg-base-100 shadow-2xl rounded-2xl border border-base-200 p-4 flex items-center justify-between gap-4 transition-all duration-300">
      <div className="flex flex-col">
        <h3 className="font-semibold text-base">Install App</h3>
        <p className="text-sm text-base-content/70">Add to home screen for a better experience</p>
      </div>
      <div className="flex gap-2">
        <button 
          className="btn btn-sm btn-ghost" 
          onClick={() => setShowPrompt(false)}
        >
          Later
        </button>
        <button 
          className="btn btn-sm btn-primary" 
          onClick={handleInstallClick}
        >
          <Download className="w-4 h-4 mr-1" /> Install
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;
