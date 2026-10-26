let activeLocks = 0;
let previousOverflow = '';
let previousPaddingRight = '';

export function lockBodyScroll() {
  if (activeLocks === 0) {
    const scrollbarGap = window.innerWidth - document.documentElement.clientWidth;
    previousOverflow = document.body.style.overflow;
    previousPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = 'hidden';
    if (scrollbarGap > 0) {
      document.body.style.paddingRight = `${scrollbarGap}px`;
    }
  }
  activeLocks += 1;
}

export function unlockBodyScroll() {
  activeLocks = Math.max(0, activeLocks - 1);
  if (activeLocks === 0) {
    document.body.style.overflow = previousOverflow;
    document.body.style.paddingRight = previousPaddingRight;
  }
}
