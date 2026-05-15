import { rmSync } from "node:fs"

rmSync(".next/dev/types", { recursive: true, force: true })