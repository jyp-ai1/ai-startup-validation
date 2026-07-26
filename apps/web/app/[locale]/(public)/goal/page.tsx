import { redirect } from 'next/navigation';

/** Legacy `/goal` — V2 entry is `/who`. */
export default function GoalPage() {
  redirect('/who');
}
