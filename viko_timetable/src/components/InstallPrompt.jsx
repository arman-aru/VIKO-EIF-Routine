import { useEffect, useState } from "react";

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (window.navigator.standalone === true) return;
    // Don't show if user already dismissed
    if (sessionStorage.getItem("pwa-banner-dismissed")) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    if (ios) {
      // iOS can't use beforeinstallprompt — show manual instructions
      setShowBanner(true);
      return;
    }

    // Android/Chrome — listen for install prompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    sessionStorage.setItem("pwa-banner-dismissed", "1");
  };

  if (!showBanner || dismissed) return null;

  return (
    <div className="install-banner">
      <div className="install-banner-icon">
        <img src="/icons/icon-192x192.png" alt="App icon" />
      </div>
      <div className="install-banner-text">
        <strong>Install VIKO EIF</strong>
        {isIOS ? (
          <span>Tap <b>Share</b> → <b>Add to Home Screen</b></span>
        ) : (
          <span>Add to home screen for quick access</span>
        )}
      </div>
      <div className="install-banner-actions">
        {!isIOS && (
          <button className="install-btn" onClick={handleInstall}>
            Install
          </button>
        )}
        <button className="install-dismiss" onClick={handleDismiss} aria-label="Dismiss">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;
