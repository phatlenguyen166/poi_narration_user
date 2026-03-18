import type { PropsWithChildren } from 'react'

export const MobileFrame = ({ children }: PropsWithChildren) => {
  return (
    <div className='mobile-frame'>
      <div className='mobile-frame__shell'>{children}</div>
    </div>
  )
}
