import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import { join } from 'path'
import { cwd } from '../../../../../scripts/script-utils.js'
import { getFeaturesResponseSchema } from './__generated__/schema.parsers.mjs'
const CWD = cwd(import.meta.url)

const getFeaturesJSON = JSON.parse(readFileSync(join(CWD, '__fixtures__/__getFeatures__.json'), 'utf8'))

describe('__fixtures__', () => {
    it('validates getResponse() JSON', () => {
        getFeaturesResponseSchema.parse(getFeaturesJSON)
    })
})
