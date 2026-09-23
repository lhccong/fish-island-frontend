import { type Event, events } from '../data'
import type { Properties, GameState, ProfileState } from './state'
import { propsEffect, createFlatState } from './state'
import { check as checkCondition } from '../condition'
import type { TriggerResult } from './game'
import { produce } from 'immer'
import { pickWeight, type RNG } from '../vitex'

function conditionState(eventId: number, state: GameState) {
    if (eventId >= 900000 || !state.lifespanLoss) return state
    return {
        ...state,
        props: { ...state.props, current: { ...state.props.current, age: state.props.current.age + state.lifespanLoss } },
    }
}

export function check(
    event: Event['id'],
    state: GameState,
    profile: ProfileState,
) {
    const { include, exclude, NoRandom } = events.get(event)!
    if (NoRandom) return false
    const flatState = createFlatState(conditionState(event, state), profile)
    if (exclude && checkCondition(flatState, exclude)) return false
    if (include) return checkCondition(flatState, include)
    return true
}

export function trigger(
    eventId: number,
    state: GameState,
    profile: ProfileState,
    rng?: RNG,
): TriggerResult<Event['id']> {
    const { effect, branch, set, randomBranch, lifespanLoss, strengthCostPerGain } = events.get(eventId)!
    const newState = produce(state, draft => {
        draft.events.add(eventId)
        if (lifespanLoss) draft.lifespanLoss = (draft.lifespanLoss || 0) + lifespanLoss
        if (strengthCostPerGain !== undefined) draft.props.strengthCostPerGain = strengthCostPerGain
        if (effect?.LIF) draft.life += effect.LIF
        const pe: Partial<Properties> = {}
        if (effect?.CHR) pe.charm = effect.CHR
        if (effect?.INT) pe.intelligence = effect.INT
        if (effect?.STR) pe.strength = effect.STR
        if (effect?.MNY) pe.money = effect.MNY
        if (effect?.SPR) pe.spirit = effect.SPR
        const keys = { CHR: 'charm', INT: 'intelligence', STR: 'strength', MNY: 'money', SPR: 'spirit' } as const
        for (const key of Object.keys(keys) as Array<keyof typeof keys>) {
            if (set?.[key] !== undefined) pe[keys[key]] = set[key]! - draft.props.current[keys[key]]
        }
        draft.props = propsEffect(draft.props, pe)
    })
    if (randomBranch?.length) {
        const target = pickWeight(randomBranch.map(([id, weight]) => [id, weight] as [number, number]), rng)
        if (target === null) throw new Error('Invalid weighted event branch')
        const result = trigger(target, newState, profile, rng)
        return { state: result.state, triggers: [eventId, ...result.triggers] }
    }
    const flatState = createFlatState(conditionState(eventId, newState), profile)
    if (branch) {
        for (const { condition, event } of branch) {
            if (checkCondition(flatState, condition)) {
                const result = trigger(event, newState, profile, rng)
                return {
                    state: result.state,
                    triggers: [eventId, ...result.triggers],
                }
            }
        }
    }
    return { state: newState, triggers: [eventId] }
}

