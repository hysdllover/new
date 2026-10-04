import Log from './study/Log.jsx'
import Timer from './study/Timer.jsx'
import Plan from './study/Plan.jsx'
import Review from './study/Review.jsx'
import Progress from './study/Progress.jsx'
import Records from './study/Records.jsx'
import Subjects from './study/Subjects.jsx'

export default function Study({ seg, params }) {
  const V = { log: Log, timer: Timer, plan: Plan, review: Review, progress: Progress, records: Records, subjects: Subjects }[seg] || Log
  return <V params={params} />
}
