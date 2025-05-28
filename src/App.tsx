import { useState, useEffect } from 'react'
import { Button, Input, Spin } from 'antd'
import { LinkOutlined, DisconnectOutlined, EditOutlined } from '@ant-design/icons'
import { 
  getComputerByMachineId, 
  addComputer, 
  removeComputer,
  updateComputerName,
  subscribeToComputerStatus,
  updateComputerStatus,
  type Computer 
} from './lib/supabase'

export default function App() {
  const [computer, setComputer] = useState<Computer | null>(null)
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [machineId, setMachineId] = useState<string>('')
  const [computerName, setComputerName] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)

  // 初始化：获取机器ID和状态
  const initialize = async () => {
    try {
      setInitializing(true)
      const id = await window.electronAPI.getMachineId()
      if (id) {
        setMachineId(id)
        const data = await getComputerByMachineId(id)
        setComputer(data)          
        // 启动时更新状态为在线
        await updateComputerStatus(id, 'online')
      }
    } catch (error) {
      console.error('Initialization failed:', error)
    } finally {
      setInitializing(false)
    }
  }
  useEffect(() => {
    initialize()
  }, [])

  // 订阅状态变更
  useEffect(() => {
    let subscription: Promise<{ unsubscribe: () => void }> | undefined;

    const setupSubscription = async () => {
      if (subscription) {
        const sub = await subscription;
        sub.unsubscribe();
      }

      if (machineId) {
        // 监听关机请求
        subscription = subscribeToComputerStatus(machineId, async (newStatus) => {
          if (newStatus === 'shutting_down') {
            try {
              // 先将状态更新为已关机
              await updateComputerStatus(machineId, 'offline')
              
              // 然后执行关机
              const success = await window.electronAPI.shutdownComputer()
              if (!success) {
                // 如果关机失败，恢复在线状态
                await updateComputerStatus(machineId, 'online')
              }
            } catch (error) {
              console.error('Shutdown failed:', error)
              // 失败时恢复在线状态
              await updateComputerStatus(machineId, 'online')
            }
          }
        })
      }
    };

    setupSubscription();

    return () => {
      if (subscription) {
        subscription.then(sub => sub.unsubscribe());
      }
    };
  }, [machineId])


  const handleAddComputer = async () => {
    if (!machineId || !computerName.trim()) return
    try {
      setLoading(true)
      const data = await addComputer(machineId, computerName.trim())
      setComputer(data)
    } catch (error) {
      console.error('Failed to add computer:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveComputer = async () => {
    if (!machineId) return
    try {
      setLoading(true)
      await removeComputer(machineId)
      setComputer(null)
    } catch (error) {
      console.error('Failed to remove computer:', error)
    } finally {
      setLoading(false)
    }
  }


  const handleUpdateName = async () => {
    if (!machineId || !computerName.trim()) return
    try {
      setLoading(true)
      await updateComputerName(machineId, computerName.trim())
      const data = await getComputerByMachineId(machineId)
      setComputer(data)
      setIsEditingName(false)
    } catch (error) {
      console.error('Failed to update computer name:', error)
    } finally {
      setLoading(false)
    }
  }

  if (initializing) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg flex flex-col items-center space-y-6">
        {!computer ? (
          <div className="w-full flex flex-col gap-4">
            <Input 
              placeholder="输入电脑名称"
              value={computerName}
              onChange={(e) => setComputerName(e.target.value)}
              size="large"
            />
            <Button
              type="primary"
              icon={<LinkOutlined />}
              size="large"
              onClick={handleAddComputer}
              loading={loading}
              className="bg-blue-500"
              disabled={!computerName.trim()}
            >
              加入远程控制
            </Button>
          </div>
        ) : (
          <>            <div className="flex items-center justify-between w-full p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-4">
                <span className="text-lg text-gray-700 whitespace-nowrap">电脑名称:</span>
                {isEditingName ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={computerName}
                      onChange={(e) => setComputerName(e.target.value)}
                      onPressEnter={handleUpdateName}
                      autoFocus
                    />
                    <Button 
                      type="primary"
                      size="small"
                      onClick={handleUpdateName}
                      loading={loading}
                    >
                      确定
                    </Button>
                    <Button
                      size="small"
                      onClick={() => {
                        setIsEditingName(false)
                        setComputerName(computer.name)
                      }}
                    >
                      取消
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-lg text-gray-700">
                      {computer.name}
                    </span>
                    <Button 
                      type="text" 
                      icon={<EditOutlined />}
                      onClick={() => {
                        setComputerName(computer.name)
                        setIsEditingName(true)
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            <Button
              type="default"
              danger
              icon={<DisconnectOutlined />}
              size="large"
              onClick={handleRemoveComputer}
              loading={loading}
            >
              移除远程控制
            </Button>
          </>
        )}
        
        {machineId && (
          <div className="text-sm text-gray-500">
            设备ID: {machineId}
          </div>
        )}
      </div>
    </div>
  )
}

