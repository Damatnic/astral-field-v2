// Redirect from /team/[id] to /teams/[id]
import { redirect } from 'next/navigation';

interface PageProps {
  params: {
    id: string;
  };
}

export default function TeamRedirect({ params }: PageProps) {
  redirect(`/teams/${params.id}`);
}