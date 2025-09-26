import { NextApiRequest, NextApiResponse } from 'next'
import { websocketManager } from '@/lib/websocket-server'

const ioHandler = (req: NextApiRequest, res: NextApiResponse) => {
  if (!(res.socket as any).server.io) {
    console.log('*First use, starting socket.io server')
    
    const io = websocketManager.initialize((res.socket as any).server)
    ;(res.socket as any).server.io = io
  } else {
    console.log('socket.io server already running')
  }
  res.end()
}

export default ioHandler