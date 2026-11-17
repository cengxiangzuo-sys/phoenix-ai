/** Offline, opaque-origin scene; employee data enters through validated messages, never HTML. */
import three from './three-source.ts'
import scene from './scene-source.ts'

const style = `
html,body,#stage{width:100%;height:100%;margin:0;overflow:hidden}body{font:13px -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;color:#f6e5d2;background:radial-gradient(ellipse at 50% 50%,#423025,#1c1816 72%)}
#stage{position:relative}canvas{width:100%;height:100%;display:block}.employee,.room,.px-zone{position:absolute;transform:translate(-50%,-100%);border:1px solid #84664c;border-radius:7px;background:#2b241feF;color:#f7e7d7;font:inherit;text-align:center;white-space:nowrap;box-shadow:0 3px 12px #0004}.employee{padding:5px 9px;cursor:pointer;max-width:152px;z-index:3}.employee span,.employee small{display:block;overflow:hidden;text-overflow:ellipsis;max-width:132px}.employee span{font-size:13px;font-weight:500}.employee small{font-size:11px;color:#dfbd96;line-height:1.5}.employee[data-selected=true]{border-color:#ffb469;box-shadow:0 0 0 2px #e9913a55}.employee[data-status=working] span:before{content:'● ';color:#ffb25b}.employee[data-status=unknown]{opacity:.65}.room{padding:5px 10px;font-size:12px;z-index:2;background:#3a2d23f0}.px-zone{padding:3px 7px;font-size:10px;color:#bdb3a6;background:#211d19bf;border:0}.room:is(button){cursor:pointer;border-color:#bb834c}button:focus-visible{outline:2px solid #ffd499;outline-offset:3px}.loading{position:absolute;inset:45% 10% auto;text-align:center;background:#211d19;padding:16px;border-radius:10px;z-index:5}[hidden]{display:none!important}@media(max-width:600px){.employee{padding:3px 5px;max-width:100px}.employee span{font-size:11px}.employee small{font-size:10px}.room{padding:3px 5px;font-size:10px}}
`
const script = (value: string) => `<script>${value.replace(/<\/script/gi, '<\\/script')}</script>`

/** Sandboxed frame document with no network access or browser storage. */
export const officeDocument = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'"><style>${style}</style><body><div id="stage"><canvas aria-label="办公室三维场景"></canvas><div class="loading">正在载入办公室…</div></div>${script(three)}${script(scene)}</body></html>`
