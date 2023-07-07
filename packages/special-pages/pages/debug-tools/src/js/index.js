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
import * as monaco from 'monaco-editor/esm/vs/editor/edcore.main'

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

    // @ts-expect-error - later
    root.render(<AppMachineContext.Provider machine={() => next}><App /></AppMachineContext.Provider>)

    globalThis.MonacoEnvironment = {
        getWorkerUrl: function (moduleId, label) {
            if (label === 'json') {
                return './js/editor/json.js'
            }
            return './js/editor/editor.js'
        }
    }

    monaco.editor.create(document.getElementById('monaco-editor'), {
        value: ['{}'].join('\n'),
        language: 'json'
    })
})
