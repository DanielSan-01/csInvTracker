import { useEffect } from 'react';

type Handler = (event: MouseEvent | TouchEvent) => void;

export default function useOutsideClick<T extends HTMLElement>(
  ref: React.RefObject<T>,
  handler: Handler
) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      const element = ref.current;
      if (!element || element.contains(event.target as Node)) {
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
  }, [ref, handler]);
}


