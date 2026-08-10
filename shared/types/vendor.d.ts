// Ambient declarations for dependencies that ship no TypeScript types.
// Kept in shared/ because both the app and server tsconfig projects include
// shared/**/*.d.ts.

// opencc-js 1.x — only the surface this app uses (@types/opencc-js targets an
// older API without ConverterFactory/Locale, so we declare our own).
declare module 'opencc-js' {
  export const Locale: {
    from: Record<string, any>
    to: Record<string, any>
  }
  export function ConverterFactory(...dictionaries: any[]): (text: string) => string
  export function Converter(options: { from: string; to: string }): (text: string) => string
}

declare module '@meting/core' {
  const Meting: any
  export default Meting
}
