'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

export type GeoStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';

export interface GeoState {
  status: GeoStatus;
  lat: number | null;
  lng: number | null;
  error: string | null;
  /** Call this to trigger the browser permission prompt */
  request: () => void;
}

export function useGeolocation(): GeoState {
  const [status, setStatus] = useState<GeoStatus>('idle');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);

  const request = useCallback(() => {
    if (!navigator?.geolocation) {
      setStatus('unavailable');
      setError('La géolocalisation n\'est pas disponible sur cet appareil.');
      return;
    }

    setStatus('requesting');
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setStatus('granted');
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('denied');
          setError('Accès refusé. Active la localisation dans les paramètres de ton navigateur.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setStatus('unavailable');
          setError('Position indisponible. Vérifie ta connexion GPS.');
        } else {
          setStatus('denied');
          setError('Impossible de récupérer ta position.');
        }
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 },
    );
  }, []);

  /* Check if permission was already granted (no prompt needed) */
  useEffect(() => {
    if (!navigator?.permissions) return;
    navigator.permissions.query({ name: 'geolocation' }).then((result) => {
      if (result.state === 'granted') {
        request();
      }
      result.onchange = () => {
        if (result.state === 'granted') request();
        if (result.state === 'denied') setStatus('denied');
      };
    });
  }, [request]);

  useEffect(() => {
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, []);

  return { status, lat, lng, error, request };
}
