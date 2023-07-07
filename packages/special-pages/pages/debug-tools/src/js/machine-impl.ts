import { assign, pure, raise } from 'xstate'
import { getFeaturesResponseSchema, remoteResourceSchema } from '../../schema/__generated__/schema.parsers.mjs'
import * as z from 'zod'
import { DebugToolsMessages } from './DebugToolsMessages.mjs'
import { getMachine } from './machine'

export function withMessages (baseMachine: ReturnType<typeof getMachine>, messages: DebugToolsMessages) {
    return baseMachine.withConfig({
        services: {
            // eslint-disable-next-line require-await
            getFeatures: async () => {
                return messages.getFeatures()
            },
            // eslint-disable-next-line require-await
            parseJSON: async () => {
                return true
            },
            // eslint-disable-next-line require-await
            saveNewRemote: async (ctx, evt) => {
                if (evt.type === 'save new remote') {
                    const response = await messages.updateResource(evt.payload)
                    return response
                }
                throw new Error('not supported')
            },
            saveEdited: async (ctx, evt) => {
                if (evt.type === 'save edited') {
                    const response = await messages.updateResource(evt.payload)
                    return response
                }
                throw new Error('not supported')
            }
        },
        actions: {
            assignFeatures: assign({
                features: (_, evt) => {
                    const data = getFeaturesResponseSchema.parse((evt as any).data)
                    return data.features
                },
                resources: (_, evt) => {
                    const data = getFeaturesResponseSchema.parse((evt as any).data)
                    return data.features.remoteResources.resources
                }
            }),
            assignCurrentFeature: assign({
                currentFeature: () => 'remoteResources'
            }),
            assignResource: assign({
                currentResource: (ctx, evt) => 'privacy-configuration'
            }),
            serviceError: pure((ctx, evt) => {
                const schema = z.string()
                const parsed = schema.parse((evt as any).data?.message)
                return [
                    assign({ error: () => parsed }),
                    raise({ type: 'error' })
                ]
            }),
            clearErrors: pure((ctx, evt) => {
                return [
                    assign({ error: () => null }),
                    raise({ type: 'clearErrors' })
                ]
            }),
            updateCurrentResource: assign({
                resources: (ctx, evt) => {
                    const data = getFeaturesResponseSchema.parse(ctx)
                    const updated = remoteResourceSchema.parse((evt as any).data)
                    const current = z.string().parse((ctx as any).currentResource)
                    return data.features.remoteResources.resources.map(res => {
                        if (current === res.id) {
                            return updated
                        } else {
                            return res
                        }
                    })
                }
            }),
            raiseUpdated: assign({
                resourceKey: (ctx) => ((ctx as any).resourceKey ?? 0) + 1
            })
        }
    })
}
