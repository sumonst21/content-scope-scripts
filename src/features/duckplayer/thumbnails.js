import css from './assets/styles.css'
import { applyEffect, execCleanups, VideoParams } from './util.js'
import { IconOverlay } from './icon-overlay-v2.js'

/**
 * @typedef ThumbnailSettings
 * @property {import("./overlays-v2.js").OverlaysFeatureSettings} settings
 * @property {{interceptClicks: {}} | {showOverlays: {}}} mode
 */

/**
 * This features covers the implementation of hover-icons
 * + click interceptions
 */
export class Thumbnails {
    /**
     * @param {ThumbnailSettings} params
     * @param {import("../duck-player.js").DuckPlayerOverlayMessages} comms
     */
    constructor (params, comms) {
        this.settings = params.settings
        this.mode = params.mode
        this.comms = comms
    }

    /**
     * Perform side effects
     */
    init () {
        if ('interceptClicks' in this.mode) {
            this.interceptClicks()
        } else if ('showOverlays' in this.mode) {
            this.showOverlays()
        }
    }

    /**
     * To intercept a 'click' means to evaluate all DOM nodes
     * beneath the click and match it against our selector
     */
    interceptClicks () {
        this.sideEffect('intercepting clicks', () => {
            const parentNode = document.documentElement || document.body

            const { selectors } = this.settings

            const handler = (e) => {
                const element = findElementFromEvent(selectors.thumbLink, e)
                if (element && 'href' in element) {
                    const asLink = VideoParams.fromHref(element.href)?.toPrivatePlayerUrl()
                    if (asLink) {
                        e.preventDefault()
                        e.stopPropagation()
                        console.log('click: (prevented default) ', asLink, element)
                    }
                }
            }
            parentNode.addEventListener('click', handler, true)
            return () => {
                parentNode.removeEventListener('click', handler, true)
            }
        })
    }

    /**
     * Showing overlays is about placing a small Dax icon on top of
     * thumbnails where we can offer a 'watch in duck player' alternative
     */
    showOverlays () {
        this.sideEffect('showing overlays on hover', () => {
            const parentNode = document.documentElement || document.body
            /**
             * @param {MouseEvent} e
             */
            const icon = new IconOverlay(this.comms)
            icon.appendHoverOverlay()

            const style = document.createElement('style')
            style.textContent = css
            document.head.appendChild(style)
            const { selectors } = this.settings
            const handler = (e) => {
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
                if (hoverElement.querySelector(selectors.thumbLink)) {
                    return
                }

                // ignore if it exists within an excluded parent
                const existsInExcludedParent = selectors.excludedParents.some(selector => {
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

            parentNode.addEventListener('mouseover', handler, true)

            return () => {
                parentNode.removeEventListener('mouseover', handler, true)
                icon.removeAll()
                document.head.removeChild(style)
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
