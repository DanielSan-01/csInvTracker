import { useEffect } from 'react';

type Handler = (event: MouseEvent | TouchEvent) => void;

export default function useOutsideClick<T extends HTMLElement>(
  refs: React.RefObject<T | null> | React.RefObject<T | null>[],
  handler: Handler
) {
  useEffect(() => {
    const refList = Array.isArray(refs) ? refs : [refs];

    const listener = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      const isInside = refList.some((ref) => ref.current?.contains(target));
      if (isInside) {
        return;
      }
      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [refs, handler]);
}


