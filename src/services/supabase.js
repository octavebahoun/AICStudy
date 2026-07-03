import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseKey)

// S'abonne aux changements d'une table et rappelle onChange (on refetch plutôt que patcher le state à la main)
export function subscribeToTable(table, filter, onChange) {
    window.__subCalls = window.__subCalls || []
    window.__subCalls.push({ table, filter, at: Date.now() })
    const wrappedOnChange = (payload) => {
        window.__subCalls.push({ event: 'payload', table, eventType: payload.eventType, at: Date.now() })
        onChange(payload)
    }
    const channel = supabase
        .channel(`${table}-${filter || 'all'}-${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table, filter }, wrappedOnChange)
        .subscribe((status, err) => {
            window.__subCalls.push({ status, err: err ? String(err) : null, table, at: Date.now() })
        })
    return () => {
        window.__subCalls.push({ unsub: table, at: Date.now() })
        supabase.removeChannel(channel)
    }
}
