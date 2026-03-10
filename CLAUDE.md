# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 语言规范

**本项目所有文档、注释、提交信息均优先使用中文。**

## 项目概述

**校庆纪念品认购私域微信小程序** —— 面向国内外校友的校庆纪念品在线认购平台。校友通过微信登录并完成身份核验后，可浏览商品、下单、使用微信支付（国内）或 PayPal（海外）完成支付。配套 Web 管理后台负责校友审核、订单管理与数据统计。

当前仓库处于**设计/文档阶段**，尚无实现代码。

## 设计文档

所有设计文档位于 `docs/`，各文档之间必须保持一致：

| 文件 | 内容摘要 |
|------|---------|
| `docs/需求分析.md` | 需求基准文档。REQ-001~REQ-145 共145条需求，4个用户角色，非功能需求。 |
| `docs/接口设计.md` | REST API 定义。小程序端 `/api/v1/`，管理端 `/admin/api/v1/`，JWT 认证，统一响应格式，30+ 错误码。 |
| `docs/概要设计.md` | 系统架构、模块划分、技术选型、28张表 ER 概要、REQ→模块映射。 |
| `docs/详细设计.md` | 28张表完整 DDL、5个核心业务时序、5个关键算法、REQ→实现细节映射。 |
| `docs/测试规范.md` | 116+ 测试用例（TC-XXX）、性能/安全专项测试、REQ→测试用例映射、验收标准。 |

**修改任意文档时**：须同步更新受影响文档中的 REQ 需求对照表，确保 REQ-001~REQ-145 全量覆盖。

## 关键架构决策

- **身份认证**：微信登录（`wx.login` → `code2session`）+ JWT。校友核验采用**人工审核**，校友系统 API **预留接口**（REQ-010，对接前返回 501）。
- **支付通道**：微信支付 JSAPI（国内人民币）+ PayPal Orders API v2（海外），不支持其他支付方式。
- **库存控制**：Redis 原子扣减 + MySQL 乐观锁（`WHERE stock >= quantity`）。订单超时采用 Redis Sorted Set 延迟队列（30 分钟 TTL）。
- **订单号格式**：`XQ{YYYYMMDD}{6位 Redis 自增序号}`
- **汇率策略**：手动设置 > Redis 缓存（1小时 TTL）> 数据库兜底。下单时汇率快照记录于 `orders.exchange_rate`。
- **刻字预览**：服务端图片渲染（Python Pillow 或等效方案）存储至 OSS。

## 计划技术栈（源自概要设计.md）

- **小程序端**：Taro + Vue3 + Pinia，Vant Weapp UI
- **后端**：NestJS（Node.js）、Prisma ORM、MySQL 8.0、Redis 7.x、RabbitMQ
- **基础设施**：Nginx、Docker/K8s、阿里云（SLB + OSS + RDS）
- **第三方服务**：微信开放平台、微信支付、PayPal、快递100、SMTP 邮件

## 需求与测试用例编号规范

需求编号格式 `REQ-XXX`（三位数字补零），模块分配如下：

- REQ-001~010：认证 | REQ-011~015：首页 | REQ-016~025：商品 | REQ-026~030：购物车
- REQ-031~040：订单 | REQ-041~048：支付 | REQ-049~053：物流 | REQ-054~058：售后
- REQ-059~065：定制刻字 | REQ-066~072：评价 | REQ-073~078：消息通知
- REQ-079~085：权限管理 | REQ-086~092：校友管理 | REQ-093~102：商品管理（后台）
- REQ-103~112：订单管理（后台）| REQ-113~120：物流售后 | REQ-121~127：支付管理
- REQ-128~138：数据统计 | REQ-139~145：系统设置

测试用例：`TC-XXX`；性能测试：`TC-PXXX`；安全测试：`TC-SXXX`。
