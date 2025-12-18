/**
 * 🔥 OPTIMIZED: Lightweight debounce implementation (~200 bytes)
 * Replaces lodash-es/debounce to reduce JS bundle and main-thread work
 */
export function debounce(func, wait = 0) {
  let timeout;
  
  function debounced(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  }
  
  debounced.cancel = function() {
    clearTimeout(timeout);
  };
  
  return debounced;
}
