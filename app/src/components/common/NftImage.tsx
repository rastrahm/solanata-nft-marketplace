import Image from "next/image";
import type { ReactElement } from "react";

/** Props de `NftImage`. */
export interface NftImageProps {
  /** URL http(s) de la imagen, o `null` si el NFT no declara una. */
  src: string | null;
  /** Nombre del NFT (texto alternativo). */
  name: string;
  /** Lado en píxeles (imagen cuadrada). */
  size: number;
}

/**
 * @description Imagen cuadrada de un NFT. Usa `unoptimized` porque las imágenes vienen de hosts
 * arbitrarios (IPFS, Arweave…): permitirlos en el optimizador lo convertiría en un proxy abierto.
 * @param {NftImageProps} props - Fuente, nombre y tamaño.
 * @returns {JSX.Element} `<Image />` o un placeholder accesible si no hay imagen.
 */
export function NftImage({ src, name, size }: NftImageProps): ReactElement {
  if (!src) {
    return (
      <div
        role="img"
        aria-label={`${name}: sin imagen disponible`}
        className="flex aspect-square w-full items-center justify-center bg-gradient-to-br from-violet-200 to-zinc-200 text-4xl dark:from-violet-900 dark:to-zinc-800"
      >
        <span aria-hidden="true">🖼️</span>
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={name}
      width={size}
      height={size}
      unoptimized
      className="aspect-square w-full object-cover"
    />
  );
}
