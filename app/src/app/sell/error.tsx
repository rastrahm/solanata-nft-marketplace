"use client";

import type { ReactElement } from "react";

import { RouteErrorView, type RouteErrorProps } from "@/components/common/RouteErrorView";

/**
 * @description Límite de error de `/sell`.
 * @param {RouteErrorProps} props - Error capturado y función de reintento.
 * @returns {JSX.Element} Alerta con botón "Reintentar".
 */
export default function SellError(props: RouteErrorProps): ReactElement {
  return <RouteErrorView {...props} title="No se pudo cargar la venta" />;
}
