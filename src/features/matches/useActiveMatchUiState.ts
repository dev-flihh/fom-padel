import { useEffect, useState } from 'react';

export const useNowMs = () => {
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return nowMs;
};

export const useModalBottomOffset = () => {
  const [modalBottomOffset, setModalBottomOffset] = useState(24);

  useEffect(() => {
    const updateModalOffset = () => {
      const baseNavOffset = 24; // keep modal above sticky CTA / safe area
      const vv = window.visualViewport;
      if (!vv) {
        setModalBottomOffset(baseNavOffset);
        return;
      }
      const keyboardHeight = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
      setModalBottomOffset(Math.max(baseNavOffset, keyboardHeight + 20));
    };

    updateModalOffset();
    window.addEventListener('resize', updateModalOffset);
    window.visualViewport?.addEventListener('resize', updateModalOffset);
    window.visualViewport?.addEventListener('scroll', updateModalOffset);
    return () => {
      window.removeEventListener('resize', updateModalOffset);
      window.visualViewport?.removeEventListener('resize', updateModalOffset);
      window.visualViewport?.removeEventListener('scroll', updateModalOffset);
    };
  }, []);

  return modalBottomOffset;
};
