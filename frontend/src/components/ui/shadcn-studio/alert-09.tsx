'use client'

import { Alert } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { BadgeAlert } from 'lucide-react'
import type { ReactNode } from 'react'

type AlertTaskDemoProps = {
  value?: number
  message?: ReactNode
}

const AlertTaskDemo = ({ value = 0, message }: AlertTaskDemoProps) => {
  const safeValue = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))

  return (
    <Alert className='inline-flex items-center gap-1.5 rounded-full border border-transparent bg-amber-400/90 px-2 py-1 text-amber-950 shadow-sm'>
      <span className='inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/30 text-amber-900'>
        <BadgeAlert className='h-3 w-3' strokeWidth={2.25} />
      </span>
      <div className='flex flex-1 flex-col gap-0.5'>
        {message ? (
          <div className='text-[11px] font-semibold leading-snug text-amber-950'>
            {message}
          </div>
        ) : (
          <>
            <div className='flex items-center justify-between text-[11px] uppercase tracking-wide text-white/80'>
              <span>{safeValue}% allocated</span>
              <span>{Math.max(0, 100 - safeValue)}% remaining</span>
            </div>
            <Progress value={safeValue} aria-label='Weight allocation completeness' />
          </>
        )}
      </div>
    </Alert>
  )
}

export default AlertTaskDemo
