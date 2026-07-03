import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseKey)

// S'abonne aux changements d'une table et rappelle onChange (on refetch plutôt que patcher le state à la main)
export function subscribeToTable(table, filter, onChange) {
    const channel = supabase
        .channel(`${table}-${filter || 'all'}-${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table, filter }, onChange)
        .subscribe()
    return () => supabase.removeChannel(channel)
}
