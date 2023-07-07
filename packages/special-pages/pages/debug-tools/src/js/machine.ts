import { createMachine, raise } from 'xstate'
import { UpdateResourceParams } from '../../schema/__generated__/schema.types'

export const getMachine = () => createMachine({
    id: 'Panel Open',
    initial: 'Initial state',
    states: {
        'Initial state': {
            invoke: {
                src: 'getFeatures',
                onDone: [
                    {
                        target: 'reading desired feature',
                        actions: 'assignFeatures'
                    }
                ],
                onError: [
                    {
                        target: 'showing error',
                        actions: 'assignError'
                    }
                ]
            }
        },
        'reading desired feature': {
            description: 'Could come from a URL segment or selected by first ID',
            entry: 'assignCurrentFeature',
            always: {
                target: 'showing remote resources feature'
            }
        },
        'showing error': {
            on: {
                '👆 retry': {
                    target: 'Initial state'
                }
            }
        },
        'showing remote resources feature': {
            initial: 'reading desired resource',
            states: {
                'reading desired resource': {
                    description: 'could be from a URL or select the first',
                    always: [
                        {
                            target: 'loading resource',
                            actions: ['assignResource', 'raiseUpdated']
                        }
                    ]
                },
                'loading resource': {
                    description: 'this will try to read from the incoming data',
                    invoke: {
                        src: 'parseJSON',
                        onDone: [
                            {
                                target: 'showing editor'
                            }
                        ],
                        onError: [
                            {
                                target: 'resourceInvalid',
                                actions: ['assignError']
                            }
                        ]
                    }
                },
                'showing editor': {
                    id: 'showing editor',
                    type: 'parallel',
                    states: {
                        errors: {
                            initial: 'none',
                            states: {
                                none: {},
                                some: {}
                            },
                            on: {
                                error: {
                                    target: '.some'
                                },
                                clearErrors: {
                                    target: '.none'
                                }
                            }
                        },
                        editing: {
                            initial: 'editorEnabled',
                            states: {
                                editorEnabled: {
                                    on: {
                                        'save new remote': {
                                            target: 'saving new remote'
                                        },
                                        'save edited': {
                                            target: 'saving edited'
                                        }
                                    }
                                },
                                'saving new remote': {
                                    invoke: {
                                        src: 'saveNewRemote',
                                        onDone: [
                                            {
                                                target: 'editorEnabled',
                                                actions: [
                                                    'updateCurrentResource',
                                                    'clearErrors',
                                                    'raiseUpdated'
                                                ]
                                            }
                                        ],
                                        onError: [
                                            {
                                                target: 'editorEnabled',
                                                actions: ['serviceError']
                                            }
                                        ]
                                    }
                                },
                                'saving edited': {
                                    description: '```json\n{ \n   id: "privacy-configuration",\n   source: {\n       debugTools: { content: "{...}" }  \n   }\n}\n```',
                                    invoke: {
                                        src: 'saveEdited',
                                        onError: [
                                            {
                                                target: 'editorEnabled',
                                                actions: ['serviceError']
                                            }
                                        ],
                                        onDone: [
                                            {
                                                target: 'editorEnabled',
                                                actions: [
                                                    'updateCurrentResource',
                                                    'clearErrors',
                                                    'raiseUpdated'
                                                ],
                                                description: "in this response, we'll have access to the updated 'remote resource', so we can use it directly"
                                            }
                                        ]
                                    }
                                }
                            }
                        }
                    }
                },
                resourceInvalid: {}
            }
        }
    },
    schema: {
        events: {} as
          | { type: 'save new remote', payload: UpdateResourceParams }
          | { type: 'save edited', payload: UpdateResourceParams }
          | { type: '👆 retry'} | {type: 'Event 1'} | {type: '👆 save modifications'} | {type: '✏️ edits'}
          | { type: 'error' } | { type: 'clearErrors' }
    },
    predictableActionArguments: true,
    preserveActionOrder: true
})
