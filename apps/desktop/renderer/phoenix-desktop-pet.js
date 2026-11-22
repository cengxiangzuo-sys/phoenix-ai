const locale = new URLSearchParams(window.location.search).get('locale')
const zh = locale === 'zh-CN'
const copy = zh ? {
  mascot: '查看余额和会话', gesture: '按住小火人拖动，轻点查看余额和会话', open: '打开 Phoenix AI', hide: '隐藏桌宠', collapse: '收起详情',
  balance: 'DeepSeek API 余额', work: '正在运行的会话', idle: '当前没有正在运行的会话',
  loading: '正在读取余额…', offline: 'Phoenix 尚未连接', signedOut: '登录 DeepSeek 账号后可查看余额',
  failed: '暂时无法读取余额', empty: '服务未返回钱包数据', toppedUp: '充值', bonus: '赠金',
} : {
  mascot: 'Show balance and sessions', gesture: 'Drag to move; click for balance and sessions', open: 'Open Phoenix AI', hide: 'Hide desktop pet', collapse: 'Close details',
  balance: 'DeepSeek API balance', work: 'Active sessions', idle: 'No sessions are running',
  loading: 'Checking balance…', offline: 'Phoenix is still connecting', signedOut: 'Sign in to DeepSeek to view your balance',
  failed: 'Balance is unavailable', empty: 'No wallets were returned', toppedUp: 'Topped up', bonus: 'Granted',
}
document.documentElement.lang = zh ? 'zh-CN' : 'en'
const get = id => document.getElementById(id)
for (const [id, label] of [['mascot-button', copy.mascot], ['open', copy.open], ['hide', copy.hide], ['collapse', copy.collapse]]) {
  get(id).setAttribute('aria-label', label)
  get(id).title = label
}
get('balance-title').textContent = copy.balance
get('work-title').textContent = copy.work

const mascot = get('mascot-button')
mascot.title = copy.gesture
const companion = window.phoenixCompanion
if (companion?.drag) {
  let press
  let suppressClick = false
  mascot.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || !event.isPrimary) return
    suppressClick = false
    press = { id: event.pointerId, x: event.screenX, y: event.screenY, lastX: event.screenX, moving: false }
    mascot.setPointerCapture(event.pointerId)
    companion.drag('start')
  })
  mascot.addEventListener('pointermove', (event) => {
    if (press?.id !== event.pointerId) return
    if (!press.moving && Math.hypot(event.screenX - press.x, event.screenY - press.y) < 5) return
    press.moving = true
    if (event.screenX !== press.lastX) document.body.dataset.dragging = event.screenX < press.lastX ? 'left' : 'right'
    press.lastX = event.screenX
    companion.drag('update', { x: event.screenX - press.x, y: event.screenY - press.y })
  })
  const end = (event) => {
    if (press === undefined || (event.type !== 'blur' && event.pointerId !== press.id)) return
    suppressClick = press.moving
    if (press.moving && event.type === 'pointerup') {
      companion.drag('finish', { x: event.screenX - press.x, y: event.screenY - press.y })
    } else {
      companion.drag('cancel')
    }
    press = undefined
    delete document.body.dataset.dragging
  }
  mascot.addEventListener('pointerup', end)
  mascot.addEventListener('pointercancel', end)
  mascot.addEventListener('lostpointercapture', end)
  window.addEventListener('blur', end)
  mascot.addEventListener('click', (event) => {
    if (suppressClick && event.detail > 0) {
      event.preventDefault()
      suppressClick = false
    }
  })
}

function drawBalance(value) {
  const balance = get('balance')
  if (value === null) { balance.textContent = copy.signedOut; return }
  if (value === 'loading' || value === 'offline') { balance.textContent = copy[value]; return }
  if (value.status === 'failed') { balance.textContent = copy.failed; return }
  const groups = [[copy.toppedUp, value.value], [copy.bonus, value.bonusWallets]]
  balance.replaceChildren()
  for (const [caption, wallets] of groups) {
    if (wallets.length === 0) continue
    const row = document.createElement('div')
    const formatted = wallets.map(({currency, balance}) => {
      const amount = Number(balance)
      if (!Number.isFinite(amount)) return currency + ' ' + balance
      const format = new Intl.NumberFormat(zh ? 'zh-CN' : 'en-US', {
        style: 'currency', currency, currencyDisplay: 'narrowSymbol', roundingMode: 'trunc',
      })
      return amount > 0 && amount < .01 ? '<' + format.format(.01) : format.format(balance)
    })
    row.textContent = caption + ' · ' + formatted.join(' / ')
    balance.append(row)
  }
  if (balance.childElementCount === 0) balance.textContent = copy.empty
}

companion?.subscribe(({ animation, expanded, work, balance }) => {
  document.body.dataset.animation = animation
  document.body.toggleAttribute('data-working', work.length > 0)
  get('details').hidden = !expanded
  mascot.setAttribute('aria-expanded', String(expanded))
  if (!expanded) return
  drawBalance(balance)
  const list = get('work')
  list.replaceChildren()
  if (work.length === 0) {
    const row = document.createElement('li')
    row.textContent = copy.idle
    list.append(row)
    return
  }
  for (const { id, title } of work) {
    const row = document.createElement('li')
    const link = document.createElement('a')
    link.className = 'work-link'
    link.href = '?action=session&id=' + encodeURIComponent(id)
    link.textContent = title
    link.title = title
    row.append(link)
    list.append(row)
  }
})
