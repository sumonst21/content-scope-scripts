import { cwd, isLaunchFile } from './script-utils.js'
import { dirname, join, relative } from 'node:path'
import { createRequire } from 'node:module'
import { compileFromFile } from 'json-schema-to-typescript'
import { writeFileSync } from 'node:fs'

const ROOT = join(cwd(import.meta.url), '..')
const require = createRequire(import.meta.url);
const configBuilderRoot = dirname(require.resolve("config-builder"));

const defaultMapping = {
    "Duck Player Settings": {
        schema: join(configBuilderRoot, "tests/schemas/duckplayer-settings.json"),
        types: join(ROOT, "src/features/duckplayer/duckplayer-settings.ts")
    }
}

/**
 * Read JSON schemas from the privacy-configuration repo and generate TypeScript types
 *
 * **note** we are NOT adding try/catch around each operation here since we want the script to fail fast
 * and the errors given from node are sufficient to debug any issues
 */
export async function generateSchemas(mapping = defaultMapping) {
    for (let [featureName, manifest] of Object.entries(mapping)) {
        const typescript = await compileFromFile(manifest.schema, {
            bannerComment: `
            /**
             * @module ${featureName} Schema
             * @description 
             * These types are auto-generated from schema files within https://github.com/duckduckgo/privacy-configuration
             * **DO NOT** edit this file directly as your changes will be lost.
             */
            `
        });
        writeFileSync(manifest.types, typescript);
        console.log('✅ %s schema written to `%s` from schema `%s`', featureName, relative(ROOT, manifest.types), manifest.schema)
    }
}


if (isLaunchFile(import.meta.url)) {
    generateSchemas()
        .catch(console.error)
}
