import React, { useEffect } from "react";

/**
 * Los tipos de React 19 hacen que `useRef<T>(null)` produzca
 * `RefObject<T | null>`, así que la ref se acepta como anulable y se admite
 * cualquier elemento, no sólo `HTMLDivElement`.
 */
export const useOutsideClick = (
  ref: React.RefObject<HTMLElement | null>,
  callback: (event: MouseEvent | TouchEvent) => void,
) => {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!(event.target instanceof Node)) return;
      // DO NOTHING if the element being clicked is the target element or their children
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      callback(event);
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);

    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, callback]);
};
