import crypto from 'crypto'

import type { Request, RequestOptions, ResponseError } from '../common/http/request'

export interface InputLoginCellphone extends Partial<RequestOptions> {
  /**
   * 手机号码
   */
  phone: string
  /**
   * 密码
   */
  password: string
  /**
   *  国家码，用于国外手机号登录，例如美国传入：1
   * @default '86'
   */
  countrycode?: string
  /**
   * md5 加密后的密码, 传入后 password 参数将失效
   */
  md5_password?: string
  /**
   * 验证码, 使用 /captcha/sent 接口传入手机号获取验证码
   * 调用此接口传入验证码, 可使用验证码登录
   * 传入后 password 参数将失效
   */
  captcha?: string
}

export interface OutputLoginCellphone {
  loginType: number
  code: number
  account: Account
  token: string
  profile: Profile
  bindings: Binding[]
  cookie: string
}

export interface Account {
  id: number
  userName: string
  type: number
  status: number
  whitelistAuthority: number
  createTime: number
  salt: string
  tokenVersion: number
  ban: number
  baoyueVersion: number
  donateVersion: number
  vipType: number
  viptypeVersion: number
  anonimousUser: boolean
  uninitialized: boolean
}

export interface Binding {
  userId: number
  url: string
  expired: boolean
  bindingTime: number
  tokenJsonStr: string
  expiresIn: number
  refreshTime: number
  id: number
  type: number
}

export interface Profile {
  backgroundImgIdStr: string
  avatarImgIdStr: string
  userId: number
  followed: boolean
  backgroundUrl: string
  detailDescription: string
  userType: number
  accountStatus: number
  vipType: number
  gender: number
  avatarImgId: number
  nickname: string
  backgroundImgId: number
  birthday: number
  city: number
  avatarUrl: string
  defaultAvatar: boolean
  province: number
  expertTags: null
  experts: Experts
  mutual: boolean
  remarkName: null
  authStatus: number
  djStatus: number
  description: string
  signature: string
  authority: number
  avatarImgId_str: string
  followeds: number
  follows: number
  eventCount: number
  avatarDetail: null
  playlistCount: number
  playlistBeSubscribedCount: number
}

export interface Experts {}

export const login = {
  async email (query: any, request: Request) {
    query.cookie = {
      ...(query.cookie ?? {}),
      os: 'pc',
    }

    const data = {
      username: query.email,
      password:
        query.md5_password || crypto.createHash('md5').update(query.password).digest('hex'),
      rememberLogin: 'true',
    }

    const result = await request({
      method: 'POST',
      url: `https://music.163.com/weapi/login`,
      data,
      options: {
        crypto: 'weapi',
        ua: 'pc',
        cookie: query.cookie,
        proxy: query.proxy,
        realIP: query.realIP,
      },
    })

    if (result.body.code === 200) {
      return {
        status: 200,
        body: {
          ...result.body,
          cookie: result.cookie.join(';'),
        },
        cookie: result.cookie,
      }
    }

    if (result.body.code === 502) {
      return {
        status: 200,
        body: {
          msg: '账号或密码错误',
          code: 502,
          message: '账号或密码错误',
        },
      }
    }

    return {
      status: 200,
      body: result.body,
    }
  },
  async cellphone (request: Request, query: InputLoginCellphone) {
    query.cookie = {
      ...(query.cookie ?? {}),
      os: 'pc',
    }

    const data = {
      phone: query.phone,
      countrycode: query.countrycode ?? '86',
      captcha: query.captcha,
      [query.captcha ? 'captcha' : 'password']: query.captcha
        ? query.captcha
        : query.md5_password ??
        crypto.createHash('md5').update(query.password).digest('hex'),
      rememberLogin: 'true',
    }

    const result = await request<OutputLoginCellphone | ResponseError>({
      method: 'POST',
      url: `https://music.163.com/weapi/login/cellphone`,
      data: data,
      options: {
        crypto: 'weapi',
        ua: 'pc',
        cookie: query.cookie,
        proxy: query.proxy,
        realIP: query.realIP,
      },
    })

    if (result.body.code === 200) {
      return {
        status: 200,
        body: {
          ...result.body,
          cookie: result.cookie.join(';'),
        },
        cookie: result.cookie,
      }
    }

    if (result.body.code === 502) {
      return {
        status: 200,
        body: {
          msg: '账号或密码错误',
          code: 502,
          message: '账号或密码错误',
        },
      }
    }

    return {
      status: 200,
      body: result.body,
    }
  },
}
