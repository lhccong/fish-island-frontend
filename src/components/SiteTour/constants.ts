export const START_SITE_TOUR_EVENT = 'startSiteTour';

export function startSiteTour() {
  window.dispatchEvent(new CustomEvent(START_SITE_TOUR_EVENT));
}

export function findTourTarget(selectors: string[]): HTMLElement | null {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element instanceof HTMLElement) {
      return element;
    }
  }
  return null;
}
