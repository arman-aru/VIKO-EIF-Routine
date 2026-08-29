import { useEffect, useState } from "react";

// Passing URL as null/undefined skips the request entirely — used while a
// dependency (e.g. the year-scoped group id) is still being resolved.
const useFetch = (URL, payload, date, groupId, refreshKey = 0) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!URL) {
      setData(null);
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);
    setData(null);

    fetch(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((r) => r.json())
      .then((d) => {
        if (mounted) {
          setData(d);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [URL, date, groupId, refreshKey]);

  return { data, loading };
};

export default useFetch;
