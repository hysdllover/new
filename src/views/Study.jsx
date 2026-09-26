import Timer from './study/Timer.jsx'
import Plan from './study/Plan.jsx'
import Review from './study/Review.jsx'
import Progress from './study/Progress.jsx'
import Records from './study/Records.jsx'

export default function Study({ seg }) {
  const V = { timer: Timer, plan: Plan, review: Review, progress: Progress, records: Records }[seg] || Timer
  return <V />
}
