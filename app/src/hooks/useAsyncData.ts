"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { mapError } from "@/lib/errors";
import type { AppError } from "@/lib/types";

/** Resultado de una lectura asíncrona. */
export interface AsyncData<T> {
  /** Últimos datos recibidos para la clave actual (se conservan durante un `refetch`). */
  data: T | undefined;
  /** Error de la última lectura, traducido para la UI. */
  error: AppError | undefined;
  /** `true` mientras la lectura de la clave/versión actual no terminó. */
  isLoading: boolean;
  /** Vuelve a ejecutar la lectura. */
  refetch: () => void;
}

interface Settled<T> {
  key: string;
  version: number;
  data?: T;
  error?: AppError;
}

/**
 * @description Lee datos asíncronos (RPC) atados a una clave; al cambiar la clave vuelve a leer.
 * No hace `setState` síncrono en efectos: el estado de carga se deriva de clave y versión.
 * @param {string | null} key - Identifica la lectura; `null` la desactiva (p. ej. sin wallet).
 * @param {() => Promise<T>} fetcher - Función que obtiene los datos.
 * @returns {AsyncData<T>} Datos, error, estado de carga y `refetch`.
 */
export function useAsyncData<T>(key: string | null, fetcher: () => Promise<T>): AsyncData<T> {
  const [version, setVersion] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    if (key === null) return;
    let active = true;
    fetcherRef.current().then(
      (data) => active && setSettled({ key, version, data }),
      (error: unknown) => active && setSettled({ key, version, error: mapError(error) }),
    );
    return () => {
      active = false;
    };
  }, [key, version]);

  const refetch = useCallback(() => setVersion((v) => v + 1), []);
  const sameKey = key !== null && settled?.key === key;
  const current = sameKey && settled?.version === version;
  return {
    data: sameKey ? settled?.data : undefined,
    error: current ? settled?.error : undefined,
    isLoading: key !== null && !current,
    refetch,
  };
}
