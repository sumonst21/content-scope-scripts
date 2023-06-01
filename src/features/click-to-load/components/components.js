import { DDGCtlPlaceholderBlockedElement } from './ctl-placeholder-blocked.js'

/**
 * Wrapping in a function to allow remote-config later if needed
 */
export function registerCustomElements () {
    if (!customElements.get(DDGCtlPlaceholderBlockedElement.CUSTOM_TAG_NAME)) {
        customElements.define(DDGCtlPlaceholderBlockedElement.CUSTOM_TAG_NAME, DDGCtlPlaceholderBlockedElement)
    }
}
