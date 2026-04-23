/**
 * Brand icon shim.
 *
 * The `lucide-react@1.8.0` fork pinned in package.json removed the social
 * brand icons (Linkedin / Twitter / Facebook / Instagram). Rather than bumping
 * lucide (risky — would cascade into other icons that have changed shape) or
 * editing every call site, we re-export look-alikes from `react-icons/fa`
 * under the lucide names so existing imports just need to change the source
 * module.
 *
 * Each wrapper accepts `className` (passed through) and a `size` number
 * (mapped to width/height attrs) so existing `<Linkedin className="h-5 w-5" />`
 * usage continues to work.
 */

import * as React from "react"
import {
  FaLinkedin,
  FaTwitter,
  FaFacebook,
  FaInstagram,
} from "react-icons/fa"

interface BrandIconProps extends React.SVGAttributes<SVGElement> {
  size?: number | string
}

const wrap = (Comp: React.ComponentType<any>) =>
  React.forwardRef<SVGElement, BrandIconProps>(({ size, className, ...rest }, ref) => (
    <Comp ref={ref as any} size={size} className={className} {...rest} />
  ))

export const Linkedin = wrap(FaLinkedin)
export const Twitter = wrap(FaTwitter)
export const Facebook = wrap(FaFacebook)
export const Instagram = wrap(FaInstagram)

Linkedin.displayName = "Linkedin"
Twitter.displayName = "Twitter"
Facebook.displayName = "Facebook"
Instagram.displayName = "Instagram"
