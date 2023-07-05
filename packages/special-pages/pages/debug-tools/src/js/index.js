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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { render, h, Fragment } from 'preact'

export { DebugToolsMessages }

/**
 * Initializes all parts of the page on load.
 */
document.addEventListener('DOMContentLoaded', async () => {
    const messagingInstance = createSpecialPagesMessaging({
        injectName: import.meta.injectName,
        env: import.meta.env,
        featureName: 'debugToolsPage'
    })

    const messages = new DebugToolsMessages(messagingInstance)
    const features = await messages.getFeatures()
    const root = document.querySelector('#app')
    if (!root) return

    function App () {
        return <main data-loaded="true">
            <h1>Hello from Debug Tools</h1>
            <pre><code id="debug">{JSON.stringify(features, null, 2)}</code></pre>
        </main>
    }
    render(<App />, root)
})
