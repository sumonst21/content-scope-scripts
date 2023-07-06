/**
 * @module Debug Tools
 * @category Special Pages
 *
 * @description
 *
 * A JavaScript application that provides common debugging utilities for DuckDuckGo Browsers
 */
import 'preact/debug'
import { DebugToolsMessages } from './DebugToolsMessages.mjs'
import { createSpecialPagesMessaging } from '../../../../shared/create-messaging'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { render, h, Fragment } from 'preact'
import { useState } from 'preact/hooks'
import { Editor } from './components/editor'
import { updateResourceParamsSchema } from '../../schema/__generated__/schema.parsers.mjs'
import { RemoteResourceUrl } from './components/remote-resource-url'

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
    if (!root) return console.warn('noooop')

    render(<App getFeatures={features} messages={messages} />, root)
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
                const remote = await fetch(parsed.source.remote.url).then(x => x.text())
                next.current.source = {
                    remote: { url: parsed.source.remote.url, fetchedAt: formattedDate }
                }
                next.current.contents = remote
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
 *    messages: DebugToolsMessages;
 *    getFeatures: GetFeaturesResponse;
 * }} props
 */
function App (props) {
    const [resource, setResource] = useState(props.getFeatures.features.remoteResources.resources[0])
    const [error, setError] = useState(null)

    /**
     * @param {UpdateResourceParams} resp
     */
    async function save (resp) {
        try {
            setError(null)
            const response = await props.messages.updateResource(resp)
            setResource(response)
        } catch (e) {
            setError(e.message)
        }
    }

    return <main data-loaded="true">
        {error ? <p style={{ color: 'red' }}>{error}</p> : null}
        <RemoteResourceUrl resource={resource} save={save}></RemoteResourceUrl>
        <Editor resource={resource} save={save}></Editor>
    </main>
}
