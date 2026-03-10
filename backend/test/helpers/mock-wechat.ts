/**
 * 微信 API Mock 辅助工具
 * 使用 nock 拦截微信 API 请求
 */
import nock from 'nock';

const WX_API_BASE = 'https://api.weixin.qq.com';

export function mockWxCode2Session(openid: string, unionId?: string) {
  return nock(WX_API_BASE)
    .get('/sns/jscode2session')
    .query(true)
    .reply(200, {
      openid,
      session_key: 'mock_session_key',
      unionid: unionId,
    });
}

export function mockWxCode2SessionError(errcode: number, errmsg: string) {
  return nock(WX_API_BASE)
    .get('/sns/jscode2session')
    .query(true)
    .reply(200, { errcode, errmsg });
}

export function mockWxSubscribeMessage() {
  return nock('https://api.weixin.qq.com')
    .post('/cgi-bin/message/subscribe/send')
    .query(true)
    .reply(200, { errcode: 0, errmsg: 'ok' });
}

export function cleanWxMocks() {
  nock.cleanAll();
}
