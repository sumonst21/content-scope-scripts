/**
 * @module Debug Tools
 * @category Special Pages
 *
 * @description
 *
 * A JavaScript application that provides common debugging utilities for DuckDuckGo Browsers
 */

import { DebugToolsMessages } from './DebugToolsMessages'
import { createSpecialPagesMessaging } from '../../../../shared/create-messaging'

export { DebugToolsMessages }

/**
 * Initializes all parts of the page on load.
 */
document.addEventListener('DOMContentLoaded', async () => {
    const main = document.querySelector('main')
    if (main) main.dataset.loaded = String(true)
    const messagingInstance = createSpecialPagesMessaging({
        injectName: import.meta.injectName,
        env: import.meta.env,
        featureName: 'debugToolsPage'
    })

    const messages = new DebugToolsMessages(messagingInstance)
    const features = await messages.getFeatures()
    const debug = document.querySelector('#debug')
    if (debug) {
        debug.textContent = JSON.stringify(features, null, 2)
    }
})
