import {
    getFeaturesResponseSchema,
    remoteResourceSchema,
    updateResourceParamsSchema
} from '../../schema/__generated__/schema.parsers.mjs'

/**
 * Messaging
 */
export class DebugToolsMessages {
    /**
     * @param {import("@duckduckgo/messaging").Messaging} messaging
     * @internal
     */
    constructor (messaging) {
        /**
         * @internal
         */
        this.messaging = messaging
    }

    /**
     * @return {Promise<import("../../schema/__generated__/schema.types").GetFeaturesResponse>}
     */
    async getFeatures () {
        const response = await this.messaging.request('getFeatures')
        const parsed = getFeaturesResponseSchema.parse(response)
        return parsed;
    }

    /**
     * @param {import("../../schema/__generated__/schema.types").UpdateResourceParams} params
     * @return {Promise<import("../../schema/__generated__/schema.types").RemoteResource>}
     */
    async updateResource (params) {
        const outgoing = updateResourceParamsSchema.parse(params)
        const response = await this.messaging.request('updateResource', outgoing)
        const featuresResponse = getFeaturesResponseSchema.parse(response)
        const matching = featuresResponse.features.remoteResources.resources.find(x => x.id == params.id);
        if (!matching) {
            throw new Error('todo! how can we get here?')
        }
        return matching
    }
}
