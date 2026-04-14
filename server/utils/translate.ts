import translate from 'google-translate-api-x'

/**
 * Translate text from Chinese to English using Google Translate.
 * No API key required.
 */
export async function translateText(
  text: string,
  from: string = 'zh-CN',
  to: string = 'en'
): Promise<string> {
  if (!text || text.trim().length === 0) {
    return ''
  }

  try {
    const result = await translate(text, { from, to })

    // google-translate-api-x returns either a single result or an array
    if (Array.isArray(result)) {
      return result.map((r: any) => r.text).join('\n')
    }

    return result.text || ''
  } catch (error: any) {
    console.error('[translate] Google Translate error:', error.message || error)
    return ''
  }
}
