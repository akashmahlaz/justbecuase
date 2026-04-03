import { redirect } from "next/navigation"

export default async function VolunteerPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  redirect(`/${lang}/volunteer/dashboard`)
}
