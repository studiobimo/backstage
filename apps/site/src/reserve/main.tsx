import { createRoot } from 'react-dom/client'

import './reserve.css'
import { RESERVE } from './reserve'
import { SeatCount } from './seat-count'

createRoot(document.getElementById(RESERVE.mountId)!).render(<SeatCount />)
