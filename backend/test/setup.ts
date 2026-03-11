// BigInt JSON 序列化支持
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};
