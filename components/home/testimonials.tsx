import { testimonials } from "@/lib/data"
import { Quote } from "lucide-react"

export function Testimonials() {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">Success Stories</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Hear from volunteers and NGOs who have experienced the power of skills-based giving.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="relative p-8 rounded-2xl bg-card border border-border shadow-sm">
              <Quote className="h-10 w-10 text-primary/20 mb-4" />
              <blockquote className="text-foreground mb-6 leading-relaxed">"{testimonial.quote}"</blockquote>
              <div className="flex items-center gap-4">
                <img
                  src={testimonial.avatar || "/placeholder.svg"}
                  alt={testimonial.author}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <p className="font-semibold text-foreground">{testimonial.author}</p>
                  <p className="text-sm text-muted-foreground">
                    {testimonial.role}, {testimonial.organization}
                  </p>
                </div>
              </div>
              <div
                className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium ${
                  testimonial.type === "volunteer" ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"
                }`}
              >
                {testimonial.type === "volunteer" ? "Volunteer" : "NGO"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
