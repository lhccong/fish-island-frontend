/** 权重事件 */
export type EventWithWeight = [number, number]

/** 年龄 */
export type Age = {
    /** 年龄 */
    readonly age: number
    /** 事件池 */
    readonly event: EventWithWeight[][]
}
// @vt-types-end
function handleEvent(val: string | number): {
    event: EventWithWeight
    level: number
} {
    if (typeof val === 'number') return { event: [val, 1], level: 0 }
    if (typeof val !== 'string') throw new Error(`Invalid event value: ${val}`)
    const [wval, l] = val.split('|')
    const [e, w] = wval!.split('*')
    return { event: [Number(e), Number(w) || 1], level: Number(l) || 0 }
}

export const transformers = {
    age: Number,
    event: (val: any) => {
        if (val === null || val === undefined || !Array.isArray(val))
            throw new Error(`Invalid event value: ${val}`)
        const ab: EventWithWeight[][][] = [[], []]
        for (const v of val) {
            const { event, level } = handleEvent(v)
            const li = level < 0 ? ab[1]! : ab[0]!
            const l = Math.abs(level)
            if (!li[l]) li[l] = []
            li[l].push(event)
        }
        const levels = ab[0]!.reverse().concat(ab[1]!)
        for (let i = 0; i < levels.length; i++) {
            if (!levels[i]) levels[i] = []
            const level = levels[i]!
            const pow = level.reduce(
                (pow, [, w]) =>
                    Math.max(pow, w.toString().split('.')[1]?.length || 0),
                0,
            )
            if (pow <= 1) continue
            const scale = 10 ** pow
            for (const item of level) item[1] = Math.floor(item[1] * scale)
        }
        return levels
    },
}
