import { test } from '@playwright/test'
import { DuckplayerOverlays } from './page-objects/duckplayer-overlays.js'
import { STORAGE_STATE } from '../../playwright.config.js'

test.describe('e2e: Dismiss cookies', () => {
    test('storage locally', async ({ page }, workerInfo) => {
        // @ts-expect-error - TS doesn't know about the "use.e2e" property
        workerInfo.skip(!workerInfo.project.use?.e2e)

        const overlays = DuckplayerOverlays.create(page, workerInfo)

        await overlays.overlaysEnabled({ json: 'overlays-live' })
        await overlays.gotoYoutubeHomepage()
        await overlays.dismissCookies()

        await page.context().storageState({ path: STORAGE_STATE })
    })
})