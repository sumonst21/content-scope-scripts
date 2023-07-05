import { test } from '@playwright/test'
import { DebugToolsPage } from './page-objects/debug-tools'

test.describe.only('debug tools', () => {
    test('loads the application', async ({ page }, workerInfo) => {
        const dt = DebugToolsPage.create(page, workerInfo)
        await dt.openRemoteResourceEditor()
        await dt.hasLoaded()
    })
})
