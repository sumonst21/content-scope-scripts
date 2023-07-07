/**
 * @module Debug Tools
 * @category Special Pages
 *
 * @description
 *
 * A JavaScript application that provides common debugging utilities for DuckDuckGo Browsers
 */
import { DebugToolsMessages } from './DebugToolsMessages.mjs'
import { createSpecialPagesMessaging } from '../../../../shared/create-messaging'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { createRoot } from 'react-dom/client'
import { inspect } from '@xstate/inspect'
import { withMessages } from './machine-impl'
import { MockImpl } from './mock-transport'
import { App, AppMachineContext, baseMachine } from './components/app'

export { DebugToolsMessages }

if ((new URLSearchParams(window.location.search)).has('inspect')) {
    inspect({
        iframe: false
    })
}

document.addEventListener('DOMContentLoaded', async () => {
    const messagingInstance = createSpecialPagesMessaging({
        injectName: import.meta.injectName,
        env: import.meta.env,
        featureName: 'debugToolsPage',
        mockImpl: () => new MockImpl()
    })

    const messages = new DebugToolsMessages(messagingInstance)
    const appNode = document.querySelector('#app')
    if (!appNode) return console.warn('noooo')

    const root = createRoot(appNode)
    const next = withMessages(baseMachine, messages)

    root.render(<AppMachineContext.Provider machine={() => next}><App /></AppMachineContext.Provider>)
})
