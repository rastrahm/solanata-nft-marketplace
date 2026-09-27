"use client";

import {
  cloneElement,
  useId,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";

/** Props de `Tooltip`. */
export interface TooltipProps {
  /** Texto de ayuda que se muestra al pasar el mouse o enfocar. */
  content: ReactNode;
  /** Elemento enfocable que dispara el tooltip; recibe `aria-describedby`. */
  children: ReactElement<{ "aria-describedby"?: string }>;
}

/**
 * @description Tooltip accesible sin dependencias: se abre con hover o foco y se cierra con Escape.
 * @param {TooltipProps} props - Contenido del tooltip y elemento disparador.
 * @returns {JSX.Element} El disparador envuelto y, si está abierto, el globo con `role="tooltip"`.
 */
export function Tooltip({ content, children }: TooltipProps): ReactElement {
  const id = useId();
  const [open, setOpen] = useState(false);
  const show = (): void => setOpen(true);
  const hide = (): void => setOpen(false);
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") hide();
  };

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onKeyDown={onKeyDown}
    >
      {cloneElement(children, { "aria-describedby": open ? id : undefined })}
      {open && (
        <span
          role="tooltip"
          id={id}
          className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg bg-zinc-900 px-3 py-2 text-xs leading-relaxed text-zinc-50 shadow-lg dark:bg-zinc-100 dark:text-zinc-900"
        >
          {content}
        </span>
      )}
    </span>
  );
}
