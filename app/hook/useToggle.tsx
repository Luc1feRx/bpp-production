import { useCallback, useEffect, useRef, useState } from "react";

export const useToggle = (targetId: string) => {
  const [open, setOpen] = useState(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
  }, []);

  useEffect(() => {
    if (!mountedRef.current) return;

    const el = document.getElementById(targetId);
    if (!el) return;

    el.dispatchEvent(
      new CustomEvent("command", {
        detail: { command: open ? "--show" : "--hide" },
        bubbles: true,
      })
    );
  }, [open, targetId]);

  const onOpen = useCallback(() => setOpen(true), []);
  const onClose = useCallback(() => setOpen(false), []);
  const onToggle = useCallback(() => setOpen(v => !v), []);

  return { open, onOpen, onClose, onToggle };
};
