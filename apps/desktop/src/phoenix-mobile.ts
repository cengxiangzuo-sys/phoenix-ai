/** Phoenix's Android release share, including the public access code shown to recipients. */
export const PHOENIX_ANDROID_SHARE = {
  url: 'https://pan.baidu.com/s/10J3kWov-euHkceNIwJ2Amw',
  accessCode: 'ppwd',
} as const

/**
 * Only expose a web release link configured for this Phoenix build.
 * @param value - App publisher's HTTPS download page.
 * @returns A release URL without embedded credentials, or undefined if unavailable.
 */
export function phoenixMobileDownloadUrl(value: string | undefined): string | undefined {
  if (value === undefined || value === '') return undefined
  try {
    const url = new URL(value)
    if (url.protocol === 'https:' && url.username === '' && url.password === '') return url.href
  } catch {
    // An invalid release URL is shown as unavailable.
  }
  return undefined
}

/**
 * Copy for the Phoenix-only Connect Phone dialog.
 * @param locale - Current application language.
 * @returns Dialog and button labels.
 */
export function phoenixMobileMessages(locale: string) {
  return locale === 'zh-CN' ? {
    title: '连接手机',
    detail: '安装 Phoenix 安卓版后，电脑点「扫码配对」。在弹窗中选择 Phoenix 并生成二维码。手机从「连接 → 扫码配对电脑」扫描，再把手机上显示的验证码填到电脑上。',
    unpublished: 'Phoenix 安卓版的公网下载尚未开放。已安装手机版时，可进入扫码配对。',
    download: '下载 Phoenix 安卓版',
    copy: '复制下载链接',
    copyCode: '复制提取码',
    downloadCodeHint: '打开下载页时会自动复制提取码。',
    pair: '扫码配对',
    close: '关闭',
  } : {
    title: 'Connect Phone',
    detail: 'Install Phoenix on Android and choose Scan to Pair on your computer. Select Phoenix in the dialog and generate a QR code. Scan it from Connect → Pair a computer on your phone, then enter the phone’s verification code on your computer.',
    unpublished: 'The public Phoenix Android download is pending. You can pair an Android device with Phoenix already installed.',
    download: 'Download Phoenix for Android',
    copy: 'Copy Download Link',
    copyCode: 'Copy Access Code',
    downloadCodeHint: 'Opening the download page copies its access code.',
    pair: 'Scan to Pair',
    close: 'Close',
  }
}
