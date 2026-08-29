import moment from "moment";
import { useEffect, useState } from "react";

const TICK_MS = 30_000;

/** A moment that re-renders on a slow tick, for live countdowns and progress. */
export const useNow = () => {
  const [now, setNow] = useState(() => moment());

  useEffect(() => {
    const id = setInterval(() => setNow(moment()), TICK_MS);
    // Catch up immediately after the tab was backgrounded
    const resync = () => setNow(moment());
    document.addEventListener("visibilitychange", resync);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", resync);
    };
  }, []);

  return now;
};
