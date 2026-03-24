import type { PropsWithChildren } from 'react'

export const MobileFrame = ({ children }: PropsWithChildren) => {
  return (
    <div className='mobile-frame app-shell'>
      <div className='mobile-frame__shell app-shell__viewport'>{children}</div>
    </div>
  )
}
