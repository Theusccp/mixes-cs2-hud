// Animate phase changes once, independently of frequent GSI updates.
export function createPanelMotion() {
  const states = new WeakMap();
  return function show(element, visible, delay = 0) {
    const previous = states.get(element);
    if (previous?.visible === visible) return false;
    const entry = {visible, animation: null};
    states.set(element, entry);
    previous?.animation?.cancel();
    if ((!previous && !visible) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      element.hidden = !visible;
      return visible;
    }
    element.hidden = false;
    const closed = {opacity: 0, clipPath: 'inset(0 0 100% 0)'};
    const open = {opacity: 1, clipPath: 'inset(0 0 0 0)'};
    const animation = element.animate(visible ? [closed, open] : [open, closed], {
      duration: visible ? 380 : 260, delay: visible ? delay : 0,
      easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'both'
    });
    entry.animation = animation;
    animation.finished.then(() => {
      if (states.get(element) !== entry) return;
      element.hidden = !visible;
      animation.cancel();
      entry.animation = null;
    }).catch(() => {});
    return visible;
  };
}
