/**
 * Service worker registration.
 *
 * The default registration only looks for a new build when the page loads.
 * An installed PWA is usually resumed rather than loaded, so students could
 * sit on a stale version for days. This checks on resume and on a timer, and
 * reloads once when a new worker takes over.
 */

const UPDATE_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

export const registerServiceWorker = () => {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      // updateViaCache: the browser may otherwise serve sw.js from its own
      // HTTP cache for up to 24h, hiding new deploys entirely.
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((registration) => {
        const checkForUpdate = () => registration.update().catch(() => {});

        // Resuming the app is the moment a student is most likely to be on
        // an old build
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") checkForUpdate();
        });
        window.addEventListener("focus", checkForUpdate);

        // ...and a slow timer for sessions left open all day
        setInterval(checkForUpdate, UPDATE_INTERVAL_MS);
      })
      .catch(() => {
        // Registration failure just means no offline support — the app still
        // works, so there is nothing to show the user.
      });
  });

  // The worker uses skipWaiting, so a new build takes control as soon as it
  // installs. Reload once so the open page picks up the new assets.
  let reloading = false;
  const hadController = !!navigator.serviceWorker.controller;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    // No previous controller means this is the first install on a fresh
    // visit, not an update — reloading there would be a pointless flash.
    if (reloading || !hadController) return;
    reloading = true;
    window.location.reload();
  });
};
