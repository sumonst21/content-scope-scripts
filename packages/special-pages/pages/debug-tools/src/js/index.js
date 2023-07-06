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
import { render, h, Fragment } from 'preact'
import { Editor } from './components/editor'
import { updateResourceParamsSchema } from '../../schema/__generated__/schema.parsers.mjs'

export { DebugToolsMessages }

/**
 * Initializes all parts of the page on load.
 */
document.addEventListener('DOMContentLoaded', async () => {
    const messagingInstance = createSpecialPagesMessaging({
        injectName: import.meta.injectName,
        env: import.meta.env,
        featureName: 'debugToolsPage',
        mockImpl: () => new MockImpl()
    })

    const messages = new DebugToolsMessages(messagingInstance)
    const features = await messages.getFeatures()
    const root = document.querySelector('#app')
    if (!root) return

    /**
     * @param {UpdateResourceParams} resp
     */
    async function save (resp) {
        const response = await messages.updateResource(resp)
        console.log('GOT RESPONSE', response.current)
    }

    render(<App getFeatures={features} save={save}/>, root)
})

/**
 * @typedef{ import('../../../../../messaging/index.js').MessagingTransport} MessagingTransport
 * @typedef{ import('../../schema/__generated__/schema.types').GetFeaturesResponse} GetFeaturesResponse
 */

/**
 * @implements MessagingTransport
 */
class MockImpl {
    notify (msg) {
        console.log(msg)
    }

    /**
     * @param {import('../../../../../messaging/index.js').RequestMessage} msg
     */
    async request (msg) {
        const now = new Date()
        const formattedDate = now.toISOString()
        switch (msg.method) {
        case 'getFeatures': {
            const remote = await fetch('https://localhost:3000/trackerblocking/config/v2/macos-config.json')
                .then(x => x.text())
            /** @type {import('../../schema/__generated__/schema.types').GetFeaturesResponse} */
            const response = {
                features: {
                    remoteResources: {
                        resources: [
                            {
                                id: 'privacy-configuration',
                                url: 'https://staticcdn.duckduckgo.com/trackerblocking/config/v2/macos-config.json',
                                name: 'Privacy Config',
                                current: {
                                    source: {
                                        remote: {
                                            url: 'https://staticcdn.duckduckgo.com/trackerblocking/config/v2/macos-config.json',
                                            fetchedAt: formattedDate
                                        }
                                    },
                                    contents: remote,
                                    contentType: 'application/json'
                                }
                            }
                        ]
                    }
                }
            }
            return response
        }
        case 'updateResource': {
            const parsed = updateResourceParamsSchema.parse(msg.params)
            /** @type {import('../../schema/__generated__/schema.types').RemoteResource} */
            const next = {
                id: 'privacy-configuration',
                url: 'https://staticcdn.duckduckgo.com/trackerblocking/config/v2/macos-config.json',
                name: 'Privacy Config',
                current: {
                    source: {
                        debugTools: {
                            modifiedAt: formattedDate
                        }
                    },
                    contents: '',
                    contentType: 'application/json'
                }
            }
            if ('remote' in parsed.source) {
                throw new Error('todo! \'remote\' in parsed.source')
            }
            if ('debugTools' in parsed.source) {
                next.current.source = {
                    debugTools: { modifiedAt: formattedDate }
                }
                next.current.contents = parsed.source.debugTools.content
            }
            return next
        }
        default:
            throw new Error('unhandled message:' + msg.method)
        }
    }

    subscribe (msg) {
        console.log(msg)
        return () => {
            console.log('teardown')
        }
    }
}

/**
 * @typedef{ import('../../schema/__generated__/schema.types').RemoteResource} RemoteResource
 * @typedef{ import('../../schema/__generated__/schema.types').UpdateResourceParams} UpdateResourceParams
 */

/**
 * @param {{
 *    getFeatures: GetFeaturesResponse;
 *    save: (res: UpdateResourceParams) => void;
 * }} props
 */
function App (props) {
    const first = props.getFeatures.features.remoteResources.resources[0]

    return <main data-loaded="true">
        <h1>Hello from Debug Tools</h1>
        <Editor resource={first} save={props.save}></Editor>
    </main>
}
