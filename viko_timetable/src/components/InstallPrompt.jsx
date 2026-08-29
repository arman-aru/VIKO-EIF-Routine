import { useEffect, useState } from "react";
import { CloseIcon } from "./icons";

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
    <div className="install">
      <img src="/icons/icon-192x192.png" alt="" className="install__icon" />
      <div className="install__text">
        <strong>Install VIKO EIF</strong>
        <span>
          {isIOS ? (
            <>
              Tap <b>Share</b>, then <b>Add to Home Screen</b>
            </>
          ) : (
            "Keep your timetable one tap away"
          )}
        </span>
      </div>
      <div className="install__actions">
        {!isIOS && (
          <button className="btn btn--primary btn--sm" onClick={handleInstall}>
            Install
          </button>
        )}
        <button className="icon-btn" onClick={handleDismiss} aria-label="Dismiss">
          <CloseIcon size={16} />
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;
