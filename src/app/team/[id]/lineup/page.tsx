// Redirect from /team/[id]/lineup to /teams/[id]/lineup
import { redirect } from 'next/navigation';

interface PageProps {
  params: {
    id: string;
  };
}

export default function LineupRedirect({ params }: PageProps) {
  redirect(`/teams/${params.id}/lineup`);
}