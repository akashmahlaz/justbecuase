import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2 } from "lucide-react"

export default function EnrichmentPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="size-5 text-orange-600" />
          Enterprise Enrichment
        </CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground">
        Coming soon — Enrich existing Enterprise profiles with TheirStack company intelligence.
      </CardContent>
    </Card>
  )
}
