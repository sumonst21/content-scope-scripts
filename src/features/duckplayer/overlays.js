import css from './assets/styles.css'
import { VideoOverlayManager } from './video-overlay-manager.js'
import { IconOverlay } from './icon-overlay.js'
import { onDOMLoaded, onDOMChanged, addTrustedEventListener, appendElement, VideoParams } from './util.js'

/**
 * @param {Environment} environment - methods to read environment-sensitive things like the current URL etc
 * @param {import("./overlay-messages.js").DuckPlayerOverlayMessages} comms - methods to communicate with a native backend
 */
export async function initOverlays (environment, comms) {
    /**
     * Entry point. Until this returns with initial user values, we cannot continue.
     */
    let userValues
    try {
        userValues = await comms.getUserValues()
    } catch (e) {
        console.error(e)
        return
    }

    const videoPlayerOverlay = new VideoOverlayManager(userValues, environment, comms)
    videoPlayerOverlay.handleFirstPageLoad()

    // give access to macos communications
    // todo: make this a class + constructor arg
    IconOverlay.setComms(comms)

    comms.onUserValuesChanged((userValues) => {
        videoPlayerOverlay.userValues = userValues
        videoPlayerOverlay.watchForVideoBeingAdded({ via: 'user notification', ignoreCache: true })

        if ('disabled' in userValues.privatePlayerMode) {
            AllIconOverlays.disable()
            OpenInDuckPlayer.disable()
        } else if ('enabled' in userValues.privatePlayerMode) {
            AllIconOverlays.disable()
            OpenInDuckPlayer.enable()
        } else if ('alwaysAsk' in userValues.privatePlayerMode) {
            AllIconOverlays.enable()
            OpenInDuckPlayer.disable()
        }
    } /* userValues */)

    const CSS = {
        styles: css,
        /**
         * Initialize the CSS by adding it to the page in a <style> tag
         */
        init: () => {
            const style = document.createElement('style')
            style.textContent = CSS.styles
            appendElement(document.head, style)
        }
    }

    const VideoThumbnail = {
        hoverBoundElements: new WeakMap(),

        isSingleVideoURL: (href) => {
            return href && (
                (href.includes('/watch?v=') && !href.includes('&list=')) ||
                (href.includes('/watch?v=') && href.includes('&list=') && href.includes('&index='))
            ) && !href.includes('&pp=') // exclude movies for rent
        },

        /**
         * Find all video thumbnails on the page
         * @returns {array} array of videoElement(s)
         */
        findAll: () => {
            const linksToVideos = item => {
                const href = item.getAttribute('href')
                return VideoThumbnail.isSingleVideoURL(href)
            }

            const linksWithImages = item => {
                return item.querySelector('img')
            }

            const linksWithoutSubLinks = item => {
                return !item.querySelector('a[href^="/watch?v="]')
            }

            const linksNotInVideoPreview = item => {
                const linksInVideoPreview = Array.from(document.querySelectorAll('#preview a'))

                return linksInVideoPreview.indexOf(item) === -1
            }

            const linksNotAlreadyBound = item => {
                return !VideoThumbnail.hoverBoundElements.has(item)
            }

            return Array.from(document.querySelectorAll('a[href^="/watch?v="]'))
                .filter(linksNotAlreadyBound)
                .filter(linksToVideos)
                .filter(linksWithoutSubLinks)
                .filter(linksNotInVideoPreview)
                .filter(linksWithImages)
        },

        /**
         * Bind hover events and make sure hovering the video will correctly show the hover
         * overlay and mousouting will hide it.
         */
        bindEvents: (video) => {
            if (video) {
                addTrustedEventListener(video, 'mouseover', () => {
                    IconOverlay.moveHoverOverlayToVideoElement(video)
                })

                addTrustedEventListener(video, 'mouseout', IconOverlay.hideHoverOverlay)

                VideoThumbnail.hoverBoundElements.set(video, true)
            }
        },

        /**
         * Bind events to all video thumbnails on the page (that hasn't already been bound)
         */
        bindEventsToAll: () => {
            VideoThumbnail.findAll().forEach(VideoThumbnail.bindEvents)
        }
    }

    const Preview = {
        previewContainer: false,

        /**
         * Get the video hover preview link
         * @returns {HTMLElement | null | undefined}
         */
        getPreviewVideoLink: () => {
            const linkSelector = 'a[href^="/watch?v="]'
            const previewVideo = document.querySelector('#preview ' + linkSelector + ' video')

            return previewVideo?.closest(linkSelector)
        },

        /**
         * Append icon overlay to the video hover preview unless it's already been appended
         * @returns {HTMLElement|boolean}
         */
        appendIfNotAppended: () => {
            const previewVideo = Preview.getPreviewVideoLink()

            if (previewVideo) {
                return IconOverlay.appendToVideo(previewVideo)
            }

            return false
        },

        /**
         * Updates the icon overlay to use the correct video url in the preview hover link whenever it is hovered
         */
        update: () => {
            const updateOverlayVideoId = (element) => {
                const overlay = element?.querySelector('.ddg-overlay')
                const href = element?.getAttribute('href')
                if (href) {
                    const privateUrl = VideoParams.fromPathname(href)?.toPrivatePlayerUrl()
                    if (overlay && privateUrl) {
                        overlay.querySelector('a.ddg-play-privately')?.setAttribute('href', privateUrl)
                    }
                }
            }

            const videoElement = Preview.getPreviewVideoLink()

            updateOverlayVideoId(videoElement)
        },

        /**
         * YouTube does something weird to links added within ytd-app. Needs to set this up to
         * be able to make the preview link clickable.
         */
        fixLinkClick: () => {
            const previewLink = Preview.getPreviewVideoLink()?.querySelector('a.ddg-play-privately')
            if (!previewLink) return
            addTrustedEventListener(previewLink, 'click', () => {
                const href = previewLink?.getAttribute('href')
                if (href) {
                    environment.setHref(href)
                }
            })
        },

        /**
         * Initiate the preview hover overlay
         */
        init: () => {
            const appended = Preview.appendIfNotAppended()

            if (appended) {
                Preview.fixLinkClick()
            } else {
                Preview.update()
            }
        }
    }

    const AllIconOverlays = {
        enabled: false,
        hasBeenEnabled: false,

        enableOnDOMLoaded: () => {
            onDOMLoaded(() => {
                AllIconOverlays.enable()
            })
        },

        enable: () => {
            if (!AllIconOverlays.hasBeenEnabled) {
                CSS.init()

                onDOMChanged(() => {
                    if (AllIconOverlays.enabled) {
                        VideoThumbnail.bindEventsToAll()
                        Preview.init()
                    }

                    videoPlayerOverlay.watchForVideoBeingAdded({ via: 'mutation observer' })
                })

                window.addEventListener('resize', IconOverlay.repositionHoverOverlay)

                window.addEventListener('scroll', IconOverlay.hidePlaylistOverlayOnScroll, true)
            }

            IconOverlay.appendHoverOverlay()
            VideoThumbnail.bindEventsToAll()

            AllIconOverlays.enabled = true
            AllIconOverlays.hasBeenEnabled = true
        },

        disable: () => {
            AllIconOverlays.enabled = false
            IconOverlay.removeAll()
        }
    }

    const OpenInDuckPlayer = {
        clickBoundElements: new Map(),
        enabled: false,
        /** @type {string|null} */
        lastMouseOver: null,
        bindEventsToAll: () => {
            if (!OpenInDuckPlayer.enabled) {
                return
            }

            const videoLinksAndPreview = Array.from(document.querySelectorAll('a[href^="/watch?v="], #media-container-link'))
            const isValidVideoLinkOrPreview = (element) => {
                return VideoThumbnail.isSingleVideoURL(element?.getAttribute('href')) ||
                    element.getAttribute('id') === 'media-container-link'
            }
            videoLinksAndPreview
                .forEach((/** @type {HTMLElement|HTMLAnchorElement} */element) => {
                    // bail when this element was already seen
                    if (OpenInDuckPlayer.clickBoundElements.has(element)) return

                    // bail if it's not a valid element
                    if (!isValidVideoLinkOrPreview(element)) return

                    // handle mouseover + click events
                    const handler = {
                        handleEvent (event) {
                            switch (event.type) {
                            case 'mouseover': {
                                /**
                                 * Store the element's link value on hover - this occurs just in time
                                 * before the youtube overlay take sover the event space
                                 */
                                const href = element instanceof HTMLAnchorElement
                                    ? VideoParams.fromHref(element.href)?.toPrivatePlayerUrl()
                                    : null
                                if (href) {
                                    OpenInDuckPlayer.lastMouseOver = href
                                }
                                break
                            }
                            case 'click': {
                                /**
                                 * On click, the receiver might be the preview element - if
                                 * it is, we want to use the last hovered `a` tag instead
                                 */
                                event.preventDefault()
                                event.stopPropagation()

                                const link = event.target.closest('a')
                                const fromClosest = VideoParams.fromHref(link?.href)?.toPrivatePlayerUrl()

                                if (fromClosest) {
                                    comms.openInDuckPlayerViaMessage({ href: fromClosest })
                                } else if (OpenInDuckPlayer.lastMouseOver) {
                                    comms.openInDuckPlayerViaMessage({ href: OpenInDuckPlayer.lastMouseOver })
                                } else {
                                    // could not navigate, doing nothing
                                }

                                break
                            }
                            }
                        }
                    }

                    // register both handlers
                    element.addEventListener('mouseover', handler, true)
                    element.addEventListener('click', handler, true)

                    // store the handler for removal later (eg: if settings change)
                    OpenInDuckPlayer.clickBoundElements.set(element, handler)
                })
        },

        disable: () => {
            OpenInDuckPlayer.clickBoundElements.forEach((handler, element) => {
                element.removeEventListener('mouseover', handler, true)
                element.removeEventListener('click', handler, true)
                OpenInDuckPlayer.clickBoundElements.delete(element)
            })

            OpenInDuckPlayer.enabled = false
        },

        enable: () => {
            OpenInDuckPlayer.enabled = true
            OpenInDuckPlayer.bindEventsToAll()

            onDOMChanged(() => {
                OpenInDuckPlayer.bindEventsToAll()
            })
        },

        enableOnDOMLoaded: () => {
            OpenInDuckPlayer.enabled = true

            onDOMLoaded(() => {
                OpenInDuckPlayer.bindEventsToAll()

                onDOMChanged(() => {
                    OpenInDuckPlayer.bindEventsToAll()
                })
            })
        }
    }

    // Enable icon overlays on page load if not explicitly disabled
    if ('alwaysAsk' in userValues.privatePlayerMode) {
        AllIconOverlays.enableOnDOMLoaded()
    } else if ('enabled' in userValues.privatePlayerMode) {
        OpenInDuckPlayer.enableOnDOMLoaded()
    }
}

export class Environment {
    allowedOverlayOrigins = ['www.youtube.com', 'duckduckgo.com']
    allowedProxyOrigins = ['duckduckgo.com']

    /**
     * @param {object} params
     * @param {boolean|null|undefined} [params.debug]
     */
    constructor (params) {
        this.debug = Boolean(params.debug)
    }

    getPlayerPageHref () {
        if (this.debug) {
            return 'https://youtube.com/watch?v=123'
        }
        return window.location.href
    }

    getLargeThumbnailSrc (videoId) {
        const url = new URL(`/vi/${videoId}/maxresdefault.jpg`, 'https://i.ytimg.com')
        return url.href
    }

    setHref (href) {
        window.location.href = href
    }

    hasOneTimeOverride () {
        try {
            // #ddg-play is a hard requirement, regardless of referrer
            if (window.location.hash !== '#ddg-play') return false

            // double-check that we have something that might be a parseable URL
            if (typeof document.referrer !== 'string') return false
            if (document.referrer.length === 0) return false // can be empty!

            const { hostname } = new URL(document.referrer)
            const isAllowed = this.allowedProxyOrigins.includes(hostname)
            return isAllowed
        } catch (e) {
            console.error(e)
        }
        return false
    }

    isTestMode () {
        return this.debug === true
    }
}
