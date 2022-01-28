import { request } from '@/common/http/request'
import { login, OutputLoginCellphone } from '@/modules/login'

if (process.env.DEV_LEVEL === 'private') {
  describe('login', () => {
    it('should work with the cellphone', async () => {
      const result = await login.cellphone(request, {
        phone: process.env.DEV_PHONE ?? '18188888888',
        password: process.env.DEV_PASSWORD ?? '231231312aseaA',
      })

      expect(result.body.code).toBe(200)
      expect((result.body as OutputLoginCellphone).profile.nickname).toBe('五线谱与二进制')
    })

    // it('should work with email', async () => {

    // })
  })
}
