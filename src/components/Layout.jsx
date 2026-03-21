import { Outlet } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function Layout() {
  const { state } = useApp()
  const { sidebarOpen } = state

  return (
    <div className="app-layout">
      <Sidebar />
      <div className={`main-content ${!sidebarOpen ? 'collapsed' : ''}`}>
        <Topbar />
        <Outlet />
      </div>
    </div>
  )
}
