// app/(main)/page.tsx
import { QueueBoard } from "@/components/queue-board"

export default function TestPage() {
  return (
    <div className="p-4 bg-slate-100 min-h-screen">
      <QueueBoard />
    </div>
  )
}