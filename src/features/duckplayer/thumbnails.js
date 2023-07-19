import css from './assets/styles.css'
import { applyEffect, execCleanups, VideoParams } from './util.js'
import { IconOverlay } from './icon-overlay.js'
import { OpenInDuckPlayerMsg } from './overlay-messages.js'

/**
 * @typedef ThumbnailSettings
 * @property {import("./overlays.js").OverlaysFeatureSettings} settings
 * @property {import("./overlays.js").Environment} environment
 * @property {import("../duck-player.js").DuckPlayerOverlayMessages} messages
 */

/**
 * This features covers the implementation of hover-icons
 * + click interceptions
 */
export class Thumbnails {
    /**
     * @param {ThumbnailSettings} params
     */
    constructor (params) {
        this.settings = params.settings
        this.messages = params.messages
        this.environment = params.environment
    }

    /**
     * Perform side effects
     */
    init () {
        this.sideEffect('showing overlays on hover', () => {
            const { selectors } = this.settings
            const parentNode = document.documentElement || document.body

            // create the icon state
            const icon = new IconOverlay({
                environment: this.environment,
                onClick: (href) => {
                    this.messages.openDuckPlayer(new OpenInDuckPlayerMsg({ href }))
                }
            })

            // append to the document
            icon.appendHoverOverlay()

            // add the CSS to the head
            const style = document.createElement('style')
            style.textContent = css
            document.head.appendChild(style)

            const mouseOverHandler = (e) => {
                const hoverElement = findElementFromEvent(selectors.thumbLink, e)

                // if it's not an element we care about
                if (!hoverElement || !('href' in hoverElement)) {
                    const overlay = icon.getHoverOverlay()
                    if (overlay) {
                        icon.hideOverlay(overlay)
                        icon.hoverOverlayVisible = false
                    }
                    return
                }

                // ensure it doesn't contain sub-links
                if (hoverElement.querySelector('a[href]')) {
                    return
                }

                // ignore if it exists within an excluded parent
                const existsInExcludedParent = selectors.excludedRegions.some(selector => {
                    for (const parent of document.querySelectorAll(selector)) {
                        if (parent.contains(hoverElement)) return true
                    }
                    return false
                })

                if (existsInExcludedParent) return

                // now try to convert to a valid duck player link
                const asLink = VideoParams.fromHref(hoverElement.href)?.toPrivatePlayerUrl()

                // if we get here, we're confident that we can link to this video + it's a valid element to append to
                if (asLink) {
                    icon.moveHoverOverlayToVideoElement(hoverElement)
                }
            }

            parentNode.addEventListener('mouseover', mouseOverHandler, true)

            return () => {
                parentNode.removeEventListener('mouseover', mouseOverHandler, true)
                icon.removeAll()
                document.head.removeChild(style)
            }
        })
    }

    /** @type {{fn: () => void, name: string}[]} */
    _cleanups = []

    destroy () {
        execCleanups(this._cleanups)
        this._cleanups = []
    }

    /**
     * Wrap a side-effecting operation for easier debugging
     * and teardown/release of resources
     * @param {string} name
     * @param {() => () => void} fn
     */
    sideEffect (name, fn) {
        applyEffect(name, fn, this._cleanups)
    }
}

export class ClickInterception {
    /**
     * @param {ThumbnailSettings} params
     */
    constructor (params) {
        this.settings = params.settings
        this.messages = params.messages
        this.environment = params.environment
    }

    /**
     * Perform side effects
     */
    init () {
        this.sideEffect('intercepting clicks', () => {
            const { selectors } = this.settings
            const parentNode = document.documentElement || document.body

            const clickHandler = (e) => {
                const element = findElementFromEvent(selectors.thumbLink, e)
                if (element && 'href' in element) {
                    const duckPlayerLink = VideoParams.fromHref(element.href)?.toPrivatePlayerUrl()
                    if (duckPlayerLink) {
                        e.preventDefault()
                        e.stopPropagation()
                        this.messages.openDuckPlayer({ href: duckPlayerLink })
                    }
                }
            }

            parentNode.addEventListener('click', clickHandler, true)

            return () => {
                parentNode.removeEventListener('click', clickHandler, true)
            }
        })
    }

    destroy () {
        execCleanups(this._cleanups)
        this._cleanups = []
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
}

/**
 * @param {string} selector
 * @param {MouseEvent} e
 * @return {HTMLElement|null}
 */
function findElementFromEvent (selector, e) {
    for (const element of document.elementsFromPoint(e.clientX, e.clientY)) {
        if (element.matches(selector)) return /** @type {HTMLElement} */(element)
    }
    return null
}
