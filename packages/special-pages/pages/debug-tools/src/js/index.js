/**
 * @module Debug Tools
 * @category Special Pages
 *
 * @description
 *
 * A JavaScript application that provides common debugging utilities for DuckDuckGo Browsers
 */

/**
 * Initializes all parts of the page on load.
 */
document.addEventListener('DOMContentLoaded', () => {
    const main = document.querySelector('main')
    if (main) main.dataset.loaded = String(true)
})
