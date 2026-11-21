import { useEffect, useState } from 'react'

import { RESERVE, type Availability } from './reserve'

const fetchAvailability = async (): Promise<Availability> =>
  (await fetch(RESERVE.availabilityPath)).json()

export function SeatCount() {
  const [seats, setSeats] = useState<number | null>(null)
  useEffect(() => {
    void fetchAvailability().then(({ seats: free }) => setSeats(free))
  }, [])
  return seats === null ? null : <output className="reserve-seats">{seats}</output>
}
