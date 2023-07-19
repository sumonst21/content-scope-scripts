import { appendElement, applyEffect, execCleanups } from './util'
import { IconOverlay } from './icon-overlay.js'
import { OpenInDuckPlayerMsg } from './overlay-messages.js'

export class VideoPlayerIcon {
    /**
     * @param {object} params
     * @param {import("./overlay-messages.js").DuckPlayerOverlayMessages} params.messages
     * @param {import("./overlays.js").Environment} params.environment
     */
    constructor (params) {
        this.messages = params.messages
        this.environment = params.environment
    }

    /**
     * This will only get called once everytime a new video is loaded.
     *
     * @param {Element} containerElement
     * @param {import("./util").VideoParams} params
     */
    init (containerElement, params) {
        if (!containerElement) {
            console.error('missing container element')
            return
        }

        this.appendOverlay(containerElement, params)
    }

    /**
     * @param {Element} containerElement
     * @param {import("./util").VideoParams} params
     */
    appendOverlay (containerElement, params) {
        this.cleanup()

        this.sideEffect('dax 🐥 icon overlay', () => {
            const href = params.toPrivatePlayerUrl()

            const icon = new IconOverlay({
                environment: this.environment,
                onClick: (href) => {
                    this.messages.openDuckPlayer(new OpenInDuckPlayerMsg({ href }))
                }
            })
            const iconElement = icon.create('video-player', href, 'hidden')
            /**
             * Append the icon to the container element
             */
            appendElement(containerElement, iconElement)
            iconElement.classList.remove('hidden')

            return () => {
                if (iconElement.isConnected && containerElement?.contains(iconElement)) {
                    containerElement.removeChild(iconElement)
                }
            }
        })
    }

    /** @type {{fn: () => void, name: string}[]} */
    _cleanups = []
    /**
     * Wrap a side-effecting operation for easier debugging
     * and teardown/release of resources
     * @param {string} name
     * @param {() => () => void} fn
     */
    sideEffect (name, fn) {
        applyEffect(name, fn, this._cleanups)
    }

    /**
     * Remove elements, event listeners etc
     */
    cleanup () {
        execCleanups(this._cleanups)
        this._cleanups = []
    }
}
