import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import { join } from 'path'
import { cwd } from '../../../../../scripts/script-utils.js'
import { getFeaturesResponseSchema, updateResourceParamsSchema } from './__generated__/schema.parsers.mjs'
const CWD = cwd(import.meta.url)

const getFeaturesJSON = JSON.parse(readFileSync(join(CWD, '__fixtures__/__getFeatures__.json'), 'utf8'))

describe('__fixtures__', () => {
    it('validates getResponse() JSON', () => {
        getFeaturesResponseSchema.parse(getFeaturesJSON)
    })
    it('validates updateResource() JSON for new remote URL', () => {
        /** @type {import("./__generated__/schema.types").UpdateResourceParams} */
        const params = {
            id: "privacy-configuration",
            source: {
                remote: {
                    url: "https://example.com/macos-config.json"
                }
            }
        }
        updateResourceParamsSchema.parse(params)
    })
    it('validates updateResource() for new incoming source ', () => {
        /** @type {import("./__generated__/schema.types").UpdateResourceParams} */
        const params = {
            id: "privacy-configuration",
            source: {
                debugTools: {
                    content: "{}" // <- JSON content as a string
                }
            }
        }
        updateResourceParamsSchema.parse(params)
    })
})
