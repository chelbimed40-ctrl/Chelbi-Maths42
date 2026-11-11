import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ShortInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  redirect(`/register/${token}`);
}
