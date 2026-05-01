'use client'
import dynamic from 'next/dynamic'

const AppProvider = dynamic(
  () => import('@/context/AppContext').then(m => m.AppProvider),
  { ssr: false }
)
const App = dynamic(() => import('@/components/App'), { ssr: false })

export default function Home() {
  return (
    <AppProvider>
      <App />
    </AppProvider>
  )
}
