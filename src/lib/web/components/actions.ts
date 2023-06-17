export const ariaDescribes = (node: HTMLElement, describesId: string): SvelteActionReturnType => {
  const id = node.id;
  const el = document.getElementById(describesId);
  if (!el || !id) {
    return {};
  }
  const currentStr = el.getAttribute('aria-describedby') || '';
  const current: string[] = currentStr
    .split(/\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s !== id);
  current.push(id);
  el.setAttribute('aria-describedby', current.join(' '));
  return {
    destroy() {
      const withoutStr = el.getAttribute('aria-describedby') || '';
      const without: string[] = withoutStr
        .split(/\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s !== id);
      el.setAttribute('aria-describedby', without.join(' '));
    }
  };
};

export const addAriaDescribes = (el: HTMLElement, describedById: string) => {
  const currentStr = el.getAttribute('aria-describedby') || '';
  const current: string[] = currentStr
    .split(/\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s !== describedById);
  current.push(describedById);
  el.setAttribute('aria-describedby', current.join(' '));
};
export const removeAriaDescribes = (el: HTMLElement, describedById: string) => {
  const currentStr = el.getAttribute('aria-describedby') || '';
  const current: string[] = currentStr
    .split(/\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s !== describedById);
  el.setAttribute('aria-describedby', current.join(' '));
};