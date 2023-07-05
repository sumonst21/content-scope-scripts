import { Mocks } from './mocks.js'
import { expect } from '@playwright/test'
import { join } from 'node:path'
import { perPlatform } from '../../../../integration-test/playwright/type-helpers.mjs'

const MOCK_VIDEO_ID = 'VIDEO_ID'

/**
 * @typedef {import('../../../../integration-test/playwright/type-helpers.mjs').Build} Build
 * @typedef {import('../../../../integration-test/playwright/type-helpers.mjs').PlatformInfo} PlatformInfo
 */

export class DebugToolsPage {
    /**
     * @param {import("@playwright/test").Page} page
     * @param {Build} build
     * @param {PlatformInfo} platform
     */
    constructor (page, build, platform) {
        this.page = page
        this.build = build
        this.platform = platform
        this.mocks = new Mocks(page, build, platform, {
            context: 'specialPages',
            featureName: 'debugTools',
            env: 'development'
        })
        // default mocks - just enough to render the first page without error
        this.mocks.defaultResponses({
            // nothing yet
        })
    }

    /**
     * This ensures we can choose when to apply mocks based on the platform
     * @param {URLSearchParams} urlParams
     * @return {Promise<void>}
     */
    async openPage (urlParams) {
        const url = this.basePath + '?' + urlParams.toString()
        await this.installRemoteMocks()
        await this.mocks.install()
        await this.page.goto(url)
    }

    /**
     * Used later if/when we might want to simulate fetching remote config
     * @return {Promise<void>}
     */
    async installRemoteMocks () {
        // default: https://staticcdn.duckduckgo.com/trackerblocking/config/v2/macos-config.json
        await this.page.route('https://staticcdn.duckduckgo.com/trackerblocking/**', (route, req) => {
            const url = new URL(req.url())
            return route.fulfill({
                status: 200,
                json: {
                    hello: 'world'
                }
            })
        })
    }

    /**
     * @returns {Promise<void>}
     */
    async openRemoteResourceEditor () {
        const params = new URLSearchParams({})
        await this.openPage(params)
    }

    /**
     * @returns {Promise<void>}
     */
    async hasLoaded () {
        // this makes sure the JS is compiled/loaded
        await this.page.locator('main[data-loaded=true]').waitFor()
    }

    /**
     * We test the fully built artifacts, so for each test run we need to
     * select the correct HTML file.
     * @return {string}
     */
    get basePath () {
        return this.build.switch({
            windows: () => '../../build/windows/pages/debug-tools/index.html',
            apple: () => '../../Sources/ContentScopeScripts/dist/pages/debug-tools/index.html'
        })
    }

    /**
     * @param {import("@playwright/test").Page} page
     * @param {import("@playwright/test").TestInfo} testInfo
     */
    static create (page, testInfo) {
        // Read the configuration object to determine which platform we're testing against
        const { platformInfo, build } = perPlatform(testInfo.project.use)
        return new DebugToolsPage(page, build, platformInfo)
    }
}
