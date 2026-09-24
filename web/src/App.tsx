import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { WelcomePage } from './pages/welcome-page'
import { UploadPage } from './pages/upload-page'
import { GoalPage } from './pages/goal-page'
import { PreparingPage } from './pages/preparing-page'
import { SprintPlaceholderPage } from './pages/sprint-placeholder-page'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false },
  },
})

function NotFoundPage() {
  return <SprintPlaceholderPage title="Page not found" description="Let’s get you back to your learning flow." />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/goal" element={<GoalPage />} />
          <Route path="/preparing" element={<PreparingPage />} />
          <Route path="/practice" element={<SprintPlaceholderPage title="Practice is next" description="Your practice screen is coming in Sprint 2. Your prepared questions are safe." />} />
          <Route path="/results" element={<SprintPlaceholderPage title="Results are next" description="Complete a practice session to unlock your results view." />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
