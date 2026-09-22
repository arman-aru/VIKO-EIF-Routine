import { useEffect, useState } from "react";

// Passing URL as null/undefined skips the request entirely — used while a
// dependency (e.g. the year-scoped group id) is still being resolved.
const useFetch = (URL, payload, date, groupId, refreshKey = 0) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!URL) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    let mounted = true;
    setLoading(true);
    setData(null);
    setError(null);

    fetch(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((r) => {
        // A failed request must surface as an error, not as an empty day
        if (!r.ok) throw new Error(`Request failed with status ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (mounted) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error(`Fetch ${URL} failed:`, err.message);
        if (mounted) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [URL, date, groupId, refreshKey]);

  return { data, loading, error };
};

export default useFetch;
