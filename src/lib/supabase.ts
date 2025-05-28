import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type ComputerStatus = 'online' | 'shutting_down' | 'offline'


export interface Computer {
  id: string
  machine_id: string
  name: string
  status: ComputerStatus
  created_at: string
  updated_at: string
}

export async function getComputerByMachineId(machineId: string) {
  const { data, error } = await supabase
    .from('computers')
    .select()
    .eq('machine_id', machineId)
    .single()
  
  if (error && error.code !== 'PGRST116') throw error
  return data as Computer | null
}

export async function addComputer(machineId: string, name: string) {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('computers')
    .insert([{ 
      machine_id: machineId,
      name: name,
      status: 'online', // 初始状态为在线
      created_at: now,
      updated_at: now 
    }])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function removeComputer(machineId: string) {
  const { error } = await supabase
    .from('computers')
    .delete()
    .eq('machine_id', machineId)
  
  if (error) throw error
}



export async function updateComputerStatus(machineId: string, status: ComputerStatus) {
  const { error } = await supabase
    .from('computers')
    .update({ 
      status,
      updated_at: new Date().toISOString()
    })
    .eq('machine_id', machineId)
  
  if (error) throw error
}

export async function updateComputerName(machineId: string, name: string) {
  const { error } = await supabase
    .from('computers')
    .update({ 
      name,
      updated_at: new Date().toISOString()
    })
    .eq('machine_id', machineId)
  
  if (error) throw error
}

export async function subscribeToComputerStatus(machineId: string, onStatusChange: (status: ComputerStatus) => void) {
  return supabase
    .channel(`computer_status_${machineId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'computers',
        filter: `machine_id=eq.${machineId}`,
      },
      (payload: any) => {
        if (payload.new.status !== payload.old.status) {
          onStatusChange(payload.new.status)
        }
      }
    )
    .subscribe()
}
