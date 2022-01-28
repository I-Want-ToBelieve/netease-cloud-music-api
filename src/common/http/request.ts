/* eslint-disable  complexity */
import http, { IncomingHttpHeaders } from 'http'
import https from 'https'

import is from '@sindresorhus/is'
import axios, {
  AxiosRequestConfig,
  AxiosRequestHeaders,
  AxiosResponse,
  Method,
} from 'axios'
import createPacProxyAgent from 'pac-proxy-agent'
import qs from 'qs'
import tunnel from 'tunnel'

import * as encrypt from './crypto'
import getRandomUserAgent, { UserAgentKeys } from './user_agent'

export interface ResponseError {
  msg: string
  code: number
  message: string
}
export interface Cookie {
  /**
   * 系统版本
   */
  osver?: string
  /**
   * encrypt.base64.encode(imei + '\t02:00:00:00:00:00\t5106025eb79a5247\t70ffbaac7')
   */
  deviceId?: string
  /**
   * app版本
   */
  appver?: string
  /**
   * 版本号
   */
  versioncode?: string
  /**
   * 设备model
   */
  mobilename?: string
  buildver?: string
  /**
   * 设备分辨率
   */
  resolution?: string
  os?: string
  channel?: string
  __csrf?: string
  [key: string]: any
}

export interface RequestOptions {
  ua?: UserAgentKeys
  realIP?: string | string[]
  cookie?: Cookie
  token?: string
  crypto: 'weapi' | 'linuxapi' | 'eapi'
  url?: string
  proxy?: string
}

export type Request = ReturnType<typeof createRequest>
export interface Answer<T extends Record<any, any>> {
  status: number
  body: T
  cookie: string[]
}
export interface CreateRequestArgs {
  method: Method
  url: string
  data: any
  options: RequestOptions
}
/**
 * @see https://github.com/Binaryify/NeteaseCloudMusicApi/blob/master/util/request.js#L45
 */
export const createRequest = () => async <D = Record<any, any>>({
  method,
  url,
  data,
  options,
}: CreateRequestArgs) => {
  return new Promise<Answer<D>>((resolve, reject) => {
    const { cookie, token, ua, proxy, crypto } = options
    /**
     * @see https://datatracker.ietf.org/doc/html/rfc7540#section-8.1.2
     * @description Just as in HTTP/1.x, header field names are strings of ASCII
     * characters that are compared in a case-insensitive fashion.  However,
     * header field names MUST be converted to lowercase prior to their
     * encoding in HTTP/2.  A request or response containing uppercase
     * header field names MUST be treated as malformed (Section 8.1.2.6).
     */
    const headers: IncomingHttpHeaders = {
      'user-agent': getRandomUserAgent(ua),
    }

    if (method === 'post') {
      headers['content-type'] = 'application/x-www-form-urlencoded'
    }
    if (url.includes('music.163.com')) {
      headers.referer = 'https://music.163.com'
    }
    // headers['X-Real-IP'] = '118.88.88.88'
    if (options.realIP) {
      headers['x-real-ip'] = options.realIP
    }

    if (!is.string(cookie) && !is.nullOrUndefined(cookie)) {
      headers.cookie = Object.keys(cookie)
        .map((key) => encodeURIComponent(key) + '=' + encodeURIComponent(cookie[key]))
        .join('; ')
    } else if (options.cookie) {
      headers.cookie = cookie
    }
    if (!headers.cookie) {
      headers.cookie = token ?? ''
    }

    // eslint-disable-next-line default-case
    switch (crypto) {
      case 'weapi': {
        const csrfToken = /_csrf=([^$();|]+)/.exec(headers.cookie ?? '')
        data.csrf_token = csrfToken ? csrfToken[1] : ''
        data = encrypt.weapi(data)
        url = url.replace(/\w*api/, 'weapi')

        break
      }
      case 'linuxapi': {
        data = encrypt.linuxapi({
          method: method,
          url: url.replace(/\w*api/, 'api'),
          params: data,
        })
        headers['user-agent'] =
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36'
        url = 'https://music.163.com/api/linux/forward'

        break
      }
      case 'eapi': {
        // eslint-disable-next-line @typescript-eslint/no-shadow
        const cookie = options.cookie ?? {}
        const csrfToken = cookie.__csrf ?? ''
        const header: Cookie = {
          osver: cookie.osver,
          deviceId: cookie.deviceId,
          appver: cookie.appver ?? '8.0.0',
          versioncode: cookie.versioncode ?? '140',
          mobilename: cookie.mobilename,
          buildver: cookie.buildver ?? Date.now().toString().substr(0, 10),
          resolution: cookie.resolution ?? '1920x1080',
          __csrf: csrfToken,
          os: cookie.os ?? 'android',
          channel: cookie.channel,
          requestId: `${Date.now()}_${Math.floor(Math.random() * 1000)
            .toString()
            .padStart(4, '0')}`,
        }

        if (cookie.MUSIC_U) header.MUSIC_U = cookie.MUSIC_U
        if (cookie.MUSIC_A) header.MUSIC_A = cookie.MUSIC_A

        headers.cookie = Object.keys(header)
          .map((key) => encodeURIComponent(key) + '=' + encodeURIComponent(header[key]))
          .join('; ')
        data.header = header
        data = encrypt.eapi(options.url ?? '', data)
        url = url.replace(/\w*api/, 'eapi')

        break
      }
      // No default
    }

    const axiosOptions: AxiosRequestConfig & Record<any, any> = {
      method: method,
      url: url,
      headers: (headers as unknown) as AxiosRequestHeaders,
      data: qs.stringify(data),
      httpAgent: new http.Agent({ keepAlive: true }),
      httpsAgent: new https.Agent({ keepAlive: true }),
    }
    const answer: Answer<D> = { status: 500, body: ({} as unknown) as D, cookie: [] }

    if (crypto === 'eapi') axiosOptions.encoding = null

    if (proxy) {
      if (proxy.includes('pac')) {
        axiosOptions.httpAgent = createPacProxyAgent(proxy)
        axiosOptions.httpsAgent = createPacProxyAgent(proxy)
      } else {
        const purl = (qs.parse(proxy) as unknown) as {
          hostname: string
          port?: number
        }
        if (purl.hostname) {
          const agent = tunnel.httpsOverHttp({
            proxy: {
              host: purl.hostname,
              port: purl.port || 80,
            },
          })
          axiosOptions.httpsAgent = agent
          axiosOptions.httpAgent = agent
          axiosOptions.proxy = false
        } else {
          console.error('代理配置无效,不使用代理')
        }
      }
    } else {
      axiosOptions.proxy = false
    }

    if (crypto === 'eapi') {
      axiosOptions.responseType = 'arraybuffer'
    }

    axios
      .request<D, AxiosResponse<D>, D>(axiosOptions)
      .then((response) => {
        const body = response.data

        answer.cookie = (response.headers['set-cookie'] || []).map((x) =>
          x.replace(/\s*Domain=[^$();|]+;*/, '')
        )

        try {
          if (crypto === 'eapi') {
            answer.body = JSON.parse(
              encrypt.decrypt((body as unknown) as Uint8Array).toString()
            )
          } else {
            answer.body = body
          }

          answer.status = (answer.body as any).code ?? response.status

          if (
            [201, 302, 400, 502, 800, 801, 802, 803].includes((answer.body as any).code)
          ) {
            // 特殊状态码
            answer.status = 200
          }
        } catch {
          // console.log(e)
          try {
            answer.body = JSON.parse(((body as unknown) as string).toString())
          } catch {
            // console.log(err)
            // can't decrypt and can't parse directly
            answer.body = (body as unknown) as D
          }

          answer.status = response.status
        }

        answer.status = answer.status > 100 && answer.status < 600 ? answer.status : 400

        if (answer.status === 200) {
          resolve(answer)
        } else {
          reject(answer)
        }
      })
      .catch((err) => {
        answer.status = 502
        answer.body = { code: 502, msg: err } as any

        reject(answer)
      })
  })
}

export const request = createRequest()
