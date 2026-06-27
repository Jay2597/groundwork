import { useEffect, useState } from "react";

/**
 * Load an image source (data URL) into an HTMLImageElement for Konva.
 * Returns undefined until the image is decoded. Local-only — data URLs never
 * hit the network.
 */
export function useImage(src: string | undefined): HTMLImageElement | undefined {
  const [image, setImage] = useState<HTMLImageElement>();

  useEffect(() => {
    if (!src) {
      setImage(undefined);
      return;
    }
    const img = new Image();
    let active = true;
    img.onload = () => {
      if (active) setImage(img);
    };
    img.src = src;
    return () => {
      active = false;
    };
  }, [src]);

  return image;
}
