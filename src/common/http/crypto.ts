import crypto, { BinaryLike, CipherKey, KeyLike } from 'crypto'

/**
 * @see https://github.com/Binaryify/NeteaseCloudMusicApi/blob/master/util/crypto.js#L1
 */
export const iv = Buffer.from('0102030405060708')
export const presetKey = Buffer.from('0CoJUm6Qyw8W8jud')
export const linuxapiKey = Buffer.from('rFgB&h#%2?^eDg:Q')
export const base62 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
export const publicKey =
  '-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDgtQn2JZ34ZC28NWYpAUd98iZ37BUrX/aKzmFbt7clFSs6sXqHauqKWqdtLkF2KexO40H1YTX8z2lSgBBOAxLsvaklV8k4cBFK9snQXE9/DDaFt6Rr7iVZMldczhC0JNgTz+SHXT6CBHuX3e9SdB1Ua44oncaTWz7OBGLbCiK45wIDAQAB\n-----END PUBLIC KEY-----'
export const eapiKey = 'e82ckenh8dichen8'

export const aesEncrypt = ({
  buffer,
  mode,
  key,
  iv,
}: {
  key: CipherKey
  iv: BinaryLike | null
  buffer: crypto.BinaryLike
  mode: string
}) => {
  const cipher = crypto.createCipheriv('aes-128-' + mode, key, iv)
  return Buffer.concat([cipher.update(buffer), cipher.final()])
}

export const rsaEncrypt = ({ buffer, key }: { key: KeyLike; buffer: Uint8Array }) => {
  return crypto.publicEncrypt(
    { key, padding: crypto.constants.RSA_NO_PADDING },
    Buffer.concat([Buffer.alloc(128 - buffer.length), buffer])
  )
}

export const weapi = (object: Record<any, any>) => {
  const text = JSON.stringify(object)
  const secretKey = crypto.randomBytes(16).map((n) => base62.charAt(n % 62).charCodeAt(0))
  return {
    params: aesEncrypt({
      buffer: Buffer.from(
        aesEncrypt({ buffer: Buffer.from(text), mode: 'cbc', key: presetKey, iv }).toString(
          'base64'
        )
      ),
      mode: 'cbc',
      key: secretKey,
      iv,
    }).toString('base64'),
    encSecKey: rsaEncrypt({ buffer: secretKey.reverse(), key: publicKey }).toString('hex'),
  }
}

export const linuxapi = (object: Record<any, any>) => {
  const text = JSON.stringify(object)
  return {
    eparams: aesEncrypt({
      buffer: Buffer.from(text),
      mode: 'ecb',
      key: linuxapiKey,
      iv: '',
    })
      .toString('hex')
      .toUpperCase(),
  }
}

export const eapi = (url: string, object: Record<any, any> | string) => {
  const text = typeof object === 'object' ? JSON.stringify(object) : object
  const message = `nobody${url}use${text}md5forencrypt`
  const digest = crypto.createHash('md5').update(message).digest('hex')
  const data = `${url}-36cd479b6b5-${text}-36cd479b6b5-${digest}`
  return {
    params: aesEncrypt({ buffer: Buffer.from(data), mode: 'ecb', key: eapiKey, iv: '' })
      .toString('hex')
      .toUpperCase(),
  }
}

export const decrypt = (cipherBuffer: Uint8Array) => {
  const decipher = crypto.createDecipheriv('aes-128-ecb', eapiKey, '')
  return Buffer.concat([decipher.update(cipherBuffer), decipher.final()])
}
